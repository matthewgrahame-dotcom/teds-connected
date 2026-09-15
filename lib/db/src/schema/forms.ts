import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { formCategoriesTable } from "./form-categories";

export const formFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "number", "currency", "radio", "select", "file"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  helpText: z.string().optional(),
  section: z.string().optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  fields: jsonb("fields").notNull().$type<FormField[]>(),
  archived: boolean("archived").notNull().default(false),
  categoryId: integer("category_id").references(() => formCategoriesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  submittedBy: text("submitted_by").notNull(),
  submitterLocation: text("submitter_location"),
  data: jsonb("data").notNull().$type<Record<string, string>>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;