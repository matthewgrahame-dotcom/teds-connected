// Batch version of the manual CSV-filling process seed-forms.ts expects --
// points Claude at a whole folder of PDFs (the ~60 Op Central exports) and
// has it read each one's fields, instead of a human doing it by hand for
// every form. Deliberately does NOT write to the database or generate SQL
// directly (an earlier draft of this did, straight to raw INSERTs with a
// pdf_path column that doesn't even exist in the real schema) -- AI-guessed
// field types/labels are a good first draft, not something that should
// reach production forms unreviewed. This writes a CSV in the exact same
// shape forms-seed.csv already uses, so the existing, already-tested
// seed-forms.ts stays the one real path into the forms table; this script's
// only job is turning a stack of PDFs into a first-draft CSV, faster than
// typing each one out by hand.
//
// Usage:
//   ANTHROPIC_API_KEY=... pnpm --filter @workspace/scripts extract-forms -- ./path/to/pdfs
//   (defaults to ./pdfs relative to wherever you run the command from)
//
// Requires DATABASE_URL too -- used read-only here, to check which forms
// are already imported (see the two-stage duplicate check below), never to
// write.
//
// Output: scripts/src/data/forms-seed-extracted.csv -- NOT forms-seed.csv.
// Review this file, fix anything wrong, and merge the rows you're happy
// with into forms-seed.csv yourself before running seed-forms. That
// deliberate manual step is the actual review point -- this script doesn't
// auto-merge, so nothing AI-guessed reaches the real import file without
// someone looking at it first.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repo root explicitly -- when this script runs via
// `pnpm --filter @workspace/scripts ...`, the working directory is the
// scripts package, not the repo root, so the default dotenv/config
// behaviour (look in cwd) misses the real .env entirely.
config({ path: path.resolve(__dirname, "../../.env") });

// @workspace/db must be imported dynamically, AFTER config() runs above --
// static imports in ES modules are hoisted and execute before any other
// code in the file, so a static import here would construct the db client
// (and throw on missing DATABASE_URL) before config() ever got a chance to
// load the .env file, regardless of where config() appears in the source.
const { db, formsTable, formFieldSchema } = await import("@workspace/db");

const pdfDir = process.argv.find((arg, i) => i >= 2 && arg !== "--") || "./pdfs";
const outFile = path.join(__dirname, "data", "forms-seed-extracted.csv");

// Same slugify as seed-forms.ts (kept in sync by hand, not imported --
// these are two different scripts run at two different times, no shared
// runtime state between them worth coupling over one small function).
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[*]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Many of the source PDFs print their titles in ALL CAPS. Rather than rely
// on the model to re-case titles consistently (unreliable, one more thing
// it can get subtly wrong across 60 PDFs), we normalize deterministically
// here in code. Small connector words stay lowercase unless they're the
// first word, matching normal title-case conventions. Apostrophes are
// preserved and correctly lowercased on the far side (e.g. "TED'S" -> "Ted's")
// because slicing+lowercasing the rest of the word naturally handles that.
const TITLE_CASE_MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "or", "per", "the", "to", "with",
]);
function toTitleCase(title: string): string {
  const words = title.trim().split(/\s+/);
  return words
    .map((word, i) => {
      // Preserve deliberate prefixes/markers like "*WEB" as-is rather than
      // re-casing them into something that changes their meaning.
      if (/^\*/.test(word)) return word;
      const lower = word.toLowerCase();
      if (i !== 0 && i !== words.length - 1 && TITLE_CASE_MINOR_WORDS.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function csvField(value: string): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const EXTRACTION_PROMPT = `You are helping migrate paper/PDF forms into a new digital forms system.

I've attached one form as a PDF. Extract:
1. The form's exact title, as printed on the form (including any prefix like "*WEB ONLY" -- don't drop or rephrase meaningful prefixes). Don't worry about matching the printed capitalization exactly -- that gets normalized separately afterward.
2. Every field a person filling out this form needs to provide.

SKIP these fields entirely -- do not include them in your output at all, even though they commonly appear on these forms:
- "Submitted By", "Submitted On Date", "Submitter Location", "Address" (or close variants of these labels) -- these are auto-populated by the system from the logged-in user's session, never manually typed in, and including them would create redundant junk fields on every single form.

Rules for the remaining fields:
- Ignore headers, footers, page numbers, logos, and any internal reference/version codes, in addition to the auto-populated fields listed above.
- Give each field a camelCase "key" derived from its label (e.g. "Magento Order Number" -> "magentoOrderNumber").
- Pick "type" from EXACTLY: text, textarea, number, currency, radio, select, file, signature, date.
  - CHECK FOR "signature" FIRST, before considering "text" or "file": if a field's purpose is for the person to sign their name to confirm, declare, or authorize something, it is ALWAYS "signature" -- regardless of how it's printed on the page (a blank line, a box, anything). This includes any field labelled "Sign", "Signature", "Signed", "Authorised By (Signature)", or similar. Do not default to "text" just because the printed field looks like a simple blank line -- check what the field is FOR, not just how it looks.
  - "currency" for any dollar amount field.
  - "date" for any field asking for a calendar date (e.g. "Date Traded In", "Date of Birth") -- even if the printed form just has a blank line, if what's being asked for is a date, use "date" not "text".
  - "radio" for a small fixed set of mutually-exclusive choices actually printed on the form (checkboxes where only one applies).
  - "select" for a longer dropdown-style list of choices.
  - "file" for a non-signature attachment/upload field (e.g. "attach a photo", "attach report").
  - "textarea" for anything inviting more than one line of free text (notes, descriptions).
  - "text" as the default for a single-line answer, or if you're genuinely unsure.
  - "number" only for a plain numeric field that ISN'T a dollar amount (e.g. a quantity).
- Set "required" to true if EITHER of these is true:
  (a) the form explicitly marks it required (an asterisk, the word "required", etc.), OR
  (b) the field is clearly essential to the form's core purpose based on context -- for example, a dollar amount on a refund/expense form, a signature on a declaration, or a checklist item on a store compliance report are all normally required even without an explicit marker.
  Only set "required" to false for fields that are genuinely optional in context (e.g. "Additional Notes", "Comments", anything explicitly marked optional).
- Use "options" only for radio/select -- list EVERY choice exactly as printed, in the same order they appear on the form, separated by semicolons (e.g. "Yes;No;Maybe"). Do not summarise, merge, or drop any option, even if some seem redundant or overlapping with each other -- completeness matters more than tidiness here.
- Use "section" to group fields that are visually grouped under one heading on the form (e.g. "Expense Claim 1") -- leave it out for fields with no clear section.
- If a field's purpose is genuinely unclear, still include it with your best guess rather than omitting it -- it's easier for a human reviewing the CSV afterward to delete or fix a wrong guess than to notice a field that got silently dropped.`;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY isn't set.");
    process.exit(1);
  }
  if (!fs.existsSync(pdfDir)) {
    console.error(`No folder at ${pdfDir}. Pass the right path: pnpm --filter @workspace/scripts extract-forms -- ./path/to/pdfs`);
    process.exit(1);
  }

  const files = fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (!files.length) {
    console.error(`No PDFs found in ${pdfDir}.`);
    process.exit(1);
  }

  // Read-only check against what's already actually in the database --
  // this is the authoritative half of duplicate detection. The cheap
  // filename-based check below (before spending an API call) is a
  // best-effort pre-filter on top of this, not a replacement for it.
  const existingForms = await db.select({ slug: formsTable.slug }).from(formsTable);
  const existingSlugs = new Set(existingForms.map((f) => f.slug));
  console.log(`${existingSlugs.size} form(s) already in the database. Found ${files.length} PDF(s) in ${pdfDir}.\n`);

  const rows: string[] = ["form_title,form_slug,field_key,field_label,field_type,required,options,help_text,section"];
  let skippedByFilename = 0;
  let skippedAfterExtraction = 0;
  const failed: { file: string; error: string }[] = [];
  let extracted = 0;

  for (const file of files) {
    // Cheap pre-filter -- catches the common case (filename resembles the
    // real title closely enough that their slugs match) WITHOUT spending an
    // API call reading a PDF we're just going to throw away anyway.
    const filenameGuessSlug = slugify(path.basename(file, ".pdf"));
    if (existingSlugs.has(filenameGuessSlug)) {
      console.log(`Skipping ${file} -- filename suggests it's already imported (slug "${filenameGuessSlug}")`);
      skippedByFilename++;
      continue;
    }

    console.log(`Reading: ${file}`);
    try {
      const pdfBuffer = fs.readFileSync(path.join(pdfDir, file));
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-5-20250929"),
        schema: z.object({ title: z.string(), fields: z.array(formFieldSchema) }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              { type: "file", data: pdfBuffer, mediaType: "application/pdf" },
            ],
          },
        ],
      });

      const displayTitle = toTitleCase(object.title);

      // Authoritative check, now that we have the REAL extracted title
      // rather than a filename guess. Slugify is case-insensitive anyway,
      // so title-casing the display title doesn't affect duplicate detection.
      const slug = slugify(object.title);
      if (existingSlugs.has(slug)) {
        console.log(`  -> "${displayTitle}" already imported (slug "${slug}") -- skipped`);
        skippedAfterExtraction++;
        continue;
      }
      if (!object.fields.length) {
        console.log(`  -> No fields found for "${displayTitle}" -- flagged for manual review, not added to the CSV`);
        failed.push({ file, error: "No fields extracted" });
        continue;
      }

      for (const f of object.fields) {
        rows.push(
          [
            csvField(displayTitle),
            csvField(slug),
            csvField(f.key),
            csvField(f.label),
            csvField(f.type),
            f.required ? "TRUE" : "FALSE",
            csvField((f.options ?? []).join(";")),
            csvField(f.helpText ?? ""),
            csvField(f.section ?? ""),
          ].join(","),
        );
      }
      existingSlugs.add(slug); // guards against two PDFs in this run extracting to the same title
      extracted++;
      console.log(`  -> "${displayTitle}" -- ${object.fields.length} field(s)`);
    } catch (err: any) {
      console.error(`  -> Failed: ${err.message}`);
      failed.push({ file, error: err.message });
    }

    // Courtesy delay between API calls, same as the original draft.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  fs.writeFileSync(outFile, rows.join("\n") + "\n");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${extracted} form(s) extracted -> ${outFile}`);
  console.log(`${skippedByFilename} skipped by filename match, ${skippedAfterExtraction} skipped after reading (both already imported)`);
  if (failed.length) {
    console.log(`${failed.length} failed or produced nothing -- check these by hand:`);
    for (const f of failed) console.log(`  - ${f.file}: ${f.error}`);
  }
  console.log(`\nNEXT STEP: open ${outFile}, review every row carefully (this is AI-guessed, not authoritative),`);
  console.log(`fix anything wrong, then copy the rows you're happy with into forms-seed.csv before running seed-forms.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});