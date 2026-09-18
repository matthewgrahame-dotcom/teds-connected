import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, jobPostingsTable } from "@workspace/db";
import { requireConnectedTier } from "../lib/connectedTiers";

const router: IRouter = Router();

const SCALAR_FIELDS = ["title", "location", "description", "formSlug"] as const;

// -- Staff-facing (People > Recruiting) ---------------------------------

router.get("/job-postings", async (_req, res) => {
  const postings = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.status, "open")).orderBy(asc(jobPostingsTable.sortOrder));
  res.json(postings);
});

// -- Admin ----------------------------------------------------------------

router.get("/job-postings/admin", requireConnectedTier('admin'), async (_req, res) => {
  const postings = await db.select().from(jobPostingsTable).orderBy(desc(jobPostingsTable.updatedAt));
  res.json(postings);
});

router.get("/job-postings/admin/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid posting id" });
    return;
  }
  const [posting] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!posting) {
    res.status(404).json({ error: "Posting not found" });
    return;
  }
  res.json(posting);
});

router.post("/job-postings", requireConnectedTier('admin'), async (req, res) => {
  const { title, location, description, status, formSlug } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [{ maxSortOrder } = { maxSortOrder: null }] = await db
    .select({ maxSortOrder: jobPostingsTable.sortOrder })
    .from(jobPostingsTable)
    .orderBy(desc(jobPostingsTable.sortOrder))
    .limit(1);

  const [posting] = await db
    .insert(jobPostingsTable)
    .values({
      title: title.trim(),
      location: typeof location === "string" ? location.trim() || null : null,
      description: typeof description === "string" ? description : null,
      status: typeof status === "string" && ["draft", "open", "closed"].includes(status) ? status : "draft",
      formSlug: typeof formSlug === "string" ? formSlug.trim() || null : null,
      sortOrder: (maxSortOrder ?? -1) + 1,
    })
    .returning();

  res.json({ ok: true, posting });
});

router.patch("/job-postings/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid posting id" });
    return;
  }

  const updates: Partial<typeof jobPostingsTable.$inferInsert> = {};
  for (const field of SCALAR_FIELDS) {
    const raw = req.body?.[field];
    if (typeof raw === "string") (updates as Record<string, unknown>)[field] = raw.trim() || null;
  }
  if (typeof req.body?.status === "string" && ["draft", "open", "closed"].includes(req.body.status)) {
    updates.status = req.body.status;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [posting] = await db.update(jobPostingsTable).set(updates).where(eq(jobPostingsTable.id, id)).returning();
  if (!posting) {
    res.status(404).json({ error: "Posting not found" });
    return;
  }
  res.json({ ok: true, posting });
});

router.delete("/job-postings/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid posting id" });
    return;
  }
  await db.delete(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  res.json({ ok: true });
});

export default router;
