import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, formsTable, formSubmissionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/forms", async (_req, res) => {
  const forms = await db.select().from(formsTable).where(eq(formsTable.archived, false));
  res.json(forms);
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

export default router;
