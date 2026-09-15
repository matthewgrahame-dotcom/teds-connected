// Imports form definitions recreated by hand from Op Central (the old
// teds.opcentral.com.au portal -- a real commercial platform, not something
// exportable as a file; someone with admin access there reads each form's
// field list off its edit screen and records it here) into the new `forms`
// table.
//
// Usage:  pnpm --filter @workspace/scripts seed-forms
// Requires DATABASE_URL to be set (same as any other db-touching script).
//
// Input: scripts/src/data/forms-seed.csv -- copy forms-seed-template.csv in
// the same folder to get started; it has one filled-in example row group
// showing the format. ONE ROW PER FIELD, not one row per form -- multiple
// rows sharing the same form_title (or form_slug, if you'd rather set that
// explicitly) belong to the same form, and stay in the ORDER they appear in
// the file, since field order is exactly the order the form will render in.
//
// Columns:
//   form_title   Exact live title, e.g. "*WEB ONLY Partial Refund Request"
//   form_slug    Optional -- auto-generated (kebab-case) from form_title if left blank
//   field_key    Optional -- auto-generated (camelCase) from field_label if left blank.
//                Only worth setting by hand if you specifically need it to match
//                something else downstream; submissions are new going forward, so
//                there's no legacy key it needs to line up with.
//   field_label  Display label shown on the form
//   field_type   One of: text, textarea, number, currency, radio, select, file
//   required     TRUE/FALSE (also accepts yes/no, 1/0)
//   options      Only for radio/select -- semicolon-separated, e.g. "Yes;No;Maybe"
//   help_text    Optional small print under the field
//   section      Optional -- a run of fields sharing the same section renders as one
//                visual block (see formFieldSchema's comment in lib/db/src/schema/forms.ts)
//
// Safe to re-run: uses ON CONFLICT (slug) DO NOTHING, so a form already
// imported won't be duplicated or overwritten -- to fix a mistake in an
// already-imported form, edit it directly in Connected's Forms admin page
// instead of re-running this (a corrected CSV row won't touch existing rows).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, formsTable, type FormField } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_TYPES = new Set(["text", "textarea", "number", "currency", "radio", "select", "file"]);

// Minimal RFC4180-ish CSV parser -- handles quoted fields (with embedded
// commas and doubled "" for an escaped quote), which a plain split(",")
// would break on the moment a label or help_text itself contains a comma.
// No external dependency added for this -- scripts/package.json has none
// today beyond @workspace/db, and this format is simple/controlled enough
// (it's a template WE define, not an arbitrary external file) not to need
// a real CSV library.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[*]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function camelCase(label: string): string {
  const words = label.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/);
  return words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))).join("");
}

function parseBool(v: string): boolean {
  return ["true", "yes", "1"].includes(v.trim().toLowerCase());
}

async function main() {
  const dataPath = path.join(__dirname, "data", "forms-seed.csv");
  if (!existsSync(dataPath)) {
    console.error(`No file at ${dataPath}.`);
    console.error(`Copy forms-seed-template.csv to forms-seed.csv in the same folder and fill it in first.`);
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(dataPath, "utf-8"));
  const [header, ...dataRows] = rows;
  const col = (name: string) => header.indexOf(name);
  const idx = {
    title: col("form_title"),
    slug: col("form_slug"),
    key: col("field_key"),
    label: col("field_label"),
    type: col("field_type"),
    required: col("required"),
    options: col("options"),
    help: col("help_text"),
    section: col("section"),
  };
  const missingCols = Object.entries(idx).filter(([, i]) => i === -1);
  if (missingCols.length) {
    console.error(`forms-seed.csv is missing column(s): ${missingCols.map(([name]) => name).join(", ")}`);
    process.exit(1);
  }

  // Group rows into forms, preserving both form order and field order --
  // a Map iterates insertion order, which is exactly what's needed here.
  const forms = new Map<string, { title: string; slug: string; fields: FormField[] }>();
  let hadError = false;

  dataRows.forEach((row, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexing -- matches what a spreadsheet shows
    const title = row[idx.title]?.trim();
    if (!title) {
      console.error(`Row ${rowNum}: missing form_title -- skipped.`);
      hadError = true;
      return;
    }
    const slug = row[idx.slug]?.trim() || slugify(title);
    const label = row[idx.label]?.trim();
    if (!label) {
      console.error(`Row ${rowNum} ("${title}"): missing field_label -- skipped.`);
      hadError = true;
      return;
    }
    const type = row[idx.type]?.trim();
    if (!VALID_TYPES.has(type)) {
      console.error(`Row ${rowNum} ("${title}" / "${label}"): field_type "${type}" isn't one of ${[...VALID_TYPES].join(", ")} -- skipped.`);
      hadError = true;
      return;
    }
    const key = row[idx.key]?.trim() || camelCase(label);
    const options = row[idx.options]?.trim();
    const helpText = row[idx.help]?.trim();
    const section = row[idx.section]?.trim();

    const field: FormField = {
      key,
      label,
      type: type as FormField["type"],
      required: parseBool(row[idx.required] ?? ""),
      ...(options ? { options: options.split(";").map((o) => o.trim()).filter(Boolean) } : {}),
      ...(helpText ? { helpText } : {}),
      ...(section ? { section } : {}),
    };

    if (!forms.has(slug)) forms.set(slug, { title, slug, fields: [] });
    forms.get(slug)!.fields.push(field);
  });

  if (hadError) {
    console.error("\nFix the row(s) above and re-run -- nothing has been written to the database yet.");
    process.exit(1);
  }

  const toInsert = [...forms.values()];
  console.log(`Parsed ${toInsert.length} form(s) from ${dataRows.length} field row(s):`);
  for (const f of toInsert) console.log(`  - "${f.title}" (/${f.slug}) -- ${f.fields.length} field(s)`);

  const result = await db
    .insert(formsTable)
    .values(toInsert.map((f) => ({ title: f.title, slug: f.slug, fields: f.fields })))
    .onConflictDoNothing({ target: formsTable.slug })
    .returning({ id: formsTable.id, slug: formsTable.slug });

  console.log(`\nInserted ${result.length} new form(s). ${toInsert.length - result.length} already existed (skipped, slug already in use).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
