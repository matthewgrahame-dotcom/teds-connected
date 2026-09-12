import { integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { portalUsersTable } from "./portal-users";

// "User Group" as seen in the training export's third assignment column
// group (alongside Role and User) -- an arbitrary named set of people an
// admin can assign a training program to as a unit, independent of role.
export const userGroupsTable = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const userGroupMembersTable = pgTable(
  "user_group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => userGroupsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => portalUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.groupId, table.userId)],
);

export type UserGroup = typeof userGroupsTable.$inferSelect;
export type UserGroupMember = typeof userGroupMembersTable.$inferSelect;
