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
  moduleType: text("module_type").notNull().default("lesson"), // lesson | quiz -- lesson content/description lives in `content`; if the module also has quiz questions (see trainingQuizQuestionsTable), a "Take Quiz" flow appears in addition to any content/video
  content: text("content"), // full lesson text (Module Overview etc), plain text -- optional so a module can still be just a title+link pointing elsewhere
  externalUrl: text("external_url"), // optional link out to the actual video/content (e.g. on Myagi)
  passThresholdPercent: integer("pass_threshold_percent").notNull().default(100), // matches source exports ("A score of 100% is required to pass") -- only relevant if the module has quiz questions
  requiresFullViewing: boolean("requires_full_viewing").notNull().default(false), // matches source export text ("videos may be paused, however progress is not saved and skipping is disabled") -- shown as a notice on the intro screen; a real technical seek-block isn't achievable with a standard YouTube embed (no such embed option exists), so this is honest UI copy, not an enforced restriction
  sortOrder: integer("sort_order").notNull().default(0),
});

// Real, structured quiz questions -- separate from trainingModulesTable.content
// (which is just descriptive lesson text) so an attempt can actually be
// scored server-side, rather than a person reading "(correct)" markers off
// plain text. questionType 'text' (free-text/scenario questions, as seen in
// the M.A.T.C.H export) is intentionally never auto-scored -- correctOptionIndices
// stays empty for those, and they're excluded from the score calculation
// entirely (see routes/training.ts quiz submit handler), shown to the grader
// as a reflection prompt rather than marked right/wrong.
export const trainingQuizQuestionTypeSchema = z.enum(["single", "multi", "text"]);
export const trainingQuizQuestionsTable = pgTable("training_quiz_questions", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().default("single"), // single | multi | text
  options: text("options").array().notNull().default([]), // empty for 'text' type
  correctOptionIndices: integer("correct_option_indices").array().notNull().default([]), // empty for 'text' type
  sortOrder: integer("sort_order").notNull().default(0),
});

// One row per completed attempt (not per in-progress draft) -- staffName-keyed,
// same reasoning as moduleProgressTable. A person can retake and re-pass;
// history isn't deleted, the most recent attempt is what module_progress
// reflects.
export const trainingQuizAttemptsTable = pgTable("training_quiz_attempts", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  staffName: text("staff_name").notNull(),
  scorePercent: integer("score_percent").notNull(), // out of the auto-scorable (non-text) questions only
  passed: boolean("passed").notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
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
export type TrainingQuizQuestion = typeof trainingQuizQuestionsTable.$inferSelect;
export type TrainingQuizAttempt = typeof trainingQuizAttemptsTable.$inferSelect;
export type TrainingRoleAssignment = typeof trainingRoleAssignmentsTable.$inferSelect;
export type TrainingUserAssignment = typeof trainingUserAssignmentsTable.$inferSelect;
export type TrainingGroupAssignment = typeof trainingGroupAssignmentsTable.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;

export const moduleStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
