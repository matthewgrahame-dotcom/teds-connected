import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, calendarEventsTable, eventRsvpsTable, rsvpResponseSchema } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

router.get("/calendar/events", requireSession, async (_req, res) => {
  const events = await db.select().from(calendarEventsTable).orderBy(asc(calendarEventsTable.date));
  const rsvps = await db.select().from(eventRsvpsTable);
  const rsvpsByEvent = new Map<number, typeof rsvps>();
  for (const r of rsvps) {
    const list = rsvpsByEvent.get(r.eventId) ?? [];
    list.push(r);
    rsvpsByEvent.set(r.eventId, list);
  }
  res.json(events.map((e) => ({ ...e, rsvps: rsvpsByEvent.get(e.id) ?? [] })));
});

router.post("/calendar/events", requireSession, async (req, res) => {
  const { title, date, time, location, requiresRsvp } = req.body ?? {};
  const createdBy = req.sessionPayload!.name;
  if (typeof title !== "string" || !title.trim() || typeof date !== "string" || !date.trim()) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }
  const [event] = await db
    .insert(calendarEventsTable)
    .values({
      title: title.trim(),
      date: date.trim(),
      time: time?.trim() || null,
      location: location?.trim() || null,
      createdBy,
      requiresRsvp: Boolean(requiresRsvp),
    })
    .returning();
  res.json({ ok: true, event });
});

router.put("/calendar/events/:id/rsvp", requireSession, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const result = rsvpResponseSchema.safeParse(req.body?.response);
  if (!result.success) {
    res.status(400).json({ error: "response must be yes, no, or maybe" });
    return;
  }
  const staffName = req.sessionPayload!.name;

  const existing = await db
    .select()
    .from(eventRsvpsTable)
    .where(and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.staffName, staffName)));

  if (existing.length > 0) {
    await db
      .update(eventRsvpsTable)
      .set({ response: result.data, respondedAt: new Date() })
      .where(and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.staffName, staffName)));
  } else {
    await db.insert(eventRsvpsTable).values({ eventId, staffName, response: result.data });
  }

  res.json({ ok: true });
});

export default router;
