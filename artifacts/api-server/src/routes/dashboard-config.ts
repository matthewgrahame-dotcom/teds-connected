import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, appSettingsTable, quickLinksTable, keyContactsTable } from "@workspace/db";
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

router.get("/key-contacts", requireSession, async (_req, res) => {
  const contacts = await db.select().from(keyContactsTable).orderBy(asc(keyContactsTable.sortOrder), asc(keyContactsTable.id));
  res.json(contacts);
});

router.post("/key-contacts", requireFullLevel, async (req, res) => {
  const { name, role, photoUrl, phone, email, sortOrder } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || typeof role !== "string" || !role.trim()) {
    res.status(400).json({ error: "name and role are required" });
    return;
  }
  const [contact] = await db
    .insert(keyContactsTable)
    .values({
      name: name.trim(),
      role: role.trim(),
      photoUrl: photoUrl?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    })
    .returning();
  res.json({ ok: true, contact });
});

router.patch("/key-contacts/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }
  const { name, role, photoUrl, phone, email, sortOrder } = req.body ?? {};
  const updates: Partial<typeof keyContactsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof name === "string") updates.name = name.trim();
  if (typeof role === "string") updates.role = role.trim();
  if (photoUrl !== undefined) updates.photoUrl = photoUrl?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (email !== undefined) updates.email = email?.trim() || null;
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
