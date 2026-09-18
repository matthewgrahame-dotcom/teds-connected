import { Router, type IRouter } from "express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  onboardingProgramsTable,
  onboardingSectionsTable,
  onboardingItemsTable,
  onboardingViewRoleAssignmentsTable,
  onboardingViewUserAssignmentsTable,
  formsTable,
  formSubmissionsTable,
  workDocumentsTable,
  workDocumentAcknowledgmentsTable,
  portalUsersTable,
} from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";
import { requireConnectedTier } from "../lib/connectedTiers";

const router: IRouter = Router();

const SCALAR_FIELDS = ["title", "reminderIntervalUnit"] as const;
const BOOLEAN_FIELDS = ["reminderEmailsEnabled", "autoAssignExternal"] as const;

// -- Admin (Manage Onboarding) -----------------------------------------------

router.get("/onboarding/admin/programs", requireConnectedTier('admin'), async (_req, res) => {
  const programs = await db.select().from(onboardingProgramsTable).orderBy(desc(onboardingProgramsTable.updatedAt));
  const sections = await db.select().from(onboardingSectionsTable);
  const items = await db.select().from(onboardingItemsTable);

  const sectionIdsByProgram = new Map<number, number[]>();
  for (const s of sections) sectionIdsByProgram.set(s.programId, [...(sectionIdsByProgram.get(s.programId) ?? []), s.id]);
  const itemCountBySection = new Map<number, number>();
  for (const i of items) itemCountBySection.set(i.sectionId, (itemCountBySection.get(i.sectionId) ?? 0) + 1);

  const result = programs.map((p) => {
    const sectionIds = sectionIdsByProgram.get(p.id) ?? [];
    const itemCount = sectionIds.reduce((sum, id) => sum + (itemCountBySection.get(id) ?? 0), 0);
    return { ...p, sectionCount: sectionIds.length, itemCount };
  });

  res.json(result);
});

router.get("/onboarding/admin/programs/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const [program] = await db.select().from(onboardingProgramsTable).where(eq(onboardingProgramsTable.id, id));
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }

  const [sections, viewRoleAssignments, viewUserAssignments] = await Promise.all([
    db.select().from(onboardingSectionsTable).where(eq(onboardingSectionsTable.programId, id)).orderBy(asc(onboardingSectionsTable.sortOrder)),
    db.select().from(onboardingViewRoleAssignmentsTable).where(eq(onboardingViewRoleAssignmentsTable.programId, id)),
    db.select().from(onboardingViewUserAssignmentsTable).where(eq(onboardingViewUserAssignmentsTable.programId, id)),
  ]);

  const sectionIds = sections.map((s) => s.id);
  const items = sectionIds.length
    ? await db.select().from(onboardingItemsTable).where(inArray(onboardingItemsTable.sectionId, sectionIds)).orderBy(asc(onboardingItemsTable.sortOrder))
    : [];

  const formIds = items.filter((i) => i.formId != null).map((i) => i.formId!);
  const docIds = items.filter((i) => i.workDocumentId != null).map((i) => i.workDocumentId!);
  const [forms, docs] = await Promise.all([
    formIds.length ? db.select({ id: formsTable.id, title: formsTable.title }).from(formsTable).where(inArray(formsTable.id, formIds)) : [],
    docIds.length ? db.select({ id: workDocumentsTable.id, title: workDocumentsTable.title }).from(workDocumentsTable).where(inArray(workDocumentsTable.id, docIds)) : [],
  ]);
  const formTitleById = new Map(forms.map((f) => [f.id, f.title]));
  const docTitleById = new Map(docs.map((d) => [d.id, d.title]));

  const itemsBySection = new Map<number, typeof items>();
  for (const item of items) itemsBySection.set(item.sectionId, [...(itemsBySection.get(item.sectionId) ?? []), item]);

  const sectionsWithItems = sections.map((s) => ({
    ...s,
    items: (itemsBySection.get(s.id) ?? []).map((i) => ({
      ...i,
      title: i.itemType === "form" ? (i.formId != null ? formTitleById.get(i.formId) ?? "(deleted form)" : "") : i.workDocumentId != null ? docTitleById.get(i.workDocumentId) ?? "(deleted document)" : "",
    })),
  }));

  res.json({ ...program, sections: sectionsWithItems, viewRoleAssignments, viewUserAssignments });
});

router.post("/onboarding/programs", requireConnectedTier('admin'), async (req, res) => {
  const { title, defaultRoles } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [{ maxSortOrder } = { maxSortOrder: null }] = await db
    .select({ maxSortOrder: onboardingProgramsTable.sortOrder })
    .from(onboardingProgramsTable)
    .orderBy(desc(onboardingProgramsTable.sortOrder))
    .limit(1);

  const [program] = await db
    .insert(onboardingProgramsTable)
    .values({
      title: title.trim(),
      defaultRoles: Array.isArray(defaultRoles) ? defaultRoles.filter((r) => typeof r === "string" && r.trim()).map((r) => r.trim()) : [],
      sortOrder: (maxSortOrder ?? -1) + 1,
    })
    .returning();

  res.json({ ok: true, program });
});

router.patch("/onboarding/programs/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }

  const updates: Partial<typeof onboardingProgramsTable.$inferInsert> = {};
  for (const field of SCALAR_FIELDS) {
    const raw = req.body?.[field];
    if (typeof raw === "string") (updates as Record<string, unknown>)[field] = raw.trim() || null;
  }
  for (const field of BOOLEAN_FIELDS) {
    const raw = req.body?.[field];
    if (typeof raw === "boolean") (updates as Record<string, unknown>)[field] = raw;
  }
  if (typeof req.body?.reminderIntervalValue === "number" && Number.isInteger(req.body.reminderIntervalValue)) {
    updates.reminderIntervalValue = req.body.reminderIntervalValue;
  }
  if (Array.isArray(req.body?.defaultRoles)) {
    updates.defaultRoles = req.body.defaultRoles.filter((r: unknown) => typeof r === "string" && r.trim()).map((r: string) => r.trim());
  }
  if (typeof req.body?.status === "string" && ["draft", "published", "archived"].includes(req.body.status)) {
    updates.status = req.body.status;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [program] = await db.update(onboardingProgramsTable).set(updates).where(eq(onboardingProgramsTable.id, id)).returning();
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  res.json({ ok: true, program });
});

// Wholesale replace of a program's sections+items -- the Content tab's
// section/item builder produces the full new tree client-side on every
// save (add/remove/reorder all happen in local state first), same
// reasoning as PUT /dashboard-widgets and PUT /training/programs/reorder.
router.put("/onboarding/programs/:id/content", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const { sections } = req.body ?? {};
  if (!Array.isArray(sections)) {
    res.status(400).json({ error: "sections must be an array" });
    return;
  }

  const cleanSections = sections
    .filter((s) => typeof s?.title === "string" && s.title.trim())
    .map((s) => ({
      title: s.title.trim(),
      items: Array.isArray(s.items)
        ? s.items
            .filter((i: any) => i?.itemType === "form" || i?.itemType === "policy_signoff")
            .filter((i: any) => (i.itemType === "form" ? Number.isInteger(i.formId) : Number.isInteger(i.workDocumentId)))
            .map((i: any) => ({
              itemType: i.itemType as "form" | "policy_signoff",
              formId: i.itemType === "form" ? i.formId : null,
              workDocumentId: i.itemType === "policy_signoff" ? i.workDocumentId : null,
            }))
        : [],
    }));

  await db.transaction(async (tx) => {
    const existingSections = await tx.select({ id: onboardingSectionsTable.id }).from(onboardingSectionsTable).where(eq(onboardingSectionsTable.programId, id));
    const existingSectionIds = existingSections.map((s) => s.id);
    if (existingSectionIds.length) await tx.delete(onboardingItemsTable).where(inArray(onboardingItemsTable.sectionId, existingSectionIds));
    await tx.delete(onboardingSectionsTable).where(eq(onboardingSectionsTable.programId, id));

    for (let sectionIndex = 0; sectionIndex < cleanSections.length; sectionIndex++) {
      const s = cleanSections[sectionIndex];
      const [insertedSection] = await tx.insert(onboardingSectionsTable).values({ programId: id, title: s.title, sortOrder: sectionIndex }).returning();
      if (s.items.length) {
        await tx.insert(onboardingItemsTable).values(
          s.items.map((item: { itemType: "form" | "policy_signoff"; formId: number | null; workDocumentId: number | null }, itemIndex: number) => ({
            sectionId: insertedSection.id,
            itemType: item.itemType,
            formId: item.formId,
            workDocumentId: item.workDocumentId,
            sortOrder: itemIndex,
          })),
        );
      }
    }
  });

  res.json({ ok: true });
});

router.put("/onboarding/programs/:id/view-permissions", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid program id" });
    return;
  }
  const { roles, userIds } = req.body ?? {};
  const cleanRoles: { role: string; notifyOnCompletion: boolean }[] = Array.isArray(roles)
    ? roles.filter((r: any) => typeof r?.role === "string" && r.role.trim()).map((r: any) => ({ role: r.role.trim(), notifyOnCompletion: !!r.notifyOnCompletion }))
    : [];
  const cleanUsers: { userId: number; notifyOnCompletion: boolean }[] = Array.isArray(userIds)
    ? userIds.filter((u: any) => Number.isInteger(u?.userId)).map((u: any) => ({ userId: u.userId, notifyOnCompletion: !!u.notifyOnCompletion }))
    : [];

  await db.transaction(async (tx) => {
    await tx.delete(onboardingViewRoleAssignmentsTable).where(eq(onboardingViewRoleAssignmentsTable.programId, id));
    await tx.delete(onboardingViewUserAssignmentsTable).where(eq(onboardingViewUserAssignmentsTable.programId, id));
    if (cleanRoles.length) await tx.insert(onboardingViewRoleAssignmentsTable).values(cleanRoles.map((r) => ({ programId: id, role: r.role, notifyOnCompletion: r.notifyOnCompletion })));
    if (cleanUsers.length) await tx.insert(onboardingViewUserAssignmentsTable).values(cleanUsers.map((u) => ({ programId: id, userId: u.userId, notifyOnCompletion: u.notifyOnCompletion })));
  });

  res.json({ ok: true });
});

// -- Staff-facing (People > Onboarding) --------------------------------------
// Keyed by role match against portal_users, same "no numeric user id from
// the shared Phocal login" constraint noted throughout training.ts/forms.ts
// -- staffName is still how we join to form_submissions/work_document_acknowledgments.

router.get("/onboarding/programs", requireSession, async (req, res) => {
  const staffName = req.sessionPayload!.name;

  const allUsers = await db.select({ id: portalUsersTable.id, role: portalUsersTable.role, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable);
  const me = allUsers.find((u) => `${u.firstName} ${u.lastName}` === staffName) ?? null;

  const publishedPrograms = await db.select().from(onboardingProgramsTable).where(eq(onboardingProgramsTable.status, "published")).orderBy(asc(onboardingProgramsTable.sortOrder));
  const myPrograms = me ? publishedPrograms.filter((p) => p.defaultRoles.includes(me.role)) : [];

  if (myPrograms.length === 0) {
    res.json([]);
    return;
  }

  const programIds = myPrograms.map((p) => p.id);
  const sections = await db.select().from(onboardingSectionsTable).where(inArray(onboardingSectionsTable.programId, programIds)).orderBy(asc(onboardingSectionsTable.sortOrder));
  const sectionIds = sections.map((s) => s.id);
  const items = sectionIds.length
    ? await db.select().from(onboardingItemsTable).where(inArray(onboardingItemsTable.sectionId, sectionIds)).orderBy(asc(onboardingItemsTable.sortOrder))
    : [];

  const formIds = items.filter((i) => i.formId != null).map((i) => i.formId!);
  const docIds = items.filter((i) => i.workDocumentId != null).map((i) => i.workDocumentId!);
  const [forms, docs, mySubmissions, myAcks] = await Promise.all([
    formIds.length ? db.select({ id: formsTable.id, title: formsTable.title, slug: formsTable.slug }).from(formsTable).where(inArray(formsTable.id, formIds)) : [],
    docIds.length ? db.select({ id: workDocumentsTable.id, title: workDocumentsTable.title }).from(workDocumentsTable).where(inArray(workDocumentsTable.id, docIds)) : [],
    formIds.length ? db.select({ formId: formSubmissionsTable.formId }).from(formSubmissionsTable).where(eq(formSubmissionsTable.submittedBy, staffName)) : [],
    docIds.length ? db.select({ documentId: workDocumentAcknowledgmentsTable.documentId }).from(workDocumentAcknowledgmentsTable).where(eq(workDocumentAcknowledgmentsTable.staffName, staffName)) : [],
  ]);
  const formById = new Map(forms.map((f) => [f.id, f]));
  const docById = new Map(docs.map((d) => [d.id, d]));
  const submittedFormIds = new Set(mySubmissions.map((s) => s.formId));
  const ackedDocIds = new Set(myAcks.map((a) => a.documentId));

  const itemsBySection = new Map<number, typeof items>();
  for (const item of items) itemsBySection.set(item.sectionId, [...(itemsBySection.get(item.sectionId) ?? []), item]);
  const sectionsByProgram = new Map<number, typeof sections>();
  for (const s of sections) sectionsByProgram.set(s.programId, [...(sectionsByProgram.get(s.programId) ?? []), s]);

  const result = myPrograms.map((program) => ({
    id: program.id,
    title: program.title,
    sections: (sectionsByProgram.get(program.id) ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      items: (itemsBySection.get(s.id) ?? []).map((i) => {
        if (i.itemType === "form") {
          const form = i.formId != null ? formById.get(i.formId) : null;
          return { id: i.id, itemType: "form" as const, title: form?.title ?? "(deleted form)", slug: form?.slug ?? null, completed: i.formId != null && submittedFormIds.has(i.formId) };
        }
        const doc = i.workDocumentId != null ? docById.get(i.workDocumentId) : null;
        return { id: i.id, itemType: "policy_signoff" as const, title: doc?.title ?? "(deleted document)", documentId: i.workDocumentId, completed: i.workDocumentId != null && ackedDocIds.has(i.workDocumentId) };
      }),
    })),
  }));

  res.json(result);
});

export default router;
