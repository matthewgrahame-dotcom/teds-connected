import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// An Onboarding Program is a role-triggered checklist a new starter (or an
// existing staff member moving into a role) works through -- ported from
// the legacy tool's "Onboarding Programs" list (Details/Content/Permissions
// tabs, confirmed from screenshots). Deliberately NOT a fresh content
// model: every checklist item in the source export is either a "Form:" (a
// real form someone submits) or a "Policy Sign-off:" (a document someone
// acknowledges having read) -- both already exist as real, DB-backed
// entities in Connected (formsTable, workDocumentsTable), so
// onboardingItemsTable below just links to one or the other rather than
// duplicating submission/acknowledgment tracking a third time.
export const onboardingProgramStatusSchema = z.enum(["draft", "published", "archived"]);

export const onboardingProgramsTable = pgTable("onboarding_programs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  defaultRoles: text("default_roles").array().notNull().default([]), // matches portal_users.role free text -- anyone in one of these roles gets this program's items on My Tasks (see routes/tasks.ts)
  status: text("status").notNull().default("draft"), // draft | published | archived -- "Active" tab in the source tool is draft+published together, matching Manage Programs' active/archived split
  reminderEmailsEnabled: boolean("reminder_emails_enabled").notNull().default(false),
  reminderIntervalValue: integer("reminder_interval_value").notNull().default(3),
  reminderIntervalUnit: text("reminder_interval_unit").notNull().default("day"), // day | week -- captured/editable per the source export; no scheduled email job exists yet (no email infra at all -- see forms.autoArchive for the same honesty tradeoff), so this doesn't send anything yet
  autoAssignExternal: boolean("auto_assign_external").notNull().default(false), // "Auto Assign to User(s) Created via External Source" in the source tool -- no external HR/candidate-system integration exists, so this is captured but inert, same treatment as reminders above
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Named groups within a program's checklist (e.g. "Required forms to
// complete", "Ted's Cameras Code of Conduct", "Required Reading" in the
// source export).
export const onboardingSectionsTable = pgTable("onboarding_sections", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const onboardingItemTypeSchema = z.enum(["form", "policy_signoff"]);

export const onboardingItemsTable = pgTable("onboarding_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  itemType: text("item_type").notNull().default("form"), // form | policy_signoff
  formId: integer("form_id"), // -> forms.id, set when itemType = 'form'; "completed" = a form_submissions row exists for this staffName (same rule tasks.ts already uses for Required Task forms)
  workDocumentId: integer("work_document_id"), // -> work_documents.id, set when itemType = 'policy_signoff'; "completed" = a work_document_acknowledgments row exists for this staffName
  sortOrder: integer("sort_order").notNull().default(0),
});

// Who sees this program's completion in reporting, beyond the baseline
// "any full-level admin" -- same empty-set-means-unrestricted pattern as
// formViewRoleAssignmentsTable/formViewUserAssignmentsTable. notifyOnCompletion
// is captured per the source export's "Completion Notifications" column but,
// like the reminder fields above, doesn't send anything yet (no email infra).
export const onboardingViewRoleAssignmentsTable = pgTable(
  "onboarding_view_role_assignments",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    role: text("role").notNull(),
    notifyOnCompletion: boolean("notify_on_completion").notNull().default(false),
  },
  (table) => [unique().on(table.programId, table.role)],
);

export const onboardingViewUserAssignmentsTable = pgTable(
  "onboarding_view_user_assignments",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    userId: integer("user_id").notNull(),
    notifyOnCompletion: boolean("notify_on_completion").notNull().default(false),
  },
  (table) => [unique().on(table.programId, table.userId)],
);

export const insertOnboardingProgramSchema = createInsertSchema(onboardingProgramsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOnboardingProgram = z.infer<typeof insertOnboardingProgramSchema>;
export type OnboardingProgram = typeof onboardingProgramsTable.$inferSelect;
export type OnboardingSection = typeof onboardingSectionsTable.$inferSelect;
export type OnboardingItem = typeof onboardingItemsTable.$inferSelect;
