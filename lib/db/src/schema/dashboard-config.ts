import { boolean, integer, pgTable, serial, text, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
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

// The sidebar's own nav items -- previously a hardcoded array in
// AppSidebar.tsx (primaryNav/secondaryNav), now admin-editable the same
// way Quick Links already was, and the actual destination for the
// nav<->dashboard drag-and-drop MOVE (not copy) feature: dragging a nav
// item onto the dashboard deletes its row here and creates one in
// quick_links, and the reverse deletes from quick_links and creates one
// here.
//
// A "group" (Admin, Learn, People in the original hardcoded list) is
// just a row with href=NULL and one or more other rows pointing at it
// via parentId -- there's no separate "is this a group" flag, since
// having children (or not) already fully determines that at render
// time. parentId is nullable AnyPgColumn (not a direct self-reference)
// because drizzle can't infer a table's own column type while still
// defining that same table.
export const navItemsTable = pgTable("nav_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  // Nullable: only top-level items show an icon in the current sidebar
  // (a child link under a group never has its own) -- a NULL here means
  // exactly that, not a data-entry mistake. Falls back to a generic
  // default (see iconRegistry's 'Link' fallback) only in the one case
  // that needs a real value regardless: a child dragged onto the
  // dashboard, becoming a quick_links row, which DOES require an icon.
  icon: text("icon"),
  href: text("href"),
  parentId: integer("parent_id").references((): AnyPgColumn => navItemsTable.id, { onDelete: "cascade" }),
  // 'primary' | 'secondary' in the frontend's own two-list convention
  // (primaryNav appears above the divider, secondaryNav below) -- kept
  // as plain text rather than a Postgres enum so a future third section
  // never needs a migration to add, just a new string value.
  section: text("section").notNull().default("primary"),
  sortOrder: integer("sort_order").notNull().default(0),
  // 'manager' | 'admin' | NULL (NULL = visible to everyone) -- mirrors
  // the frontend's existing NavItem.minTier exactly.
  minTier: text("min_tier"),
  // True only for the one item (Dashboard) that must always exist and
  // can never be dragged away -- without this, an admin could drag the
  // sidebar into a genuinely broken, navigation-less state by accident.
  protected: boolean("protected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The Key Contacts dashboard widget -- points at a real portal_users row
// rather than holding its own freeform name/role text. Matches the old
// system's own "Key Contacts" admin screen, which is genuinely just a
// picker of existing users (a Name column + a delete action, nothing
// else editable there) -- name, job title, and location all come live
// from that person's actual record, so they can't drift out of sync the
// way the old hardcoded/freeform version could. photoUrl/phone/email are
// optional overrides for when the public-facing contact detail should
// differ from what's on their internal profile (e.g. a reception line
// instead of a personal mobile, or a different photo for this public-
// facing list) -- null means "fall back to their profile's photo / phone /
// account email" at read time. Most contacts won't need any override at
// all now that portal_users has its own real photoUrl.
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
