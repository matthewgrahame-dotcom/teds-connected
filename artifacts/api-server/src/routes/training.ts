import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  moduleProgressTable,
  moduleStatusSchema,
  trainingModulesTable,
  trainingProgramsTable,
  trainingRoleAssignmentsTable,
  trainingUserAssignmentsTable,
  trainingGroupAssignmentsTable,
  trainingAssignmentLevelSchema,
  trainingQuizQuestionsTable,
  trainingQuizAttemptsTable,
  trainingQuizProgressTable,
  trainingQuizQuestionTypeSchema,
  userGroupMembersTable,
  portalUsersTable,
} from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// Resolves the three assignment axes (role / user / group) down to a set of
// distinct real portal_users ids for one program -- used both for the
// "Enrolled" count on the Manage Programs list and (later) for anything
// that needs to know who a program actually applies to. Draft programs
// always resolve to zero enrolled, matching the source export exactly
// (every Draft row there showed Enrolled: 0 despite already having
// assignments set) -- assignments exist in Draft, they just don't count
// as "enrolled" until the program goes live.
async function resolveEnrolledUserIds(programId: number, status: string): Promise<Set<number>> {
  if (status === "draft") return new Set();

  const [roleAssignments, userAssignments, groupAssignments] = await Promise.all([
    db.select().from(trainingRoleAssignmentsTable).where(eq(trainingRoleAssignmentsTable.programId, programId)),
    db.select().from(trainingUserAssignmentsTable).where(eq(trainingUserAssignmentsTable.programId, programId)),
    db.select().from(trainingGroupAssignmentsTable).where(eq(trainingGroupAssignmentsTable.programId, programId)),
  ]);

  const resolved = new Set<number>();
  userAssignments.forEach((a) => resolved.add(a.userId));

  if (roleAssignments.length > 0) {
    const roles = roleAssignments.map((a) => a.role);
    const matches = await db.select({ id: portalUsersTable.id }).from(portalUsersTable).where(inArray(portalUsersTable.role, roles));
    matches.forEach((m) => resolved.add(m.id));
  }

  if (groupAssignments.length > 0) {
    const groupIds = groupAssignments.map((a) => a.groupId);
    const members = await db.select({ userId: userGroupMembersTable.userId }).from(userGroupMembersTable).where(inArray(userGroupMembersTable.groupId, groupIds));
    members.forEach((m) => resolved.add(m.userId));
  }

  return resolved;
}

// -- Staff-facing (Learn > Programs) ---------------------------------------
// Keyed by staffName (the display name from the shared Phocal login) --
// there's no numeric user id available yet, see training.ts schema comment.
// Only ever shows live programs -- Draft/Archived aren't a staff member's
// concern.
router.get("/training/programs", requireSession, async (req, res) => {
  const staffName = typeof req.query.staffName === "string" ? req.query.staffName : null;

  try {
    const programs = await db.select().from(trainingProgramsTable).where(eq(trainingProgramsTable.status, "live"));
    const modules = await db.select().from(trainingModulesTable).orderBy(asc(trainingModulesTable.sortOrder));
    const progress = staffName
      ? await db.select().from(moduleProgressTable).where(eq(moduleProgressTable.staffName, staffName))
      : [];
    const quizCounts = await db.select({ moduleId: trainingQuizQuestionsTable.moduleId }).from(trainingQuizQuestionsTable);
    const moduleIdsWithQuiz = new Set(quizCounts.map((q) => q.moduleId));

    const progressByModule = new Map(progress.map((p) => [p.moduleId, p.status]));

    const result = programs.map((program) => ({
      ...program,
      modules: modules
        .filter((m) => m.programId === program.id)
        .map((m) => ({ ...m, status: progressByModule.get(m.id) ?? "not_started", hasQuiz: moduleIdsWithQuiz.has(m.id) })),
    }));

    res.json(result);
  } catch (err) {
    console.error("[GET /training/programs] error:", err);
    res.status(500).json({ error: "Something went wrong loading programs." });
  }
});

// -- Quiz taking (staff-facing) ---------------------------------------------
// GET strips correctOptionIndices -- never send the answer key to someone
// about to take the quiz. Scoring happens server-side on submit instead.
router.get("/training/modules/:id/quiz", requireSession, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  const questions = await db
    .select({ id: trainingQuizQuestionsTable.id, questionText: trainingQuizQuestionsTable.questionText, questionType: trainingQuizQuestionsTable.questionType, options: trainingQuizQuestionsTable.options, sortOrder: trainingQuizQuestionsTable.sortOrder })
    .from(trainingQuizQuestionsTable)
    .where(eq(trainingQuizQuestionsTable.moduleId, moduleId))
    .orderBy(asc(trainingQuizQuestionsTable.sortOrder));
  const [module_] = await db.select({ passThresholdPercent: trainingModulesTable.passThresholdPercent }).from(trainingModulesTable).where(eq(trainingModulesTable.id, moduleId));
  res.json({ questions, passThresholdPercent: module_?.passThresholdPercent ?? 100 });
});

// -- Quiz in-progress save (staff-facing) -----------------------------------
// Lets a learner close the quiz partway through and resume later (even
// after logging out and back in) instead of losing everything -- see
// schema comment on trainingQuizProgressTable for why this is a separate
// table from trainingQuizAttemptsTable rather than a new column there.
router.get("/training/modules/:id/quiz/progress", requireSession, async (req, res) => {
  const moduleId = Number(req.params.id);
  const staffName = typeof req.query.staffName === "string" ? req.query.staffName.trim() : "";
  if (!Number.isInteger(moduleId) || !staffName) {
    res.status(400).json({ error: "Invalid module id or missing staffName" });
    return;
  }
  const [draft] = await db
    .select({ answers: trainingQuizProgressTable.answers, textAnswers: trainingQuizProgressTable.textAnswers })
    .from(trainingQuizProgressTable)
    .where(and(eq(trainingQuizProgressTable.moduleId, moduleId), eq(trainingQuizProgressTable.staffName, staffName)));
  res.json({ answers: draft?.answers ?? {}, textAnswers: draft?.textAnswers ?? {} });
});

// Upsert -- called on every debounced change from QuizTaker while the
// learner is still answering, not just once. onConflictDoUpdate rather than
// a manual select-then-insert-or-update, since this can fire fairly often
// and a single round trip matters more here than it does on the lower-
// frequency admin CRUD routes elsewhere in this file.
router.put("/training/modules/:id/quiz/progress", requireSession, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  const staffName = typeof req.body?.staffName === "string" ? req.body.staffName.trim() : "";
  const { answers, textAnswers } = req.body ?? {};
  if (!staffName || typeof answers !== "object" || answers === null || typeof textAnswers !== "object" || textAnswers === null) {
    res.status(400).json({ error: "staffName, answers, and textAnswers are required" });
    return;
  }
  await db
    .insert(trainingQuizProgressTable)
    .values({ moduleId, staffName, answers, textAnswers })
    .onConflictDoUpdate({
      target: [trainingQuizProgressTable.moduleId, trainingQuizProgressTable.staffName],
      set: { answers, textAnswers, updatedAt: new Date() },
    });

  // Bump module_progress to "in_progress" the first time a draft actually
  // has something in it -- otherwise the status badge on Programs stays
  // stuck on "Not Started" even though real answers are being saved, since
  // until now only a full quiz submit ever touched this table. Only moves
  // "not_started" -> "in_progress", and only inserts a fresh row when none
  // exists yet -- deliberately does NOT touch an already-"completed" status,
  // so idly reopening a passed quiz (or a stray autosave firing before
  // "Retake" is clicked) can't make a finished module look unfinished again.
  const hasAnyAnswer = Object.keys(answers).length > 0 || Object.keys(textAnswers).length > 0;
  if (hasAnyAnswer) {
    const [existingProgress] = await db.select().from(moduleProgressTable).where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));
    if (!existingProgress) {
      await db.insert(moduleProgressTable).values({ moduleId, staffName, status: "in_progress" });
    } else if (existingProgress.status === "not_started") {
      await db.update(moduleProgressTable).set({ status: "in_progress" }).where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));
    }
  }

  res.json({ ok: true });
});

router.post("/training/modules/:id/quiz/submit", requireSession, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  const staffName = typeof req.body?.staffName === "string" ? req.body.staffName.trim() : "";
  const answers = req.body?.answers; // { [questionId]: number[] } -- selected option indices per question
  if (!staffName || typeof answers !== "object" || answers === null) {
    res.status(400).json({ error: "staffName and answers are required" });
    return;
  }

  const [module_, questions] = await Promise.all([
    db.select({ passThresholdPercent: trainingModulesTable.passThresholdPercent }).from(trainingModulesTable).where(eq(trainingModulesTable.id, moduleId)).then((r) => r[0]),
    db.select().from(trainingQuizQuestionsTable).where(eq(trainingQuizQuestionsTable.moduleId, moduleId)),
  ]);
  if (!module_) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  // Only single/multi questions are auto-scored -- 'text' (scenario/reflection)
  // questions have no correct answer to check against, so they're excluded
  // from both the denominator and numerator of the score entirely.
  const scorable = questions.filter((q) => q.questionType !== "text");
  let correctCount = 0;
  for (const q of scorable) {
    const given: number[] = Array.isArray(answers[q.id]) ? answers[q.id].map(Number).sort() : [];
    const correct = [...q.correctOptionIndices].sort();
    if (given.length === correct.length && given.every((v, i) => v === correct[i])) correctCount += 1;
  }
  const scorePercent = scorable.length > 0 ? Math.round((correctCount / scorable.length) * 100) : 100;
  const passed = scorePercent >= (module_.passThresholdPercent ?? 100);

  await db.insert(trainingQuizAttemptsTable).values({ moduleId, staffName, scorePercent, passed });
  // The attempt above is now the real, scored record -- the in-progress
  // draft's job is done regardless of pass/fail, so clear it rather than
  // leaving a stale draft that would otherwise silently repopulate the form
  // if this learner opens the quiz again (which "Retake Quiz" explicitly
  // expects to start blank).
  await db.delete(trainingQuizProgressTable).where(and(eq(trainingQuizProgressTable.moduleId, moduleId), eq(trainingQuizProgressTable.staffName, staffName)));

  const newStatus = passed ? "completed" : "in_progress";
  const existingProgress = await db.select().from(moduleProgressTable).where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));
  if (existingProgress.length > 0) {
    await db.update(moduleProgressTable).set({ status: newStatus }).where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));
  } else {
    await db.insert(moduleProgressTable).values({ moduleId, staffName, status: newStatus });
  }

  res.json({ ok: true, scorePercent, passed, correctCount, totalScorable: scorable.length, status: newStatus });
});

router.post("/training/modules/:id/progress", requireSession, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isFinite(moduleId)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }

  const statusResult = moduleStatusSchema.safeParse(req.body?.status);
  const staffName = typeof req.body?.staffName === "string" ? req.body.staffName.trim() : "";
  if (!statusResult.success || !staffName) {
    res.status(400).json({ error: "staffName and a valid status (not_started | in_progress | completed) are required" });
    return;
  }

  const existing = await db
    .select()
    .from(moduleProgressTable)
    .where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));

  if (existing.length > 0) {
    await db
      .update(moduleProgressTable)
      .set({ status: statusResult.data })
      .where(and(eq(moduleProgressTable.moduleId, moduleId), eq(moduleProgressTable.staffName, staffName)));
  } else {
    await db.insert(moduleProgressTable).values({ moduleId, staffName, status: statusResult.data });
  }

  res.json({ ok: true });
});

// -- Admin (Manage Programs) ------------------------------------------------

router.get("/training/admin/programs", requireSession, async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;

  const programs = await db
    .select()
    .from(trainingProgramsTable)
    .where(statusFilter ? eq(trainingProgramsTable.status, statusFilter) : undefined)
    .orderBy(desc(trainingProgramsTable.updatedAt));

  const modules = await db.select().from(trainingModulesTable);
  const moduleCountByProgram = new Map<number, number>();
  for (const m of modules) moduleCountByProgram.set(m.programId, (moduleCountByProgram.get(m.programId) ?? 0) + 1);

  const result = await Promise.all(
    programs.map(async (program) => ({
      ...program,
      moduleCount: moduleCountByProgram.get(program.id) ?? 0,
      enrolled: (await resolveEnrolledUserIds(program.id, program.status)).size,
    })),
  );

  res.json(result);
});

router.get("/training/admin/programs/:id", requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const [program] = await db.select().from(trainingProgramsTable).where(eq(trainingProgramsTable.id, id));
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const [modules, roleAssignments, userAssignments, groupAssignments] = await Promise.all([
    db.select().from(trainingModulesTable).where(eq(trainingModulesTable.programId, id)).orderBy(asc(trainingModulesTable.sortOrder)),
    db.select().from(trainingRoleAssignmentsTable).where(eq(trainingRoleAssignmentsTable.programId, id)),
    db.select().from(trainingUserAssignmentsTable).where(eq(trainingUserAssignmentsTable.programId, id)),
    db.select().from(trainingGroupAssignmentsTable).where(eq(trainingGroupAssignmentsTable.programId, id)),
  ]);
  const enrolled = (await resolveEnrolledUserIds(id, program.status)).size;

  const moduleIds = modules.map((m) => m.id);
  const quizQuestions = moduleIds.length
    ? await db.select().from(trainingQuizQuestionsTable).where(inArray(trainingQuizQuestionsTable.moduleId, moduleIds)).orderBy(asc(trainingQuizQuestionsTable.sortOrder))
    : [];
  const questionsByModule = new Map<number, typeof quizQuestions>();
  for (const q of quizQuestions) {
    const list = questionsByModule.get(q.moduleId) ?? [];
    list.push(q);
    questionsByModule.set(q.moduleId, list);
  }
  const modulesWithQuiz = modules.map((m) => ({ ...m, quizQuestions: questionsByModule.get(m.id) ?? [] }));

  res.json({ ...program, modules: modulesWithQuiz, roleAssignments, userAssignments, groupAssignments, enrolled });
});

// Creates a program and its modules together -- that's the natural unit
// (a program with no modules isn't useful yet, and the AI Help "create a
// training program" action always proposes both at once), so one endpoint
// rather than a separate create-then-add-modules round trip.
router.post("/training/programs", requireFullLevel, async (req, res) => {
  const { title, description, category, thumbnailUrl, startDate, endDate, modules } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const moduleTitles: { title: string; externalUrl?: string; content?: string; moduleType?: string }[] = Array.isArray(modules)
    ? modules
        .filter((m) => typeof m?.title === "string" && m.title.trim())
        .map((m) => ({
          title: m.title.trim(),
          externalUrl: typeof m.externalUrl === "string" ? m.externalUrl.trim() || undefined : undefined,
          content: typeof m.content === "string" ? m.content.trim() || undefined : undefined,
          moduleType: m.moduleType === "quiz" ? "quiz" : "lesson",
        }))
    : [];

  const result = await db.transaction(async (tx) => {
    const [program] = await tx
      .insert(trainingProgramsTable)
      .values({
        title: title.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        category: typeof category === "string" ? category.trim() || null : null,
        thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl.trim() || null : null,
        startDate: typeof startDate === "string" ? startDate.trim() || null : null,
        endDate: typeof endDate === "string" ? endDate.trim() || null : null,
      })
      .returning();

    const insertedModules = moduleTitles.length
      ? await tx
          .insert(trainingModulesTable)
          .values(moduleTitles.map((m, i) => ({ programId: program.id, title: m.title, externalUrl: m.externalUrl ?? null, content: m.content ?? null, moduleType: m.moduleType ?? "lesson", sortOrder: i })))
          .returning()
      : [];

    return { program, modules: insertedModules };
  });

  res.json({ ok: true, ...result });
});

const SCALAR_FIELDS = [
  "title",
  "description",
  "category",
  "thumbnailUrl",
  "startDate",
  "endDate",
  "prerequisiteConditions",
  "timeLockDetails",
  "estimatedTime",
] as const;
const BOOLEAN_FIELDS = [
  "prerequisitesEnabled",
  "timeLockEnabled",
  "recurringEnabled",
  "estimatedTimeEnabled",
  "recognizePriorCompletions",
] as const;

router.patch("/training/programs/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }

  const updates: Partial<typeof trainingProgramsTable.$inferInsert> = {};
  for (const field of SCALAR_FIELDS) {
    const raw = req.body?.[field];
    if (typeof raw === "string") (updates as Record<string, unknown>)[field] = raw.trim() || null;
  }
  for (const field of BOOLEAN_FIELDS) {
    const raw = req.body?.[field];
    if (typeof raw === "boolean") (updates as Record<string, unknown>)[field] = raw;
  }
  if (Array.isArray(req.body?.prerequisiteProgramIds)) {
    updates.prerequisiteProgramIds = req.body.prerequisiteProgramIds.map(Number).filter(Number.isInteger);
  }

  if (typeof req.body?.status === "string") {
    const status = req.body.status;
    if (!["draft", "live", "archived"].includes(status)) {
      res.status(400).json({ error: "status must be draft, live, or archived" });
      return;
    }
    updates.status = status;
    // First time going live: stamp publishedAt. Never re-stamp it on later
    // edits or a live->archived->live cycle -- "Published On" is a
    // first-publish date, matching the source export (it never showed a
    // later date than an item's original launch).
    if (status === "live") {
      const [existing] = await db.select({ publishedAt: trainingProgramsTable.publishedAt }).from(trainingProgramsTable).where(eq(trainingProgramsTable.id, id));
      if (existing && !existing.publishedAt) updates.publishedAt = new Date();
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [program] = await db.update(trainingProgramsTable).set(updates).where(eq(trainingProgramsTable.id, id)).returning();
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  res.json({ ok: true, program });
});

// -- Modules (individual CRUD, for the program editor) ----------------------

router.post("/training/programs/:id/modules", requireFullLevel, async (req, res) => {
  const programId = Number(req.params.id);
  if (!Number.isInteger(programId)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const { title, externalUrl, content, moduleType } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [{ maxOrder } = { maxOrder: -1 }] = await db
    .select({ maxOrder: trainingModulesTable.sortOrder })
    .from(trainingModulesTable)
    .where(eq(trainingModulesTable.programId, programId))
    .orderBy(desc(trainingModulesTable.sortOrder))
    .limit(1);

  const [module_] = await db
    .insert(trainingModulesTable)
    .values({
      programId,
      title: title.trim(),
      externalUrl: externalUrl?.trim() || null,
      content: content?.trim() || null,
      moduleType: moduleType === "quiz" ? "quiz" : "lesson",
      sortOrder: maxOrder + 1,
    })
    .returning();
  res.json({ ok: true, module: module_ });
});

router.patch("/training/modules/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  const { title, externalUrl, content, moduleType, passThresholdPercent, requiresFullViewing, sortOrder } = req.body ?? {};
  const updates: Partial<typeof trainingModulesTable.$inferInsert> = {};
  if (typeof title === "string") updates.title = title.trim();
  if (externalUrl !== undefined) updates.externalUrl = externalUrl?.trim() || null;
  if (content !== undefined) updates.content = content?.trim() || null;
  if (moduleType === "quiz" || moduleType === "lesson") updates.moduleType = moduleType;
  if (Number.isInteger(passThresholdPercent)) updates.passThresholdPercent = Math.min(100, Math.max(0, passThresholdPercent));
  if (typeof requiresFullViewing === "boolean") updates.requiresFullViewing = requiresFullViewing;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;

  const [module_] = await db.update(trainingModulesTable).set(updates).where(eq(trainingModulesTable.id, id)).returning();
  if (!module_) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  res.json({ ok: true, module: module_ });
});

router.delete("/training/modules/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  await db.delete(trainingModulesTable).where(eq(trainingModulesTable.id, id));
  res.json({ ok: true });
});

// -- Quiz questions (admin editing) -----------------------------------------
// Wholesale replace, same reasoning as dashboard_widgets/assignments -- the
// editor naturally produces the whole new question list at once.
router.put("/training/modules/:id/quiz", requireFullLevel, async (req, res) => {
  const moduleId = Number(req.params.id);
  if (!Number.isInteger(moduleId)) {
    res.status(400).json({ error: "Invalid module id" });
    return;
  }
  const { questions } = req.body ?? {};
  if (!Array.isArray(questions)) {
    res.status(400).json({ error: "questions must be an array" });
    return;
  }

  const clean = questions
    .filter((q) => typeof q?.questionText === "string" && q.questionText.trim())
    .map((q, i) => {
      const type = trainingQuizQuestionTypeSchema.safeParse(q.questionType).success ? q.questionType : "single";
      const options = type === "text" ? [] : Array.isArray(q.options) ? q.options.filter((o: unknown) => typeof o === "string").map((o: string) => o.trim()) : [];
      const correctOptionIndices = type === "text" ? [] : Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices.map(Number).filter(Number.isInteger) : [];
      return { moduleId, questionText: q.questionText.trim(), questionType: type, options, correctOptionIndices, sortOrder: i };
    });

  await db.transaction(async (tx) => {
    await tx.delete(trainingQuizQuestionsTable).where(eq(trainingQuizQuestionsTable.moduleId, moduleId));
    if (clean.length) await tx.insert(trainingQuizQuestionsTable).values(clean);
  });

  res.json({ ok: true, count: clean.length });
});

// -- Assignments (role / user / group) --------------------------------------
// Wholesale replace, same reasoning as dashboard_widgets -- the editor UI
// naturally produces the whole new assignment set at once (a checkbox grid
// / picker list), not a single incremental change.

router.put("/training/programs/:id/assignments", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const { roles, users, groups } = req.body ?? {};

  const cleanRoles = Array.isArray(roles)
    ? roles.filter((r) => typeof r?.role === "string" && r.role.trim() && trainingAssignmentLevelSchema.safeParse(r.level).success)
    : [];
  const cleanUsers = Array.isArray(users)
    ? users.filter((u) => Number.isInteger(Number(u?.userId)) && trainingAssignmentLevelSchema.safeParse(u.level).success)
    : [];
  const cleanGroups = Array.isArray(groups)
    ? groups.filter((g) => Number.isInteger(Number(g?.groupId)) && trainingAssignmentLevelSchema.safeParse(g.level).success)
    : [];

  await db.transaction(async (tx) => {
    await tx.delete(trainingRoleAssignmentsTable).where(eq(trainingRoleAssignmentsTable.programId, id));
    await tx.delete(trainingUserAssignmentsTable).where(eq(trainingUserAssignmentsTable.programId, id));
    await tx.delete(trainingGroupAssignmentsTable).where(eq(trainingGroupAssignmentsTable.programId, id));

    if (cleanRoles.length) await tx.insert(trainingRoleAssignmentsTable).values(cleanRoles.map((r) => ({ programId: id, role: r.role.trim(), level: r.level })));
    if (cleanUsers.length) await tx.insert(trainingUserAssignmentsTable).values(cleanUsers.map((u) => ({ programId: id, userId: Number(u.userId), level: u.level })));
    if (cleanGroups.length) await tx.insert(trainingGroupAssignmentsTable).values(cleanGroups.map((g) => ({ programId: id, groupId: Number(g.groupId), level: g.level })));
  });

  res.json({ ok: true });
});

// -- Reporting ----------------------------------------------------------
// Aggregates existing progress/assignment data -- no new tracking tables.
// Matches staff between portal_users and module_progress by full name
// ("First Last"), since that's the only link available (module_progress is
// keyed by the Phocal-login staffName, portal_users is a separate HR-style
// roster with no numeric id shared between the two -- same gap noted
// elsewhere in this file's resolveEnrolledUserIds).

type ResolvedAssignment = { programId: number; level: "optional" | "mandatory" };

// For every active user, works out which live programs actually apply to
// them and at what level -- inverse of resolveEnrolledUserIds (which goes
// program -> users; this goes user -> programs). If a person qualifies for
// the same program via more than one path (e.g. their role says optional
// but they're also individually assigned mandatory), mandatory wins --
// that's the stricter, more correct reading of "does this apply to me".
async function resolveProgramAssignmentsByUser(): Promise<Map<number, ResolvedAssignment[]>> {
  const [programs, roleAssignments, userAssignments, groupAssignments, groupMembers, users] = await Promise.all([
    db.select({ id: trainingProgramsTable.id, status: trainingProgramsTable.status }).from(trainingProgramsTable),
    db.select().from(trainingRoleAssignmentsTable),
    db.select().from(trainingUserAssignmentsTable),
    db.select().from(trainingGroupAssignmentsTable),
    db.select().from(userGroupMembersTable),
    db.select({ id: portalUsersTable.id, role: portalUsersTable.role }).from(portalUsersTable),
  ]);

  const liveProgramIds = new Set(programs.filter((p) => p.status === "live").map((p) => p.id));
  const byUser = new Map<number, Map<number, "optional" | "mandatory">>();

  const grant = (userId: number, programId: number, level: "optional" | "mandatory") => {
    if (!liveProgramIds.has(programId)) return;
    const existing = byUser.get(userId) ?? new Map<number, "optional" | "mandatory">();
    const current = existing.get(programId);
    if (!current || (current === "optional" && level === "mandatory")) existing.set(programId, level);
    byUser.set(userId, existing);
  };

  const roleToUsers = new Map<string, number[]>();
  for (const u of users) {
    const list = roleToUsers.get(u.role) ?? [];
    list.push(u.id);
    roleToUsers.set(u.role, list);
  }
  for (const a of roleAssignments) (roleToUsers.get(a.role) ?? []).forEach((userId) => grant(userId, a.programId, a.level as "optional" | "mandatory"));

  for (const a of userAssignments) grant(a.userId, a.programId, a.level as "optional" | "mandatory");

  const groupToUsers = new Map<number, number[]>();
  for (const m of groupMembers) {
    const list = groupToUsers.get(m.groupId) ?? [];
    list.push(m.userId);
    groupToUsers.set(m.groupId, list);
  }
  for (const a of groupAssignments) (groupToUsers.get(a.groupId) ?? []).forEach((userId) => grant(userId, a.programId, a.level as "optional" | "mandatory"));

  const result = new Map<number, ResolvedAssignment[]>();
  for (const [userId, programLevels] of byUser) {
    result.set(userId, Array.from(programLevels, ([programId, level]) => ({ programId, level })));
  }
  return result;
}

router.get("/training/reporting/learners", requireFullLevel, async (_req, res) => {
  const [users, assignmentsByUser, modules, progress] = await Promise.all([
    db
      .select({ id: portalUsersTable.id, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, role: portalUsersTable.role, locations: portalUsersTable.locations })
      .from(portalUsersTable)
      .where(eq(portalUsersTable.archived, false)),
    resolveProgramAssignmentsByUser(),
    db.select({ id: trainingModulesTable.id, programId: trainingModulesTable.programId }).from(trainingModulesTable),
    db.select().from(moduleProgressTable),
  ]);

  const modulesByProgram = new Map<number, number[]>();
  for (const m of modules) {
    const list = modulesByProgram.get(m.programId) ?? [];
    list.push(m.id);
    modulesByProgram.set(m.programId, list);
  }

  const progressByStaff = new Map<string, Map<number, { status: string; updatedAt: string }>>();
  for (const p of progress) {
    const byModule = progressByStaff.get(p.staffName) ?? new Map();
    byModule.set(p.moduleId, { status: p.status, updatedAt: p.updatedAt.toISOString() });
    progressByStaff.set(p.staffName, byModule);
  }

  const rows = users.map((u) => {
    const fullName = `${u.firstName} ${u.lastName}`;
    const assignments = assignmentsByUser.get(u.id) ?? [];
    const myProgress = progressByStaff.get(fullName) ?? new Map();

    const tally = (levelFilter?: "optional" | "mandatory") => {
      let total = 0;
      let completed = 0;
      let latestUpdate: string | null = null;
      for (const a of assignments) {
        if (levelFilter && a.level !== levelFilter) continue;
        for (const moduleId of modulesByProgram.get(a.programId) ?? []) {
          total += 1;
          const entry = myProgress.get(moduleId);
          if (entry?.status === "completed") completed += 1;
          if (entry && (!latestUpdate || entry.updatedAt > latestUpdate)) latestUpdate = entry.updatedAt;
        }
      }
      return { total, completed, latestUpdate };
    };

    const overall = tally();
    const mandatory = tally("mandatory");
    const optional = tally("optional");

    return {
      userId: u.id,
      name: fullName,
      role: u.role,
      location: u.locations[0] ?? null,
      overallProgressPercent: overall.total > 0 ? Math.round((overall.completed / overall.total) * 1000) / 10 : 0,
      mandatoryProgressPercent: mandatory.total > 0 ? Math.round((mandatory.completed / mandatory.total) * 1000) / 10 : 0,
      optionalProgressPercent: optional.total > 0 ? Math.round((optional.completed / optional.total) * 1000) / 10 : 0,
      updatedAt: overall.latestUpdate,
    };
  });

  res.json(rows);
});

router.get("/training/reporting/by-location", requireFullLevel, async (req, res) => {
  const programIdFilter = typeof req.query.programId === "string" && req.query.programId !== "all" ? Number(req.query.programId) : null;

  const [users, assignmentsByUser, modules, progress] = await Promise.all([
    db
      .select({ id: portalUsersTable.id, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, locations: portalUsersTable.locations })
      .from(portalUsersTable)
      .where(eq(portalUsersTable.archived, false)),
    resolveProgramAssignmentsByUser(),
    db.select({ id: trainingModulesTable.id, programId: trainingModulesTable.programId }).from(trainingModulesTable),
    db.select().from(moduleProgressTable),
  ]);

  const modulesByProgram = new Map<number, number[]>();
  for (const m of modules) {
    const list = modulesByProgram.get(m.programId) ?? [];
    list.push(m.id);
    modulesByProgram.set(m.programId, list);
  }

  const progressByStaff = new Map<string, Map<number, string>>();
  for (const p of progress) {
    const byModule = progressByStaff.get(p.staffName) ?? new Map();
    byModule.set(p.moduleId, p.status);
    progressByStaff.set(p.staffName, byModule);
  }

  const tallyByLocation = new Map<string, { completed: number; inProgress: number; notStarted: number }>();

  for (const u of users) {
    const fullName = `${u.firstName} ${u.lastName}`;
    const assignments = assignmentsByUser.get(u.id) ?? [];
    const myProgress = progressByStaff.get(fullName) ?? new Map();

    for (const a of assignments) {
      if (programIdFilter !== null && a.programId !== programIdFilter) continue;
      for (const moduleId of modulesByProgram.get(a.programId) ?? []) {
        const status = myProgress.get(moduleId) ?? "not_started";
        for (const location of u.locations.length ? u.locations : ["(No location set)"]) {
          const bucket = tallyByLocation.get(location) ?? { completed: 0, inProgress: 0, notStarted: 0 };
          if (status === "completed") bucket.completed += 1;
          else if (status === "in_progress") bucket.inProgress += 1;
          else bucket.notStarted += 1;
          tallyByLocation.set(location, bucket);
        }
      }
    }
  }

  const result = Array.from(tallyByLocation, ([location, counts]) => {
    const total = counts.completed + counts.inProgress + counts.notStarted;
    return {
      location,
      completedPercent: total > 0 ? Math.round((counts.completed / total) * 1000) / 10 : 0,
      inProgressPercent: total > 0 ? Math.round((counts.inProgress / total) * 1000) / 10 : 0,
      notStartedPercent: total > 0 ? Math.round((counts.notStarted / total) * 1000) / 10 : 0,
    };
  }).sort((a, b) => a.location.localeCompare(b.location));

  res.json(result);
});

export default router;
