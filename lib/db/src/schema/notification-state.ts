import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per staff member (keyed by staffName like calendar.ts's
// eventRsvpsTable, for the same reason -- no numeric user id available from
// the shared Phocal login). Tracks the last time each person opened the
// notification bell, so unread counts for News and Ted's Talks can be
// computed as "how many since you last checked" without storing per-item
// read state.
export const notificationReadStateTable = pgTable("notification_read_state", {
  staffName: text("staff_name").primaryKey(),
  lastSeenNewsAt: timestamp("last_seen_news_at", { withTimezone: true }),
  lastSeenTedsTalksAt: timestamp("last_seen_teds_talks_at", { withTimezone: true }),
});

export type NotificationReadState = typeof notificationReadStateTable.$inferSelect;
