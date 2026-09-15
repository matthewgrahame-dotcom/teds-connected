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
import "dotenv/config";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { db, formsTable, formFieldSchema } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfDir = process.argv[2] || "./pdfs";
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

function csvField(value: string): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const EXTRACTION_PROMPT = `You are helping migrate paper/PDF forms into a new digital forms system.

I've attached one form as a PDF. Extract:
1. The form's exact title, EXACTLY as printed on the form (including any prefix like "*WEB ONLY" -- don't clean it up or rephrase it).
2. Every field a person filling out this form needs to provide.

Rules for fields:
- Ignore headers, footers, page numbers, logos, and any internal reference/version codes.
- Give each field a camelCase "key" derived from its label (e.g. "Magento Order Number" -> "magentoOrderNumber").
- Pick "type" from EXACTLY: text, textarea, number, currency, radio, select, file, signature.
  - "currency" for any dollar amount field.
  - "radio" for a small fixed set of mutually-exclusive choices actually printed on the form (checkboxes where only one applies).
  - "select" for a longer dropdown-style list of choices.
  - "signature" for a field where the person needs to physically or digitally sign their name.
  - "file" for a non-signature attachment/upload field (e.g. "attach a photo").
  - "textarea" for anything inviting more than one line of free text (notes, descriptions).
  - "text" as the default for a single-line answer, or if you're genuinely unsure.
  - "number" only for a plain numeric field that ISN'T a dollar amount (e.g. a quantity).
- Set "required" true only if the form itself marks the field as required (an asterisk, "required", etc.) -- don't guess.
- Use "options" only for radio/select, listing the exact choices as printed.
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

      // Authoritative check, now that we have the REAL extracted title
      // rather than a filename guess.
      const slug = slugify(object.title);
      if (existingSlugs.has(slug)) {
        console.log(`  -> "${object.title}" already imported (slug "${slug}") -- skipped`);
        skippedAfterExtraction++;
        continue;
      }
      if (!object.fields.length) {
        console.log(`  -> No fields found for "${object.title}" -- flagged for manual review, not added to the CSV`);
        failed.push({ file, error: "No fields extracted" });
        continue;
      }

      for (const f of object.fields) {
        rows.push(
          [
            csvField(object.title),
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
      console.log(`  -> "${object.title}" -- ${object.fields.length} field(s)`);
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
