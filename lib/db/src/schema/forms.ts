import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
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
  instructions: text("instructions"), // rich-text HTML from the editor, shown above the fields on the submission page
  fields: jsonb("fields").notNull().$type<FormField[]>(),
  archived: boolean("archived").notNull().default(false),
  status: text("status").notNull().default("draft"), // draft | live -- matches the source export's "Save As Draft" vs published distinction; draft forms don't show in the staff-facing list
  isPublic: boolean("is_public").notNull().default(false), // true = no Connected login required to view/submit; false (default) = requires a logged-in session, matching every other form today
  groupedFields: boolean("grouped_fields").notNull().default(false), // true = submission page groups fields under their `section` value with headings, instead of one flat list
  showThankYouMessage: boolean("show_thank_you_message").notNull().default(false),
  thankYouMessage: text("thank_you_message"), // shown after a successful submission when showThankYouMessage is true, instead of the generic confirmation
  autoArchive: boolean("auto_archive").notNull().default(false), // captured/editable per the source export; no defined trigger/schedule exists yet for what "auto" means, so this doesn't do anything behaviorally yet -- see PATCH /forms/:id's comment
  notifyUserName: text("notify_user_name"), // full name of a specific staff member -- when set, a new submission posts a Ted's Talks message addressed to them (see POST /forms/:slug/submit)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Many-to-many: a form can belong to multiple categories (the source export's
// "Form Category(s)" is explicitly plural) -- replaces the old single
// categoryId FK that lived directly on formsTable.
export const formCategoryLinksTable = pgTable(
  "form_category_links",
  {
    id: serial("id").primaryKey(),
    formId: integer("form_id").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => formCategoriesTable.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.formId, table.categoryId)],
);

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