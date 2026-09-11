import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// A Program is a time-boxed training initiative (e.g. "Canon Full Frame
// Mirrorless Line (Sep-Nov)") made up of individual modules. Native to
// Connected -- NOT synced from Myagi or any other external platform (Myagi
// has no public API), though a module may link out to the real video there.
export const trainingProgramsTable = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date"), // free-text label like "Sep-Nov" is fine for display; not used for date math
  endDate: text("end_date"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainingModulesTable = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  title: text("title").notNull(),
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

export const insertTrainingProgramSchema = createInsertSchema(trainingProgramsTable).omit({ id: true, createdAt: true });
export const insertTrainingModuleSchema = createInsertSchema(trainingModulesTable).omit({ id: true });

export type TrainingProgram = typeof trainingProgramsTable.$inferSelect;
export type TrainingModule = typeof trainingModulesTable.$inferSelect;
export type ModuleProgress = typeof moduleProgressTable.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;

export const moduleStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
