import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, appSettingsTable, quickLinksTable, keyContactsTable, navItemsTable, portalUsersTable, portalUserProfilesTable } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";
import { requireConnectedTier } from "../lib/connectedTiers";

const router: IRouter = Router();

// -- App settings (generic key/value) ---------------------------------

router.get("/app-settings", requireSession, async (_req, res) => {
  const rows = await db.select().from(appSettingsTable).orderBy(asc(appSettingsTable.key));
  res.json(rows);
});

router.get("/app-settings/:key", requireSession, async (req, res) => {
  const key = String(req.params.key);
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  res.json({ key, value: row?.value ?? null });
});

router.put("/app-settings/:key", requireConnectedTier('admin'), async (req, res) => {
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

router.delete("/app-settings/:key", requireConnectedTier('admin'), async (req, res) => {
  const key = String(req.params.key);
  await db.delete(appSettingsTable).where(eq(appSettingsTable.key, key));
  res.json({ ok: true });
});

// -- Quick Links --------------------------------------------------------

router.get("/quick-links", requireSession, async (_req, res) => {
  const links = await db.select().from(quickLinksTable).orderBy(asc(quickLinksTable.sortOrder), asc(quickLinksTable.id));
  res.json(links);
});

router.post("/quick-links", requireConnectedTier('admin'), async (req, res) => {
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

router.patch("/quick-links/:id", requireConnectedTier('admin'), async (req, res) => {
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

router.delete("/quick-links/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid link id" });
    return;
  }
  await db.delete(quickLinksTable).where(eq(quickLinksTable.id, id));
  res.json({ ok: true });
});

// -- Nav items (the sidebar) -----------------------------------------------
// Replaces what used to be a hardcoded array in AppSidebar.tsx. GET
// returns every row unfiltered -- the frontend builds the parent/children
// tree and applies its own minTier filtering client-side (same as it
// always has), rather than this route needing to know about tiers at all.

router.get("/nav-items", requireSession, async (_req, res) => {
  const items = await db.select().from(navItemsTable).orderBy(asc(navItemsTable.sortOrder), asc(navItemsTable.id));
  res.json(items);
});

router.post("/nav-items", requireConnectedTier('admin'), async (req, res) => {
  const { label, icon, href, parentId, section, sortOrder, minTier } = req.body ?? {};
  if (typeof label !== "string" || !label.trim()) {
    res.status(400).json({ error: "label is required" });
    return;
  }
  const [item] = await db
    .insert(navItemsTable)
    .values({
      label: label.trim(),
      icon: typeof icon === "string" && icon.trim() ? icon.trim() : null,
      href: typeof href === "string" && href.trim() ? href.trim() : null,
      parentId: Number.isInteger(parentId) ? parentId : null,
      section: section === "secondary" ? "secondary" : "primary",
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      minTier: minTier === "manager" || minTier === "admin" ? minTier : null,
    })
    .returning();
  res.json({ ok: true, item });
});

router.patch("/nav-items/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid nav item id" });
    return;
  }
  const { label, icon, href, parentId, section, sortOrder, minTier } = req.body ?? {};
  const updates: Partial<typeof navItemsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof label === "string") updates.label = label.trim();
  if (icon === null || typeof icon === "string") updates.icon = icon;
  if (href === null || typeof href === "string") updates.href = href;
  if (parentId === null || Number.isInteger(parentId)) updates.parentId = parentId;
  if (section === "primary" || section === "secondary") updates.section = section;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;
  if (minTier === null || minTier === "manager" || minTier === "admin") updates.minTier = minTier;

  const [item] = await db.update(navItemsTable).set(updates).where(eq(navItemsTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Nav item not found" });
    return;
  }
  res.json({ ok: true, item });
});

router.delete("/nav-items/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid nav item id" });
    return;
  }
  // Server-side enforcement, not just a disabled drag handle in the
  // UI -- the one thing this whole feature is meant to prevent (an
  // admin dragging the sidebar into a genuinely navigation-less state)
  // has to hold even if a request bypasses the frontend entirely.
  const [existing] = await db.select({ protected: navItemsTable.protected }).from(navItemsTable).where(eq(navItemsTable.id, id));
  if (existing?.protected) {
    res.status(403).json({ error: "This nav item is protected and can't be removed." });
    return;
  }
  await db.delete(navItemsTable).where(eq(navItemsTable.id, id));
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
      userPhotoUrl: portalUsersTable.photoUrl,
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
    photoUrl: r.photoUrl ?? r.userPhotoUrl ?? null,
    phone: r.phoneOverride ?? r.phoneNumber ?? null,
    email: r.emailOverride ?? r.email,
    sortOrder: r.sortOrder,
  }));
  res.json(contacts);
});

router.post("/key-contacts", requireConnectedTier('admin'), async (req, res) => {
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

router.patch("/key-contacts/:id", requireConnectedTier('admin'), async (req, res) => {
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

router.delete("/key-contacts/:id", requireConnectedTier('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }
  await db.delete(keyContactsTable).where(eq(keyContactsTable.id, id));
  res.json({ ok: true });
});

export default router;
