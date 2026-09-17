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

// Per-role access control, migrated from the old system's real
// Accessible/Required Reading/Notify Users permissions matrix (previously
// nothing in Connected restricted a document by role at all -- every
// document was portal-wide visible with only the blanket
// requiresAcknowledgment flag above). A document with NO rows here is
// unrestricted (visible to everyone, acknowledgment governed by the
// blanket flag) -- same empty-set-means-unrestricted pattern used
// throughout this app (Forms' view permissions, Onboarding's). Only once a
// document has at least one row does per-role filtering actually kick in
// for it, and requiredReading on those rows takes over from the blanket
// flag for that document.
export const workDocumentRoleAccessTable = pgTable(
  "work_document_role_access",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    role: text("role").notNull(),
    accessible: boolean("accessible").notNull().default(true),
    requiredReading: boolean("required_reading").notNull().default(false),
    // Captured from the old system's "Notify Users" column but not wired to
    // anything yet -- there's no "document published/updated" event in
    // Connected to fire a notification from, same honest gap as
    // reminder emails elsewhere (forms.ts, onboarding.ts).
    notifyOnPublish: boolean("notify_on_publish").notNull().default(false),
  },
  (table) => [unique().on(table.documentId, table.role)],
);

export type WorkDocumentRoleAccess = typeof workDocumentRoleAccessTable.$inferSelect;
