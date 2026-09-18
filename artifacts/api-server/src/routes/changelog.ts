import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, changelogEntriesTable } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";
import { requireConnectedTier } from "../lib/connectedTiers";

const router: IRouter = Router();

router.get("/changelog", requireSession, async (_req, res) => {
  const entries = await db.select().from(changelogEntriesTable).orderBy(desc(changelogEntriesTable.createdAt));
  res.json(entries);
});

router.post("/changelog", requireConnectedTier('admin'), async (req, res) => {
  const { title, body } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const postedBy = req.sessionPayload?.name ?? "Unknown";
  const [entry] = await db
    .insert(changelogEntriesTable)
    .values({ title: title.trim(), body: body?.trim() || null, postedBy })
    .returning();
  res.json({ ok: true, entry });
});

router.delete("/changelog/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid entry id" });
    return;
  }
  await db.delete(changelogEntriesTable).where(eq(changelogEntriesTable.id, id));
  res.json({ ok: true });
});

export default router;
