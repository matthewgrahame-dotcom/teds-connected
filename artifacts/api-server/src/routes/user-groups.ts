import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userGroupsTable, userGroupMembersTable, portalUsersTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

router.get("/user-groups", requireSession, async (_req, res) => {
  const groups = await db.select().from(userGroupsTable).orderBy(userGroupsTable.name);
  const members = await db
    .select({ groupId: userGroupMembersTable.groupId, userId: userGroupMembersTable.userId, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName })
    .from(userGroupMembersTable)
    .innerJoin(portalUsersTable, eq(userGroupMembersTable.userId, portalUsersTable.id));

  const membersByGroup = new Map<number, { userId: number; name: string }[]>();
  for (const m of members) {
    const list = membersByGroup.get(m.groupId) ?? [];
    list.push({ userId: m.userId, name: `${m.firstName} ${m.lastName}` });
    membersByGroup.set(m.groupId, list);
  }

  res.json(groups.map((g) => ({ ...g, members: membersByGroup.get(g.id) ?? [] })));
});

router.post("/user-groups", requireFullLevel, async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [group] = await db.insert(userGroupsTable).values({ name: name.trim() }).returning();
    res.json({ ok: true, group });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "A group with that name already exists" });
      return;
    }
    throw err;
  }
});

router.patch("/user-groups/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [group] = await db.update(userGroupsTable).set({ name: name.trim() }).where(eq(userGroupsTable.id, id)).returning();
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json({ ok: true, group });
});

router.delete("/user-groups/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }
  await db.delete(userGroupsTable).where(eq(userGroupsTable.id, id));
  res.json({ ok: true });
});

// Wholesale replace of membership -- a group's member list is edited as a
// unit in the UI (a multi-select of people), so there's no meaningful
// single-member patch operation the way there is for e.g. Quick Links.
router.put("/user-groups/:id/members", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }
  const { userIds } = req.body ?? {};
  if (!Array.isArray(userIds)) {
    res.status(400).json({ error: "userIds must be an array" });
    return;
  }
  const cleanIds = userIds.map(Number).filter(Number.isInteger);

  await db.transaction(async (tx) => {
    await tx.delete(userGroupMembersTable).where(eq(userGroupMembersTable.groupId, id));
    if (cleanIds.length > 0) {
      await tx.insert(userGroupMembersTable).values(cleanIds.map((userId) => ({ groupId: id, userId })));
    }
  });

  res.json({ ok: true });
});

export default router;
