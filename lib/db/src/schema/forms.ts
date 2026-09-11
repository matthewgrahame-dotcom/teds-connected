import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// One field's definition within a form. Kept intentionally small -- covers
// every field type seen across the priority forms so far (text inputs,
// long text, radio choices, currency). Extend the "type" union as new
// forms turn up fields that don't fit.
export const formFieldSchema = z.object({
  key: z.string(), // machine key used in submission data, e.g. "magentoOrderNumber"
  label: z.string(), // display label, e.g. "Magento Order Number"
  type: z.enum(["text", "textarea", "number", "currency", "radio", "select", "file"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(), // for radio/select
  helpText: z.string().optional(),
  section: z.string().optional(), // groups fields under a heading, e.g. "Expense Claim 1" -- a run of fields sharing the same section renders as one visual block
});
export type FormField = z.infer<typeof formFieldSchema>;

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // exact live title, e.g. "*WEB ONLY Partial Refund Request"
  slug: text("slug").notNull().unique(), // url-safe key, e.g. "web-only-partial-refund-request"
  fields: jsonb("fields").notNull().$type<FormField[]>(),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  submittedBy: text("submitted_by").notNull(), // staffName from the shared login
  submitterLocation: text("submitter_location"),
  data: jsonb("data").notNull().$type<Record<string, string>>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;
