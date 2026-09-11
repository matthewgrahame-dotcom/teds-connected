// Imports the real user-access list (exported from the legacy admin tool's
// Admin > User Management screen) into the new portal_users table.
//
// Usage:  pnpm --filter @workspace/scripts seed-portal-users
// Requires DATABASE_URL to be set (same as any other db-touching script).
//
// Safe to re-run: uses ON CONFLICT (username) DO NOTHING, so it will only
// insert users that aren't already in the table rather than duplicating or
// clobbering any edits made since the last run.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db, portalUsersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SeedUser = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  locations: string[];
  role: string;
  activated: boolean;
  brand: string;
};

async function main() {
  const dataPath = path.join(__dirname, "data", "portal-users-seed.json");
  const users: SeedUser[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  console.log(`Seeding ${users.length} users into portal_users...`);

  const result = await db
    .insert(portalUsersTable)
    .values(users)
    .onConflictDoNothing({ target: portalUsersTable.username })
    .returning({ id: portalUsersTable.id });

  console.log(`Inserted ${result.length} new user(s). ${users.length - result.length} already existed and were skipped.`);

  const [{ count }] = await db.execute<{ count: string }>(sql`select count(*)::text as count from portal_users`).then((r) => r.rows as { count: string }[]);
  console.log(`Total rows in portal_users now: ${count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
