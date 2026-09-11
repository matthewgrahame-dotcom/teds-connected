import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Generic key/value store for single-value dashboard widget settings that
// don't warrant their own table -- currently just the Facebook Stream page
// URL, but built generic (not facebook_page_url as a dedicated column
// somewhere) so future one-off configurable settings can reuse it without
// another migration.
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The Quick Links dashboard widget's tiles -- previously hardcoded in
// QuickLinksCard.tsx, now editable from the card's own settings action.
// `icon` is a key into the frontend's iconRegistry (see
// components/dashboard/iconRegistry.ts), not a component -- keeps this
// table plain data. `href` can be a normal path/URL, or the literal token
// "phocal:sso" which the frontend resolves to Phocal's URL with the
// current session's cross-app SSO token attached (that part can't be a
// static stored string since it depends on who's logged in).
export const quickLinksTable = pgTable("quick_links", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  href: text("href").notNull(),
  external: boolean("external").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The Key Contacts dashboard widget -- previously hardcoded (name/role
// only, no photo or contact details) in KeyContactsCard.tsx.
export const keyContactsTable = pgTable("key_contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  photoUrl: text("photo_url"),
  phone: text("phone"),
  email: text("email"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
