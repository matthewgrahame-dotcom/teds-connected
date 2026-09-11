import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, calendarEventsTable } from "@workspace/db";

const router: IRouter = Router();

// TODO: same access-control note as the schema -- open to any logged-in
// staff member until role-based permissions are scoped properly.
router.get("/calendar/events", async (_req, res) => {
  const events = await db.select().from(calendarEventsTable).orderBy(asc(calendarEventsTable.date));
  res.json(events);
});

router.post("/calendar/events", async (req, res) => {
  const { title, date, time, location, createdBy } = req.body ?? {};
  if (typeof title !== "string" || !title.trim() || typeof date !== "string" || !date.trim() || typeof createdBy !== "string" || !createdBy.trim()) {
    res.status(400).json({ error: "title, date, and createdBy are required" });
    return;
  }
  const [event] = await db
    .insert(calendarEventsTable)
    .values({ title: title.trim(), date: date.trim(), time: time?.trim() || null, location: location?.trim() || null, createdBy: createdBy.trim() })
    .returning();
  res.json({ ok: true, event });
});

export default router;
