import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// A category used to group forms in the admin/staff-facing lists, e.g.
// "General Forms", "Onboarding Forms". Kept as its own table (rather than
// a hardcoded enum) so categories can be renamed/added/removed later via
// an admin UI without a code deploy.
export const formCategoriesTable = pgTable("form_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormCategorySchema = createInsertSchema(formCategoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFormCategory = z.infer<typeof insertFormCategorySchema>;
export type FormCategory = typeof formCategoriesTable.$inferSelect;