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
  const { title, externalUrl, content, moduleType, passThresholdPercent, sortOrder } = req.body ?? {};
  const updates: Partial<typeof trainingModulesTable.$inferInsert> = {};
  if (typeof title === "string") updates.title = title.trim();
  if (externalUrl !== undefined) updates.externalUrl = externalUrl?.trim() || null;
  if (content !== undefined) updates.content = content?.trim() || null;
  if (moduleType === "quiz" || moduleType === "lesson") updates.moduleType = moduleType;
  if (Number.isInteger(passThresholdPercent)) updates.passThresholdPercent = Math.min(100, Math.max(0, passThresholdPercent));
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

export default router;
