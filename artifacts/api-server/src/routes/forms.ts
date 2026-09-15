import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, formsTable, formSubmissionsTable, formCategoriesTable, type FormField } from "@workspace/db";
import { requireFullLevel } from "../lib/sessionAuth";

const router: IRouter = Router();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

router.get("/forms/categories", async (_req, res) => {
  const categories = await db.select().from(formCategoriesTable).orderBy(asc(formCategoriesTable.sortOrder));
  res.json(categories);
});

router.get("/forms", async (_req, res) => {
  const [forms, categories] = await Promise.all([
    db.select().from(formsTable).where(eq(formsTable.archived, false)),
    db.select().from(formCategoriesTable),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  res.json(forms.map((f) => ({ ...f, categoryName: f.categoryId ? (categoryById.get(f.categoryId)?.name ?? null) : null })));
});

router.get("/forms/:slug", async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, req.params.slug));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  res.json(form);
});

router.post("/forms/:slug/submit", async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, req.params.slug));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const { submittedBy, submitterLocation, data } = req.body ?? {};
  if (typeof submittedBy !== "string" || !submittedBy.trim() || typeof data !== "object" || data === null) {
    res.status(400).json({ error: "submittedBy and data are required" });
    return;
  }

  const missing = form.fields.filter((f) => f.required && !String(data[f.key] ?? "").trim()).map((f) => f.label);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });
    return;
  }

  const [submission] = await db
    .insert(formSubmissionsTable)
    .values({ formId: form.id, submittedBy: submittedBy.trim(), submitterLocation: submitterLocation ?? null, data })
    .returning();

  res.json({ ok: true, submission });
});

router.get("/forms/:slug/submissions", async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, req.params.slug));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  const submissions = await db.select().from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, form.id));
  res.json(submissions);
});

router.post("/forms", requireFullLevel, async (req, res) => {
  const { title, fields } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }

  const validTypes = new Set(["text", "textarea", "number", "currency", "radio", "select", "file"]);
  const cleanFields: FormField[] = fields.map((f: Partial<FormField> & { label?: string }, i: number) => {
    const label = typeof f?.label === "string" && f.label.trim() ? f.label.trim() : `Field ${i + 1}`;
    return {
      key: typeof f?.key === "string" && f.key.trim() ? f.key.trim() : slugify(label).replace(/-/g, "_"),
      label,
      type: validTypes.has(f?.type as string) ? (f!.type as FormField["type"]) : "text",
      required: Boolean(f?.required),
      options: Array.isArray(f?.options) ? f.options.map(String) : undefined,
      helpText: typeof f?.helpText === "string" ? f.helpText : undefined,
      section: typeof f?.section === "string" ? f.section : undefined,
    };
  });

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let attempt = 1;
  // Small table, plain loop is fine -- avoids a fancier "insert and catch
  // the unique violation" dance for what's a rare collision case.
  while ((await db.select({ id: formsTable.id }).from(formsTable).where(eq(formsTable.slug, slug))).length > 0) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const [form] = await db.insert(formsTable).values({ title: title.trim(), slug, fields: cleanFields }).returning();
  res.json({ ok: true, form });
});

router.patch("/forms/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const { categoryId, title } = req.body ?? {};
  const updates: Partial<typeof formsTable.$inferInsert> = {};
  if (categoryId !== undefined) updates.categoryId = categoryId === null ? null : Number(categoryId);
  if (typeof title === "string" && title.trim()) updates.title = title.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [form] = await db.update(formsTable).set(updates).where(eq(formsTable.id, id)).returning();
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  res.json({ ok: true, form });
});

export default router;
