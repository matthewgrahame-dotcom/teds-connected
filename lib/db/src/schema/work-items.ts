import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const workItemsTable = pgTable("work_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  owner: text("owner"),
  dueDate: date("due_date", { mode: "string" }),
  category: text("category").notNull().default("Operations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  workItemId: integer("work_item_id"),
});

export const insertWorkItemSchema = createInsertSchema(workItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;
export type WorkItem = typeof workItemsTable.$inferSelect;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;