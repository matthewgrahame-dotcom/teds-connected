import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// Locations management, ported from the previous version of Phocal where
// it lived alongside user management -- a real, structured entity (name,
// type, suburb, state, phone) rather than the free-text location strings
// portal_users.locations holds today. Deliberately not linked to
// portal_users.locations via a foreign key: that column is a text array
// matching a legacy free-text source, kept faithful rather than forced
// into a relation (same reasoning as portal_users.role being free text).
export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  locationType: text("location_type").notNull(), // free text (Retail / Storeroom / Office in the source data) -- not an enum, in case a new type shows up
  suburb: text("suburb"),
  state: text("state"),
  phone: text("phone"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLocationSchema = createInsertSchema(locationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locationsTable.$inferSelect;
