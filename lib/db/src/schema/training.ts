import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// A Program is a time-boxed training initiative (e.g. "Canon Full Frame
// Mirrorless Line (Sep-Nov)") made up of individual modules. Native to
// Connected -- NOT synced from Myagi or any other external platform (Myagi
// has no public API), though a module may link out to the real video there.
//
// Ported from the legacy "Manage Programs" tool's full field set (export
// confirmed: category, three-state status, prerequisites, time lock,
// recurring, estimated time, recognise-prior-completions, publish date
// separate from last-updated). `status` replaces the old plain `archived`
// boolean with the real three states -- "Enrolled" (see routes) only ever
// shows non-zero once a program is live, matching the source data exactly
// (every Draft row in the export showed Enrolled: 0).
export const trainingProgramStatusSchema = z.enum(["draft", "live", "archived"]);
export const trainingAssignmentLevelSchema = z.enum(["optional", "mandatory"]);

export const trainingProgramsTable = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // free text, matches source data (one category per program, despite the "Category(s)" column header)
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("draft"), // draft | live | archived
  startDate: text("start_date"), // free-text label like "Sep-Nov" is fine for display; not used for date math
  endDate: text("end_date"),
  prerequisitesEnabled: boolean("prerequisites_enabled").notNull().default(false),
  prerequisiteProgramIds: integer("prerequisite_program_ids").array().notNull().default([]),
  prerequisiteConditions: text("prerequisite_conditions"), // free text -- source export has this as a loose text field, not a structured rule
  timeLockEnabled: boolean("time_lock_enabled").notNull().default(false),
  timeLockDetails: text("time_lock_details"), // free text -- exact locking mechanism wasn't specified in the source export beyond an On/Off toggle
  recurringEnabled: boolean("recurring_enabled").notNull().default(false),
  estimatedTimeEnabled: boolean("estimated_time_enabled").notNull().default(false),
  estimatedTime: text("estimated_time"), // e.g. "45 mins" -- free text, only meaningful when estimatedTimeEnabled
  recognizePriorCompletions: boolean("recognize_prior_completions").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }), // set the moment status first becomes 'live'; null while still Draft, matching the source export's "-" Published On for drafts
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const trainingModulesTable = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  title: text("title").notNull(),
  moduleType: text("module_type").notNull().default("lesson"), // lesson | quiz -- quiz content is stored as plain reference text for now (see `content`), not an interactive scored quiz engine
  content: text("content"), // full lesson text or quiz questions, plain text -- optional so a module can still be just a title+link pointing elsewhere
  externalUrl: text("external_url"), // optional link out to the actual video/content (e.g. on Myagi)
  sortOrder: integer("sort_order").notNull().default(0),
});

// Self-reported by each staff member -- keyed by their name from the shared
// Phocal login (see Connected's auth routes), not a numeric user id, since
// that's the only stable identifier the cross-app login currently carries.
export const moduleProgressTable = pgTable(
  "module_progress",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id").notNull(),
    staffName: text("staff_name").notNull(),
    status: text("status").notNull().default("not_started"), // not_started | in_progress | completed
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.moduleId, table.staffName)],
);

// Three assignment axes, matching the source export's Role / User / User
// Group column groups exactly -- kept as separate tables (rather than one
// polymorphic table) for real foreign-key integrity against portal_users
// and userGroupsTable.
export const trainingRoleAssignmentsTable = pgTable(
  "training_role_assignments",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    role: text("role").notNull(), // matches portal_users.role free text (e.g. "Store Manager")
    level: text("level").notNull(), // optional | mandatory
  },
  (table) => [unique().on(table.programId, table.role)],
);

export const trainingUserAssignmentsTable = pgTable(
  "training_user_assignments",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    userId: integer("user_id").notNull(), // -> portal_users.id
    level: text("level").notNull(),
  },
  (table) => [unique().on(table.programId, table.userId)],
);

export const trainingGroupAssignmentsTable = pgTable(
  "training_group_assignments",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull(),
    groupId: integer("group_id").notNull(), // -> userGroupsTable.id
    level: text("level").notNull(),
  },
  (table) => [unique().on(table.programId, table.groupId)],
);

export const insertTrainingProgramSchema = createInsertSchema(trainingProgramsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingModuleSchema = createInsertSchema(trainingModulesTable).omit({ id: true });

export type TrainingProgram = typeof trainingProgramsTable.$inferSelect;
export type TrainingModule = typeof trainingModulesTable.$inferSelect;
export type ModuleProgress = typeof moduleProgressTable.$inferSelect;
export type TrainingRoleAssignment = typeof trainingRoleAssignmentsTable.$inferSelect;
export type TrainingUserAssignment = typeof trainingUserAssignmentsTable.$inferSelect;
export type TrainingGroupAssignment = typeof trainingGroupAssignmentsTable.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;

export const moduleStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
