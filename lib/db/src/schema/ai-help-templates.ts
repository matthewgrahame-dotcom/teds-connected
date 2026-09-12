import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

// Quick-action prompt starters shown as chips above the AI Help input
// (e.g. "Create news item") -- clicking one pre-fills the question box
// with `prompt` rather than submitting immediately, since these are
// starting points that still need person-specific details filled in.
// Admin-editable (add/edit/delete/reorder), same pattern as Quick Links.
export const aiHelpTemplatesTable = pgTable("ai_help_templates", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(), // short button text, e.g. "Create news item"
  prompt: text("prompt").notNull(), // text that fills the input box, e.g. "Create a news article about "
  sortOrder: integer("sort_order").notNull().default(0),
});

export type AiHelpTemplate = typeof aiHelpTemplatesTable.$inferSelect;
