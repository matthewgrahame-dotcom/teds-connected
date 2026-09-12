import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { portalUsersTable } from "./portal-users";

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

// The Key Contacts dashboard widget -- points at a real portal_users row
// rather than holding its own freeform name/role text. Matches the old
// system's own "Key Contacts" admin screen, which is genuinely just a
// picker of existing users (a Name column + a delete action, nothing
// else editable there) -- name, job title, and location all come live
// from that person's actual record, so they can't drift out of sync the
// way the old hardcoded/freeform version could. photoUrl stays a field
// here since neither portal_users nor portal_user_profiles has a photo
// anywhere else in the system. phone/email are optional overrides for
// when the public-facing contact detail should differ from what's on
// their internal profile (e.g. a reception line instead of a personal
// mobile) -- null means "fall back to their profile's phone / their
// account email" at read time.
export const keyContactsTable = pgTable("key_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => portalUsersTable.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"),
  phoneOverride: text("phone_override"),
  emailOverride: text("email_override"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
