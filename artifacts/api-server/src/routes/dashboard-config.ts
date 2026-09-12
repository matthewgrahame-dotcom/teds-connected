import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, appSettingsTable, quickLinksTable, keyContactsTable, portalUsersTable, portalUserProfilesTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// -- App settings (generic key/value) ---------------------------------

router.get("/app-settings/:key", requireSession, async (req, res) => {
  const key = String(req.params.key);
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  res.json({ key, value: row?.value ?? null });
});

router.put("/app-settings/:key", requireFullLevel, async (req, res) => {
  const key = String(req.params.key);
  const { value } = req.body ?? {};
  if (typeof value !== "string") {
    res.status(400).json({ error: "value must be a string" });
    return;
  }
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  res.json({ ok: true, key, value });
});

// -- Quick Links --------------------------------------------------------

router.get("/quick-links", requireSession, async (_req, res) => {
  const links = await db.select().from(quickLinksTable).orderBy(asc(quickLinksTable.sortOrder), asc(quickLinksTable.id));
  res.json(links);
});

router.post("/quick-links", requireFullLevel, async (req, res) => {
  const { label, icon, href, external, sortOrder } = req.body ?? {};
  if (typeof label !== "string" || !label.trim() || typeof icon !== "string" || !icon.trim() || typeof href !== "string" || !href.trim()) {
    res.status(400).json({ error: "label, icon, and href are required" });
    return;
  }
  const [link] = await db
    .insert(quickLinksTable)
    .values({ label: label.trim(), icon: icon.trim(), href: href.trim(), external: Boolean(external), sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 })
    .returning();
  res.json({ ok: true, link });
});

router.patch("/quick-links/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid link id" });
    return;
  }
  const { label, icon, href, external, sortOrder } = req.body ?? {};
  const updates: Partial<typeof quickLinksTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof label === "string") updates.label = label.trim();
  if (typeof icon === "string") updates.icon = icon.trim();
  if (typeof href === "string") updates.href = href.trim();
  if (typeof external === "boolean") updates.external = external;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;

  const [link] = await db.update(quickLinksTable).set(updates).where(eq(quickLinksTable.id, id)).returning();
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }
  res.json({ ok: true, link });
});

router.delete("/quick-links/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid link id" });
    return;
  }
  await db.delete(quickLinksTable).where(eq(quickLinksTable.id, id));
  res.json({ ok: true });
});

// -- Key Contacts ---------------------------------------------------------
// Each row just points at a portal_users id -- name, job title, location,
// and (unless overridden) contact details are joined live from that
// person's actual record at read time, per keyContactsTable's schema
// comment. GET below does the joining/fallback so the frontend just
// renders a flat, ready-to-display shape.

router.get("/key-contacts", requireSession, async (_req, res) => {
  const rows = await db
    .select({
      id: keyContactsTable.id,
      userId: keyContactsTable.userId,
      photoUrl: keyContactsTable.photoUrl,
      phoneOverride: keyContactsTable.phoneOverride,
      emailOverride: keyContactsTable.emailOverride,
      sortOrder: keyContactsTable.sortOrder,
      firstName: portalUsersTable.firstName,
      lastName: portalUsersTable.lastName,
      role: portalUsersTable.role,
      locations: portalUsersTable.locations,
      email: portalUsersTable.email,
      jobTitle: portalUserProfilesTable.jobTitle,
      phoneNumber: portalUserProfilesTable.phoneNumber,
    })
    .from(keyContactsTable)
    .innerJoin(portalUsersTable, eq(keyContactsTable.userId, portalUsersTable.id))
    .leftJoin(portalUserProfilesTable, eq(portalUserProfilesTable.userId, portalUsersTable.id))
    .orderBy(asc(keyContactsTable.sortOrder), asc(keyContactsTable.id));

  const contacts = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: `${r.firstName} ${r.lastName}`,
    title: r.jobTitle ? `${r.jobTitle}${r.locations[0] ? ` at ${r.locations[0]}` : ""}` : r.role,
    photoUrl: r.photoUrl,
    phone: r.phoneOverride ?? r.phoneNumber ?? null,
    email: r.emailOverride ?? r.email,
    sortOrder: r.sortOrder,
  }));
  res.json(contacts);
});

router.post("/key-contacts", requireFullLevel, async (req, res) => {
  const { userId, photoUrl, phoneOverride, emailOverride, sortOrder } = req.body ?? {};
  const uid = Number(userId);
  if (!Number.isInteger(uid)) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const [user] = await db.select({ id: portalUsersTable.id }).from(portalUsersTable).where(eq(portalUsersTable.id, uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  try {
    const [contact] = await db
      .insert(keyContactsTable)
      .values({
        userId: uid,
        photoUrl: photoUrl?.trim() || null,
        phoneOverride: phoneOverride?.trim() || null,
        emailOverride: emailOverride?.trim() || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .returning();
    res.json({ ok: true, contact });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "That person is already a key contact" });
      return;
    }
    throw err;
  }
});

router.patch("/key-contacts/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }
  const { photoUrl, phoneOverride, emailOverride, sortOrder } = req.body ?? {};
  const updates: Partial<typeof keyContactsTable.$inferInsert> = { updatedAt: new Date() };
  if (photoUrl !== undefined) updates.photoUrl = photoUrl?.trim() || null;
  if (phoneOverride !== undefined) updates.phoneOverride = phoneOverride?.trim() || null;
  if (emailOverride !== undefined) updates.emailOverride = emailOverride?.trim() || null;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;

  const [contact] = await db.update(keyContactsTable).set(updates).where(eq(keyContactsTable.id, id)).returning();
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json({ ok: true, contact });
});

router.delete("/key-contacts/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }
  await db.delete(keyContactsTable).where(eq(keyContactsTable.id, id));
  res.json({ ok: true });
});

export default router;
