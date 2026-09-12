import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// "Product Updates" entries, shown from the profile menu -- a simple
// in-app changelog Matt can add to himself, not tied to any deploy
// pipeline or release process.
export const changelogEntriesTable = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  postedBy: text("posted_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChangelogEntry = typeof changelogEntriesTable.$inferSelect;
