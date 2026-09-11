import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, moduleProgressTable, moduleStatusSchema, trainingModulesTable, trainingProgramsTable } from "@workspace/db";

const router: IRouter = Router();

// Keyed by staffName (the display name from the shared Phocal login) --
// there's no numeric user id available yet, see training.ts schema comment.
router.get("/training/programs", async (req, res) => {
  const staffName = typeof req.query.staffName === "string" ? req.query.staffName : null;

  const programs = await db.select().from(trainingProgramsTable).where(eq(trainingProgramsTable.archived, false));
  const modules = await db.select().from(trainingModulesTable).orderBy(asc(trainingModulesTable.sortOrder));
  const progress = staffName
    ? await db.select().from(moduleProgressTable).where(eq(moduleProgressTable.staffName, staffName))
    : [];

  const progressByModule = new Map(progress.map((p) => [p.moduleId, p.status]));

  const result = programs.map((program) => ({
    ...program,
    modules: modules
      .filter((m) => m.programId === program.id)
      .map((m) => ({ ...m, status: progressByModule.get(m.id) ?? "not_started" })),
  }));

  res.json(result);
});

router.post("/training/modules/:id/progress", async (req, res) => {
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

export default router;
