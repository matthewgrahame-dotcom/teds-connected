import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, portalUsersTable, portalUserProfilesTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

function parseLocations(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((l) => String(l).trim()).filter(Boolean);
  if (typeof input === "string") return input.split(",").map((l) => l.trim()).filter(Boolean);
  return [];
}

router.get("/users", requireSession, async (req, res) => {
  const archived = req.query.status === "archived";
  const users = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.archived, archived))
    .orderBy(desc(portalUsersTable.createdAt));
  res.json(users);
});

router.get("/users/:id", requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const [user] = await db.select().from(portalUsersTable).where(eq(portalUsersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.post("/users", requireFullLevel, async (req, res) => {
  const { firstName, lastName, username, email, locations, role, activated, brand } = req.body ?? {};
  if (
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof username !== "string" || !username.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof role !== "string" || !role.trim()
  ) {
    res.status(400).json({ error: "firstName, lastName, username, email, and role are required" });
    return;
  }

  try {
    const [user] = await db
      .insert(portalUsersTable)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        locations: parseLocations(locations),
        role: role.trim(),
        activated: Boolean(activated),
        brand: brand?.trim() || undefined,
      })
      .returning();
    res.json({ ok: true, user });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "A user with that username already exists" });
      return;
    }
    throw err;
  }
});

router.patch("/users/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const { firstName, lastName, username, email, locations, role, activated, archived, brand } = req.body ?? {};
  const updates: Partial<typeof portalUsersTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof firstName === "string") updates.firstName = firstName.trim();
  if (typeof lastName === "string") updates.lastName = lastName.trim();
  if (typeof username === "string") updates.username = username.trim();
  if (typeof email === "string") updates.email = email.trim();
  if (locations !== undefined) updates.locations = parseLocations(locations);
  if (typeof role === "string") updates.role = role.trim();
  if (typeof activated === "boolean") updates.activated = activated;
  if (typeof archived === "boolean") updates.archived = archived;
  if (typeof brand === "string") updates.brand = brand.trim();

  try {
    const [user] = await db
      .update(portalUsersTable)
      .set(updates)
      .where(eq(portalUsersTable.id, id))
      .returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ok: true, user });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "A user with that username already exists" });
      return;
    }
    throw err;
  }
});

// -- Extended profile (separate table -- see portal-users.ts schema comment) --

const PROFILE_FIELDS = [
  "middleName",
  "phoneNumber",
  "jobTitle",
  "homeAddress1",
  "homeAddress2",
  "city",
  "state",
  "postcode",
  "country",
  "dateOfBirth",
  "gender",
  "hiredDate",
  "manager",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
] as const;

router.get("/users/:id/profile", requireFullLevel, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const [profile] = await db.select().from(portalUserProfilesTable).where(eq(portalUserProfilesTable.userId, userId));
  res.json(profile ?? { userId, tfnFormCompleted: false });
});

router.put("/users/:id/profile", requireFullLevel, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const [user] = await db.select({ id: portalUsersTable.id }).from(portalUsersTable).where(eq(portalUsersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const values: Partial<typeof portalUserProfilesTable.$inferInsert> = { userId, updatedAt: new Date() };
  for (const field of PROFILE_FIELDS) {
    const raw = req.body?.[field];
    if (raw === undefined) continue;
    values[field] = typeof raw === "string" ? raw.trim() || null : raw;
  }
  if (typeof req.body?.tfnFormCompleted === "boolean") values.tfnFormCompleted = req.body.tfnFormCompleted;

  const [profile] = await db
    .insert(portalUserProfilesTable)
    .values({ userId, tfnFormCompleted: false, ...values })
    .onConflictDoUpdate({ target: portalUserProfilesTable.userId, set: values })
    .returning();
  res.json({ ok: true, profile });
});

export default router;
