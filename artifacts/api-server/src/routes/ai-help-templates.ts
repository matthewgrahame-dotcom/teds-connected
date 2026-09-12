import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, aiHelpTemplatesTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

router.get("/ai-help/templates", requireSession, async (_req, res) => {
  const templates = await db.select().from(aiHelpTemplatesTable).orderBy(asc(aiHelpTemplatesTable.sortOrder));
  res.json(templates);
});

router.post("/ai-help/templates", requireFullLevel, async (req, res) => {
  const { label, prompt } = req.body ?? {};
  if (typeof label !== "string" || !label.trim() || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "label and prompt are required" });
    return;
  }
  const rows = await db.select().from(aiHelpTemplatesTable);
  const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;
  const [template] = await db.insert(aiHelpTemplatesTable).values({ label: label.trim(), prompt: prompt.trim(), sortOrder: nextOrder }).returning();
  res.json({ ok: true, template });
});

router.patch("/ai-help/templates/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid template id" });
    return;
  }
  const { label, prompt, sortOrder } = req.body ?? {};
  const updates: Partial<typeof aiHelpTemplatesTable.$inferInsert> = {};
  if (typeof label === "string") updates.label = label.trim();
  if (typeof prompt === "string") updates.prompt = prompt.trim();
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  const [template] = await db.update(aiHelpTemplatesTable).set(updates).where(eq(aiHelpTemplatesTable.id, id)).returning();
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json({ ok: true, template });
});

router.delete("/ai-help/templates/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid template id" });
    return;
  }
  await db.delete(aiHelpTemplatesTable).where(eq(aiHelpTemplatesTable.id, id));
  res.json({ ok: true });
});

export default router;
