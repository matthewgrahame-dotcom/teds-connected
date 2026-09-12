import { Router, type IRouter } from "express";
import { and, asc, eq, gte } from "drizzle-orm";
import {
  db,
  trainingProgramsTable,
  trainingModulesTable,
  moduleProgressTable,
  calendarEventsTable,
  eventRsvpsTable,
} from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

function todayKey(): string {
  // Matches TedsCalendarCard's toDateKey() convention -- local date parts,
  // not toISOString() (which would shift the date for anyone east of UTC).
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Combines two existing per-staffName concepts (training progress,
// calendar RSVPs) into one "things you need to do" feed for the header's
// Tasks/Bell icons. Both are keyed by staffName (see training.ts and
// calendar.ts schema comments) since that's the only stable identifier the
// shared Phocal login carries -- no numeric user id to join on yet.
router.get("/tasks", requireSession, async (req, res) => {
  const staffName = req.sessionPayload!.name;

  try {
    const [programs, modules, progress, events, myRsvps] = await Promise.all([
      db.select().from(trainingProgramsTable).where(eq(trainingProgramsTable.status, "live")),
      db.select().from(trainingModulesTable).orderBy(asc(trainingModulesTable.sortOrder)),
      db.select().from(moduleProgressTable).where(eq(moduleProgressTable.staffName, staffName)),
      db
        .select()
        .from(calendarEventsTable)
        .where(and(eq(calendarEventsTable.requiresRsvp, true), gte(calendarEventsTable.date, todayKey())))
        .orderBy(asc(calendarEventsTable.date)),
      db.select().from(eventRsvpsTable).where(eq(eventRsvpsTable.staffName, staffName)),
    ]);

    const programsById = new Map(programs.map((p) => [p.id, p]));
    const completedModuleIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.moduleId));
    const trainingTasks = modules
      .filter((m) => programsById.has(m.programId) && !completedModuleIds.has(m.id))
      .map((m) => ({
        type: "training" as const,
        moduleId: m.id,
        title: m.title,
        programTitle: programsById.get(m.programId)!.title,
      }));

    const respondedEventIds = new Set(myRsvps.map((r) => r.eventId));
    const rsvpTasks = events
      .filter((e) => !respondedEventIds.has(e.id))
      .map((e) => ({
        type: "rsvp" as const,
        eventId: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
      }));

    res.json({ trainingTasks, rsvpTasks });
  } catch (err) {
    console.error("[GET /tasks] error:", err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error", cause, stack: err instanceof Error ? err.stack : undefined });
  }
});

export default router;
