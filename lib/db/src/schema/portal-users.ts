import { createInsertSchema } from "drizzle-zod";
import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// User accounts for Connected's own Admin > User Management screen --
// ported from a separate legacy admin tool (staff access/permissions list),
// NOT the same thing as the code+initials staff-access data that Phocal
// owns and Connected's login proxies to (see routes/auth.ts). Deliberately
// a distinct table/concept: this is an account directory with roles,
// locations, and activation/archive status, not a login credential store.
export const portalUsersTable = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  locations: text("locations").array().notNull().default([]), // multiple store locations per user, as seen in the source tool
  role: text("role").notNull(), // free text -- source data has messy/inconsistent role names, kept faithful rather than forced into an enum
  activated: boolean("activated").notNull().default(false), // has the user completed account activation (distinct from archived below)
  archived: boolean("archived").notNull().default(false), // soft-delete / "Archived" tab in the source tool, as opposed to "Active"
  brand: text("brand").notNull().default("Ted's Cameras"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPortalUserSchema = createInsertSchema(portalUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortalUser = z.infer<typeof insertPortalUserSchema>;
export type PortalUser = typeof portalUsersTable.$inferSelect;

// Extended HR-style profile, one row per portal_users.id -- deliberately a
// separate table rather than more columns on portal_users, since this is
// materially more sensitive (home address, personal phone, emergency
// contact's own name/phone, tax form status) and only needed when someone
// opens a specific user's full profile, not when loading the list. Ported
// from the legacy tool's per-user "User Details" export.
export const portalUserProfilesTable = pgTable("portal_user_profiles", {
  userId: integer("user_id").primaryKey().references(() => portalUsersTable.id, { onDelete: "cascade" }),
  middleName: text("middle_name"),
  phoneNumber: text("phone_number"),
  jobTitle: text("job_title"),
  homeAddress1: text("home_address_1"),
  homeAddress2: text("home_address_2"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  hiredDate: date("hired_date"),
  manager: text("manager"), // free text, same as the source export -- not an FK, source data doesn't reliably resolve to another portal_users row
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  emergencyContactPhone: text("emergency_contact_phone"),
  tfnFormCompleted: boolean("tfn_form_completed").notNull().default(false), // source: "Tax Declaration & Superannuation Details -- Completed TFN Form"
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PortalUserProfile = typeof portalUserProfilesTable.$inferSelect;
