import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

// Real, database-backed Work hub documents -- replaces the static
// workCategories.ts array (which had no id, so nothing could attach an
// acknowledgment record to a specific doc). Migrated 1:1 from that file
// (see scripts/seed-work-documents.sql), same fields, same category
// grouping/section headings, same order.
export const workDocumentsTable = pgTable("work_documents", {
  id: serial("id").primaryKey(),
  categorySlug: text("category_slug").notNull(), // matches WorkCategory.slug (welcome, hr-handbook, pronto, etc.)
  title: text("title").notNull(),
  version: text("version"),
  href: text("href"), // the actual PDF/file link -- null when we don't have the file yet
  note: text("note"), // shown instead of/alongside a missing file
  section: text("section"), // groups docs under a heading within a category (e.g. HR Handbook's numbered sections)
  sortOrder: integer("sort_order").notNull().default(0),
  requiresAcknowledgment: boolean("requires_acknowledgment").notNull().default(false), // opt-in per doc, same pattern as calendar's requiresRsvp -- most docs are just reference material, not something HR needs sign-off on
});

// Keyed by staffName, same reasoning as moduleProgressTable/eventRsvpsTable
// (no numeric user id available from the shared Phocal login). One row per
// person per doc they've acknowledged; re-acknowledging (if the doc
// changes) just updates acknowledgedAt rather than creating a new row.
export const workDocumentAcknowledgmentsTable = pgTable(
  "work_document_acknowledgments",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    staffName: text("staff_name").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.documentId, table.staffName)],
);

export type WorkDocument = typeof workDocumentsTable.$inferSelect;
export type WorkDocumentAcknowledgment = typeof workDocumentAcknowledgmentsTable.$inferSelect;
