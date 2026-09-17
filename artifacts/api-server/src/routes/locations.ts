import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { db, locationsTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// Open to any logged-in session (not just full-level) -- this is plain
// reference data (which stores exist, their suburb/state/phone), the same
// kind of thing a "which store am I posting from" picker needs, not
// anything sensitive. Only creating/editing/deleting requires full level.
router.get("/locations", requireSession, async (_req, res) => {
  const locations = await db.select().from(locationsTable).orderBy(asc(locationsTable.sortOrder));
  res.json(locations);
});

router.post("/locations", requireFullLevel, async (req, res) => {
  const { name, locationType, suburb, state, phone } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (typeof locationType !== "string" || !locationType.trim()) {
    res.status(400).json({ error: "locationType is required" });
    return;
  }

  const [{ maxSortOrder } = { maxSortOrder: null }] = await db
    .select({ maxSortOrder: locationsTable.sortOrder })
    .from(locationsTable)
    .orderBy(desc(locationsTable.sortOrder))
    .limit(1);

  try {
    const [location] = await db
      .insert(locationsTable)
      .values({
        name: name.trim(),
        locationType: locationType.trim(),
        suburb: typeof suburb === "string" ? suburb.trim() || null : null,
        state: typeof state === "string" ? state.trim() || null : null,
        phone: typeof phone === "string" ? phone.trim() || null : null,
        sortOrder: (maxSortOrder ?? -1) + 1,
      })
      .returning();
    res.json({ ok: true, location });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error && err.message.includes("unique") ? "A location with that name already exists" : "Could not create the location" });
  }
});

router.patch("/locations/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid location id" });
    return;
  }

  const updates: Partial<typeof locationsTable.$inferInsert> = {};
  for (const field of ["name", "locationType", "suburb", "state", "phone"] as const) {
    const raw = req.body?.[field];
    if (typeof raw === "string") (updates as Record<string, unknown>)[field] = raw.trim() || null;
  }
  if ("name" in updates && !updates.name) {
    res.status(400).json({ error: "name cannot be empty" });
    return;
  }
  if ("locationType" in updates && !updates.locationType) {
    res.status(400).json({ error: "locationType cannot be empty" });
    return;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  try {
    const [location] = await db.update(locationsTable).set(updates).where(eq(locationsTable.id, id)).returning();
    if (!location) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json({ ok: true, location });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error && err.message.includes("unique") ? "A location with that name already exists" : "Could not update the location" });
  }
});

router.delete("/locations/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid location id" });
    return;
  }
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.json({ ok: true });
});

export default router;
