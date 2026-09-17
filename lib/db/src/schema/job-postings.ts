import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// A job posting shown on the staff-facing Recruiting hub (People >
// Recruiting). Each can optionally link to a specific application Form
// (formSlug) -- if unset, the Recruiting hub falls back to whichever
// form(s) are assigned to the "Recruiting" category, same forms/categories
// system Onboarding and everything else already uses rather than a new
// content model. formSlug is a plain text reference (not a foreign key)
// since forms are looked up by slug everywhere else in this app too.
export const jobPostingStatusSchema = z.enum(["draft", "open", "closed"]);

export const jobPostingsTable = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location"),
  description: text("description"), // rich HTML from RichTextEditor, same convention as forms.instructions
  status: text("status").notNull().default("draft"), // draft | open | closed -- only "open" shows on the staff-facing hub
  formSlug: text("form_slug"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobPostingSchema = createInsertSchema(jobPostingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostingsTable.$inferSelect;
