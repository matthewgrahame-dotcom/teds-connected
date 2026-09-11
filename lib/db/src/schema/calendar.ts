import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// TODO: once role-based permissions exist, restrict creation to
// Admin/Manager levels (see [[phocal]] staffSession.level) -- deliberately
// open to any logged-in staff member for now, per explicit instruction to
// scope that properly later rather than guess at a permission model now.
export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(), // 'yyyy-MM-dd', local date -- matches TedsCalendarCard's toDateKey()
  time: text("time"),
  location: text("location"),
  createdBy: text("created_by").notNull(), // staffName from the shared Phocal login
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({ id: true, createdAt: true });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
