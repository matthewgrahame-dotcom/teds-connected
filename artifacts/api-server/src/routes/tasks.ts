import { Router, type IRouter } from "express";
import { and, asc, eq, gte } from "drizzle-orm";
import {
  db,
  trainingProgramsTable,
  trainingModulesTable,
  moduleProgressTable,
  calendarEventsTable,
  eventRsvpsTable,
  workDocumentsTable,
  workDocumentAcknowledgmentsTable,
  appSettingsTable,
  formsTable,
  formSubmissionsTable,
  formRoleAssignmentsTable,
  formUserAssignmentsTable,
  portalUsersTable,
} from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

function todayKey(): string {
  // Matches TedsCalendarCard's toDateKey() convention -- local date parts,
  // not toISOString() (which would shift the date for anyone east of UTC).
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const TASK_TYPES = ["training", "rsvp", "work_documents", "forms"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
const ENABLED_TASK_TYPES_KEY = "enabled_task_types";

// Reads which task types are switched on via the generic app_settings
// key/value store (see PortalSettingsPage's "Outstanding Tasks" section for
// the admin checkboxes that write this) -- same table already used for the
// Facebook Stream page setting, just a JSON array under one key rather than
// a plain string, since this is a set of toggles rather than a single value.
// No row yet (nobody's touched the setting) or a corrupt/unparseable value
// both fall back to "everything enabled", matching pre-settings behavior so
// this never silently hides a task type nobody explicitly turned off.
async function getEnabledTaskTypes(): Promise<Set<TaskType>> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, ENABLED_TASK_TYPES_KEY));
  if (!row) return new Set(TASK_TYPES);
  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return new Set(TASK_TYPES);
    const valid = parsed.filter((t): t is TaskType => TASK_TYPES.includes(t));
    return new Set(valid);
  } catch {
    return new Set(TASK_TYPES);
  }
}

// Combines three existing per-staffName concepts (training progress,
// calendar RSVPs, work document acknowledgments) into one "things you need
// to do" feed for the header's Tasks/Bell icons and the Outstanding Tasks
// dashboard card. All three are keyed by staffName (see training.ts,
// calendar.ts, and work-documents.ts schema comments) since that's the only
// stable identifier the shared Phocal login carries -- no numeric user id
// to join on yet. Each type can be switched off admin-side (see
// getEnabledTaskTypes above); still computed either way below and only
// zeroed out at the end, since that's simpler and less error-prone than
// conditionally skipping each query -- the extra queries on a disabled
// type are cheap relative to that risk.
router.get("/tasks", requireSession, async (req, res) => {
  const staffName = req.sessionPayload!.name;

  try {
    const [enabledTypes, programs, modules, progress, events, myRsvps, requiredDocs, myAcks, liveForms, formRoleAssignments, formUserAssignments, mySubmissions, allPortalUsers] = await Promise.all([
      getEnabledTaskTypes(),
      db.select().from(trainingProgramsTable).where(eq(trainingProgramsTable.status, "live")),
      db.select().from(trainingModulesTable).orderBy(asc(trainingModulesTable.sortOrder)),
      db.select().from(moduleProgressTable).where(eq(moduleProgressTable.staffName, staffName)),
      db
        .select()
        .from(calendarEventsTable)
        .where(and(eq(calendarEventsTable.requiresRsvp, true), gte(calendarEventsTable.date, todayKey())))
        .orderBy(asc(calendarEventsTable.date)),
      db.select().from(eventRsvpsTable).where(eq(eventRsvpsTable.staffName, staffName)),
      db.select().from(workDocumentsTable).where(eq(workDocumentsTable.requiresAcknowledgment, true)),
      db.select({ documentId: workDocumentAcknowledgmentsTable.documentId }).from(workDocumentAcknowledgmentsTable).where(eq(workDocumentAcknowledgmentsTable.staffName, staffName)),
      db.select().from(formsTable).where(and(eq(formsTable.status, "live"), eq(formsTable.archived, false))),
      db.select().from(formRoleAssignmentsTable),
      db.select().from(formUserAssignmentsTable),
      db.select({ formId: formSubmissionsTable.formId }).from(formSubmissionsTable).where(eq(formSubmissionsTable.submittedBy, staffName)),
      db.select({ id: portalUsersTable.id, role: portalUsersTable.role, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable),
    ]);
    const portalUser = allPortalUsers.find((u) => `${u.firstName} ${u.lastName}` === staffName) ?? null;

    const programsById = new Map(programs.map((p) => [p.id, p]));
    const completedModuleIds = new Set(progress.filter((p) => p.status === "completed").map((p) => p.moduleId));
    const trainingTasks = enabledTypes.has("training")
      ? modules
          .filter((m) => programsById.has(m.programId) && !completedModuleIds.has(m.id))
          .map((m) => ({
            type: "training" as const,
            moduleId: m.id,
            title: m.title,
            programTitle: programsById.get(m.programId)!.title,
          }))
      : [];

    const respondedEventIds = new Set(myRsvps.map((r) => r.eventId));
    const rsvpTasks = enabledTypes.has("rsvp")
      ? events
          .filter((e) => !respondedEventIds.has(e.id))
          .map((e) => ({
            type: "rsvp" as const,
            eventId: e.id,
            title: e.title,
            date: e.date,
            time: e.time,
          }))
      : [];

    const ackedDocIds = new Set(myAcks.map((a) => a.documentId));
    const workDocumentTasks = enabledTypes.has("work_documents")
      ? requiredDocs
          .filter((d) => !ackedDocIds.has(d.id))
          .map((d) => ({
            type: "work_document" as const,
            documentId: d.id,
            title: d.title,
            categorySlug: d.categorySlug,
          }))
      : [];

    // Only mandatory-level assignments surface as an actual outstanding
    // task -- matches the "Required Task" framing from the source export;
    // optional ones are available but not something to nag about.
    const mandatoryFormIds = new Set<number>();
    if (portalUser) {
      for (const a of formRoleAssignments) if (a.level === "mandatory" && a.role === portalUser.role) mandatoryFormIds.add(a.formId);
      for (const a of formUserAssignments) if (a.level === "mandatory" && a.userId === portalUser.id) mandatoryFormIds.add(a.formId);
    }
    const submittedFormIds = new Set(mySubmissions.map((s) => s.formId));
    const formsById = new Map(liveForms.map((f) => [f.id, f]));
    const formTasks = enabledTypes.has("forms")
      ? Array.from(mandatoryFormIds)
          .filter((formId) => formsById.has(formId) && !submittedFormIds.has(formId))
          .map((formId) => ({
            type: "form" as const,
            formId,
            title: formsById.get(formId)!.title,
            slug: formsById.get(formId)!.slug,
          }))
      : [];

    res.json({ trainingTasks, rsvpTasks, workDocumentTasks, formTasks });
  } catch (err) {
    console.error("[GET /tasks] error:", err);
    res.status(500).json({ error: "Something went wrong loading tasks." });
  }
});

export default router;
