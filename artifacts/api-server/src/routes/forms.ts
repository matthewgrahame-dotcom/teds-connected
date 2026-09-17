import { Router, type IRouter } from "express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  formsTable,
  formSubmissionsTable,
  formCategoriesTable,
  formCategoryLinksTable,
  formRoleAssignmentsTable,
  formUserAssignmentsTable,
  formViewRoleAssignmentsTable,
  formViewUserAssignmentsTable,
  portalUsersTable,
  trainingAssignmentLevelSchema,
  type FormField,
} from "@workspace/db";
import { requireFullLevel } from "../lib/sessionAuth";
import { verifyCrossAppToken } from "../lib/crossAppToken";

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

const router: IRouter = Router();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Forms default to requiring a Connected login (isPublic=false) same as
// every other form has always worked -- only forms explicitly marked
// public skip this. Applied manually inside each handler (rather than as
// router-level middleware) since the requirement depends on the specific
// form being requested, not the route itself.
function requireSessionUnlessPublic(req: import("express").Request, res: import("express").Response, isPublic: boolean): boolean {
  if (isPublic) return true;
  const payload = verifyCrossAppToken(req.header("x-session-token"));
  if (!payload) {
    res.status(401).json({ error: "Missing or expired session. Please log in again." });
    return false;
  }
  return true;
}

async function attachCategories<T extends { id: number }>(forms: T[]): Promise<(T & { categoryIds: number[]; categoryNames: string[] })[]> {
  if (forms.length === 0) return [];
  const links = await db
    .select({ formId: formCategoryLinksTable.formId, categoryId: formCategoryLinksTable.categoryId, categoryName: formCategoriesTable.name })
    .from(formCategoryLinksTable)
    .innerJoin(formCategoriesTable, eq(formCategoryLinksTable.categoryId, formCategoriesTable.id))
    .where(
      inArray(
        formCategoryLinksTable.formId,
        forms.map((f) => f.id),
      ),
    );
  const byForm = new Map<number, { ids: number[]; names: string[] }>();
  for (const link of links) {
    const entry = byForm.get(link.formId) ?? { ids: [], names: [] };
    entry.ids.push(link.categoryId);
    entry.names.push(link.categoryName);
    byForm.set(link.formId, entry);
  }
  return forms.map((f) => ({ ...f, categoryIds: byForm.get(f.id)?.ids ?? [], categoryNames: byForm.get(f.id)?.names ?? [] }));
}

async function setCategoryLinks(formId: number, categoryIds: number[]) {
  await db.delete(formCategoryLinksTable).where(eq(formCategoryLinksTable.formId, formId));
  if (categoryIds.length > 0) {
    await db.insert(formCategoryLinksTable).values(categoryIds.map((categoryId) => ({ formId, categoryId })));
  }
}

router.get("/forms/categories", async (_req, res) => {
  const categories = await db.select().from(formCategoriesTable).orderBy(asc(formCategoriesTable.sortOrder));
  res.json(categories);
});

// There was previously no way to create a new form category at all --
// FormEditorPage's category pills only ever toggled EXISTING categories
// fetched from the GET route above, with no "add new" control anywhere in
// the UI or a matching write endpoint here. This is that missing write
// path. Idempotent on name (case-sensitive exact match): calling it again
// with a name that already exists just returns that existing row rather
// than erroring or creating a duplicate, since the editor UI calling this
// can't easily know in advance whether a given name already exists.
router.post("/forms/categories", requireFullLevel, async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const trimmed = name.trim();

  const existing = await db.select().from(formCategoriesTable).where(eq(formCategoriesTable.name, trimmed));
  if (existing.length > 0) {
    res.json({ ok: true, category: existing[0] });
    return;
  }

  const [last] = await db.select({ sortOrder: formCategoriesTable.sortOrder }).from(formCategoriesTable).orderBy(desc(formCategoriesTable.sortOrder)).limit(1);
  const nextSortOrder = (last?.sortOrder ?? -1) + 1;

  const [category] = await db.insert(formCategoriesTable).values({ name: trimmed, sortOrder: nextSortOrder }).returning();
  res.json({ ok: true, category });
});

// Staff-facing list: live, non-archived forms only.
router.get("/forms", async (_req, res) => {
  const forms = await db.select().from(formsTable).where(eq(formsTable.archived, false));
  const live = forms.filter((f) => f.status === "live");
  res.json(await attachCategories(live));
});

// Admin list for the editor's own "existing forms" list -- includes drafts,
// which the staff-facing list above deliberately excludes.
router.get("/forms/admin", requireFullLevel, async (_req, res) => {
  const forms = await db.select().from(formsTable).where(eq(formsTable.archived, false));
  res.json(await attachCategories(forms));
});

router.get("/forms/admin/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  const [withCategories] = await attachCategories([form]);
  const [roleAssignments, userAssignments, viewRoleAssignments, viewUserAssignments] = await Promise.all([
    db.select().from(formRoleAssignmentsTable).where(eq(formRoleAssignmentsTable.formId, id)),
    db.select().from(formUserAssignmentsTable).where(eq(formUserAssignmentsTable.formId, id)),
    db.select().from(formViewRoleAssignmentsTable).where(eq(formViewRoleAssignmentsTable.formId, id)),
    db.select().from(formViewUserAssignmentsTable).where(eq(formViewUserAssignmentsTable.formId, id)),
  ]);
  res.json({ ...withCategories, roleAssignments, userAssignments, viewRoleAssignments, viewUserAssignments });
});

// An EMPTY assignment set for a form means unrestricted (any full-level
// admin can view, the pre-existing default) -- as soon as a form has at
// least one row in either table, viewing narrows to just those
// roles/people. Matches staff to portal_users by full name, same
// reconciliation gap as everywhere else in this app that needs it.
async function canViewSubmissions(formId: number, staffName: string): Promise<boolean> {
  const [viewRoles, viewUsers] = await Promise.all([
    db.select().from(formViewRoleAssignmentsTable).where(eq(formViewRoleAssignmentsTable.formId, formId)),
    db.select().from(formViewUserAssignmentsTable).where(eq(formViewUserAssignmentsTable.formId, formId)),
  ]);
  if (viewRoles.length === 0 && viewUsers.length === 0) return true; // unrestricted

  const allUsers = await db.select({ id: portalUsersTable.id, role: portalUsersTable.role, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable);
  const matchedUser = allUsers.find((u) => `${u.firstName} ${u.lastName}` === staffName);
  if (!matchedUser) return false; // can't identify them against the roster -- fail closed

  if (viewRoles.some((r) => r.role === matchedUser.role)) return true;
  if (viewUsers.some((u) => u.userId === matchedUser.id)) return true;
  return false;
}

router.get("/forms/admin/:id/submissions", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const allowed = await canViewSubmissions(id, req.sessionPayload!.name);
  if (!allowed) {
    res.status(403).json({ error: "You don't have permission to view this form's submissions." });
    return;
  }
  const submissions = await db.select().from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, id));
  res.json(submissions);
});

router.get("/forms/:slug", async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, String(req.params.slug)));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  if (!requireSessionUnlessPublic(req, res, form.isPublic)) return;
  res.json(form);
});

// Posts a Ted's Talks message addressed to a specific person when a form
// they're set to be notified about gets a new submission -- reuses the
// exact same shared feed/storage as SocialTimelineCard (Phocal's
// staff_chat_messages KV), just with a toUserName set, which nothing else
// currently sets. Best-effort: a failure here shouldn't fail the
// submission itself, since the submission is already safely recorded by
// the time this runs.
async function notifyFormSubmission(form: { title: string; slug: string; notifyUserName: string | null }, submittedBy: string) {
  if (!form.notifyUserName) return;
  try {
    await fetch(`${PHOCAL_BASE_URL}/api/chat-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_chat_message",
        data: {
          fromLocation: "Connected",
          toUserName: form.notifyUserName,
          messageText: `New submission: **${form.title}** was just submitted by ${submittedBy}. [View it in People > Forms > ${form.title} > View Submissions]`,
          isAnnouncement: false,
        },
      }),
    });
  } catch {
    // best-effort -- the submission itself already succeeded regardless
  }
}

router.post("/forms/:slug/submit", async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, String(req.params.slug)));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  if (!requireSessionUnlessPublic(req, res, form.isPublic)) return;

  const { submittedBy, submitterLocation, data } = req.body ?? {};
  if (typeof submittedBy !== "string" || !submittedBy.trim() || typeof data !== "object" || data === null) {
    res.status(400).json({ error: "submittedBy and data are required" });
    return;
  }

  const missing = form.fields.filter((f) => f.required && !String(data[f.key] ?? "").trim()).map((f) => f.label);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });
    return;
  }

  const [submission] = await db
    .insert(formSubmissionsTable)
    .values({ formId: form.id, submittedBy: submittedBy.trim(), submitterLocation: submitterLocation ?? null, data })
    .returning();

  await notifyFormSubmission(form, submittedBy.trim());

  res.json({ ok: true, submission, thankYouMessage: form.showThankYouMessage ? form.thankYouMessage : null });
});

// Admin-only: who's actually submitted a form and what they said, not
// something every logged-in person should be able to pull for any form.
router.get("/forms/:slug/submissions", requireFullLevel, async (req, res) => {
  const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, String(req.params.slug)));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  const allowed = await canViewSubmissions(form.id, req.sessionPayload!.name);
  if (!allowed) {
    res.status(403).json({ error: "You don't have permission to view this form's submissions." });
    return;
  }
  const submissions = await db.select().from(formSubmissionsTable).where(eq(formSubmissionsTable.formId, form.id));
  res.json(submissions);
});

function parseFields(fields: unknown): FormField[] {
  const validTypes = new Set(["text", "textarea", "number", "currency", "radio", "select", "file"]);
  if (!Array.isArray(fields)) return [];
  return fields.map((f: Partial<FormField> & { label?: string }, i: number) => {
    const label = typeof f?.label === "string" && f.label.trim() ? f.label.trim() : `Field ${i + 1}`;
    return {
      key: typeof f?.key === "string" && f.key.trim() ? f.key.trim() : slugify(label).replace(/-/g, "_"),
      label,
      type: validTypes.has(f?.type as string) ? (f!.type as FormField["type"]) : "text",
      required: Boolean(f?.required),
      options: Array.isArray(f?.options) ? f.options.map(String) : undefined,
      helpText: typeof f?.helpText === "string" ? f.helpText : undefined,
      section: typeof f?.section === "string" ? f.section : undefined,
    };
  });
}

router.post("/forms", requireFullLevel, async (req, res) => {
  const { title, fields, instructions, status, isPublic, groupedFields, showThankYouMessage, thankYouMessage, autoArchive, notifyUserName, categoryIds } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const cleanFields = parseFields(fields);
  if (cleanFields.length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let attempt = 1;
  while ((await db.select({ id: formsTable.id }).from(formsTable).where(eq(formsTable.slug, slug))).length > 0) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const [form] = await db
    .insert(formsTable)
    .values({
      title: title.trim(),
      slug,
      fields: cleanFields,
      instructions: typeof instructions === "string" ? instructions : null,
      status: status === "live" ? "live" : "draft",
      isPublic: Boolean(isPublic),
      groupedFields: Boolean(groupedFields),
      showThankYouMessage: Boolean(showThankYouMessage),
      thankYouMessage: typeof thankYouMessage === "string" ? thankYouMessage : null,
      autoArchive: Boolean(autoArchive),
      notifyUserName: typeof notifyUserName === "string" && notifyUserName.trim() ? notifyUserName.trim() : null,
    })
    .returning();

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    await setCategoryLinks(
      form.id,
      categoryIds.map(Number).filter(Number.isInteger),
    );
  }

  res.json({ ok: true, form });
});

router.patch("/forms/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const { title, fields, instructions, status, isPublic, groupedFields, showThankYouMessage, thankYouMessage, autoArchive, notifyUserName, categoryIds, archived } = req.body ?? {};
  const updates: Partial<typeof formsTable.$inferInsert> = {};
  if (typeof title === "string" && title.trim()) updates.title = title.trim();
  if (fields !== undefined) {
    const cleanFields = parseFields(fields);
    if (cleanFields.length > 0) updates.fields = cleanFields;
  }
  if (instructions !== undefined) updates.instructions = typeof instructions === "string" ? instructions : null;
  if (status === "live" || status === "draft") updates.status = status;
  if (typeof isPublic === "boolean") updates.isPublic = isPublic;
  if (typeof groupedFields === "boolean") updates.groupedFields = groupedFields;
  if (typeof showThankYouMessage === "boolean") updates.showThankYouMessage = showThankYouMessage;
  if (thankYouMessage !== undefined) updates.thankYouMessage = typeof thankYouMessage === "string" ? thankYouMessage : null;
  if (typeof autoArchive === "boolean") updates.autoArchive = autoArchive;
  if (notifyUserName !== undefined) updates.notifyUserName = typeof notifyUserName === "string" && notifyUserName.trim() ? notifyUserName.trim() : null;
  if (typeof archived === "boolean") updates.archived = archived;

  // categoryIds isn't a column on formsTable -- handle it separately via
  // the join table below, even when it's the only thing being changed.
  if (Object.keys(updates).length === 0 && categoryIds === undefined) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  let form;
  if (Object.keys(updates).length > 0) {
    [form] = await db.update(formsTable).set(updates).where(eq(formsTable.id, id)).returning();
  } else {
    [form] = await db.select().from(formsTable).where(eq(formsTable.id, id));
  }
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  if (Array.isArray(categoryIds)) {
    await setCategoryLinks(
      id,
      categoryIds.map(Number).filter(Number.isInteger),
    );
  }

  const [withCategories] = await attachCategories([form]);
  res.json({ ok: true, form: withCategories });
});

// Required Task assignment matrix -- mirrors PUT
// /training/programs/:id/assignments exactly (role/user, mandatory/optional
// levels), minus groups to keep scope contained. Surfaced via GET /tasks.
router.put("/forms/:id/assignments", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const { roles, users } = req.body ?? {};
  const cleanRoles = Array.isArray(roles) ? roles.filter((r) => typeof r?.role === "string" && r.role.trim() && trainingAssignmentLevelSchema.safeParse(r.level).success) : [];
  const cleanUsers = Array.isArray(users) ? users.filter((u) => Number.isInteger(Number(u?.userId)) && trainingAssignmentLevelSchema.safeParse(u.level).success) : [];

  await db.transaction(async (tx) => {
    await tx.delete(formRoleAssignmentsTable).where(eq(formRoleAssignmentsTable.formId, id));
    await tx.delete(formUserAssignmentsTable).where(eq(formUserAssignmentsTable.formId, id));
    if (cleanRoles.length) await tx.insert(formRoleAssignmentsTable).values(cleanRoles.map((r) => ({ formId: id, role: r.role.trim(), level: r.level })));
    if (cleanUsers.length) await tx.insert(formUserAssignmentsTable).values(cleanUsers.map((u) => ({ formId: id, userId: Number(u.userId), level: u.level })));
  });

  res.json({ ok: true });
});

// Who can view this form's submissions -- an empty set means unrestricted
// (any full-level admin), see canViewSubmissions above.
router.put("/forms/:id/view-permissions", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid form id" });
    return;
  }
  const { roles, userIds } = req.body ?? {};
  const cleanRoles: string[] = Array.isArray(roles) ? roles.filter((r) => typeof r === "string" && r.trim()) : [];
  const cleanUserIds: number[] = Array.isArray(userIds) ? userIds.map(Number).filter(Number.isInteger) : [];

  await db.transaction(async (tx) => {
    await tx.delete(formViewRoleAssignmentsTable).where(eq(formViewRoleAssignmentsTable.formId, id));
    await tx.delete(formViewUserAssignmentsTable).where(eq(formViewUserAssignmentsTable.formId, id));
    if (cleanRoles.length) await tx.insert(formViewRoleAssignmentsTable).values(cleanRoles.map((role) => ({ formId: id, role })));
    if (cleanUserIds.length) await tx.insert(formViewUserAssignmentsTable).values(cleanUserIds.map((userId) => ({ formId: id, userId })));
  });

  res.json({ ok: true });
});

export default router;
