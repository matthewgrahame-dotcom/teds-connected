import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
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
  requiresRsvp: boolean("requires_rsvp").notNull().default(false), // opt-in per event, not every event -- set by whoever creates it
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Keyed by staffName like moduleProgressTable, for the same reason (see
// training.ts schema comment) -- no numeric user id available from the
// shared Phocal login yet.
export const eventRsvpsTable = pgTable(
  "event_rsvps",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    staffName: text("staff_name").notNull(),
    response: text("response").notNull(), // yes | no | maybe
    respondedAt: timestamp("responded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.eventId, table.staffName)],
);

export const rsvpResponseSchema = z.enum(["yes", "no", "maybe"]);

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({ id: true, createdAt: true });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type EventRsvp = typeof eventRsvpsTable.$inferSelect;
