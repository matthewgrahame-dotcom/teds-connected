import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// TODO: same access-control note as calendar_events -- open to any logged-in
// staff member to post for now, per earlier instruction to scope proper
// role-based permissions later rather than guess at a model now.
export const newsArticlesTable = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull(), // shown on the dashboard card + list view
  body: text("body"), // full article text, shown on the article page; optional so a snippet-only post still works
  tagColor: text("tag_color").notNull().default("bg-destructive"), // matches the coloured bar already used in NewsCard
  postedBy: text("posted_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticlesTable).omit({ id: true, createdAt: true });
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticlesTable.$inferSelect;
