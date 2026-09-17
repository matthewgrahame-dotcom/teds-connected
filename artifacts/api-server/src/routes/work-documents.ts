import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, workDocumentsTable, workDocumentAcknowledgmentsTable, workDocumentRoleAccessTable, portalUsersTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// A document with no role-access rows at all is unrestricted (visible to
// everyone, acknowledgment governed by the blanket requiresAcknowledgment
// flag) -- only once a document has real role rows does per-role
// filtering/requirement actually apply to it. A role with no row for a
// restricted document is treated as not accessible / not required, since
// the CSV migration this table is populated from lists every real role
// explicitly for every document it covers.
function resolveForRole<T extends { documentId: number; role: string }>(rows: T[]) {
  const byDoc = new Map<number, Map<string, T>>();
  for (const row of rows) {
    const byRole = byDoc.get(row.documentId) ?? new Map<string, T>();
    byRole.set(row.role, row);
    byDoc.set(row.documentId, byRole);
  }
  return byDoc;
}

// -- Staff-facing (Work hub) --------------------------------------------

router.get("/work/documents", requireSession, async (req, res) => {
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug : null;
  const staffName = req.sessionPayload!.name;
  const isFullLevel = req.sessionPayload!.level === "full";

  const [docs, allUsers] = await Promise.all([
    db
      .select()
      .from(workDocumentsTable)
      .where(categorySlug ? eq(workDocumentsTable.categorySlug, categorySlug) : undefined)
      .orderBy(asc(workDocumentsTable.sortOrder)),
    db.select({ firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, role: portalUsersTable.role }).from(portalUsersTable),
  ]);
  const myRole = allUsers.find((u) => `${u.firstName} ${u.lastName}` === staffName)?.role ?? null;

  const docIds = docs.map((d) => d.id);
  const [myAcks, roleAccessRows] = await Promise.all([
    docIds.length
      ? db
          .select({ documentId: workDocumentAcknowledgmentsTable.documentId })
          .from(workDocumentAcknowledgmentsTable)
          .where(and(inArray(workDocumentAcknowledgmentsTable.documentId, docIds), eq(workDocumentAcknowledgmentsTable.staffName, staffName)))
      : [],
    docIds.length ? db.select().from(workDocumentRoleAccessTable).where(inArray(workDocumentRoleAccessTable.documentId, docIds)) : [],
  ]);
  const ackedIds = new Set(myAcks.map((a) => a.documentId));
  const roleAccessByDoc = resolveForRole(roleAccessRows);

  // A full-level (admin) session always sees everything, regardless of
  // whether their portal_users row can be matched by exact name -- role
  // restriction is a staff-visibility concept, not something that should
  // ever be able to lock an admin out of their own content. This was a
  // real bug: an admin whose logged-in session name didn't exactly match
  // their portal_users firstName+lastName would silently lose access to
  // every role-restricted document, with no error, just an empty category.
  const visible = docs.filter((d) => {
    if (isFullLevel) return true;
    const rolesForDoc = roleAccessByDoc.get(d.id);
    if (!rolesForDoc) return true; // unrestricted
    if (!myRole) return false; // restricted doc, but we don't know the caller's role -- fail closed
    return rolesForDoc.get(myRole)?.accessible ?? false;
  });

  res.json(
    visible.map((d) => {
      const rolesForDoc = roleAccessByDoc.get(d.id);
      const effectiveRequiresAcknowledgment = rolesForDoc ? (myRole ? (rolesForDoc.get(myRole)?.requiredReading ?? false) : false) : d.requiresAcknowledgment;
      return { ...d, requiresAcknowledgment: effectiveRequiresAcknowledgment, acknowledged: ackedIds.has(d.id) };
    }),
  );
});

router.post("/work/documents/:id/acknowledge", requireSession, async (req, res) => {
  const documentId = Number(req.params.id);
  if (!Number.isInteger(documentId)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  const staffName = req.sessionPayload!.name;

  const existing = await db
    .select()
    .from(workDocumentAcknowledgmentsTable)
    .where(and(eq(workDocumentAcknowledgmentsTable.documentId, documentId), eq(workDocumentAcknowledgmentsTable.staffName, staffName)));

  if (existing.length > 0) {
    await db
      .update(workDocumentAcknowledgmentsTable)
      .set({ acknowledgedAt: new Date() })
      .where(and(eq(workDocumentAcknowledgmentsTable.documentId, documentId), eq(workDocumentAcknowledgmentsTable.staffName, staffName)));
  } else {
    await db.insert(workDocumentAcknowledgmentsTable).values({ documentId, staffName });
  }

  res.json({ ok: true });
});

// -- Admin ----------------------------------------------------------------

router.patch("/work/documents/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  const { requiresAcknowledgment } = req.body ?? {};
  if (typeof requiresAcknowledgment !== "boolean") {
    res.status(400).json({ error: "requiresAcknowledgment must be a boolean" });
    return;
  }
  const [doc] = await db.update(workDocumentsTable).set({ requiresAcknowledgment }).where(eq(workDocumentsTable.id, id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json({ ok: true, document: doc });
});

// -- Reporting (Policy Compliance) -----------------------------------------
// A document with role-access rows is only "required" for a user whose role
// has requiredReading=true on that document; a document with no role rows
// at all falls back to the old blanket behavior (required for everyone).
// Previously this was ALWAYS the blanket behavior -- there was no per-role
// targeting at all, unlike Training's role/user/group assignment matrix.

async function loadComplianceData() {
  const [allDocs, users, acks, roleAccessRows] = await Promise.all([
    db.select().from(workDocumentsTable),
    db
      .select({ id: portalUsersTable.id, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, role: portalUsersTable.role, locations: portalUsersTable.locations })
      .from(portalUsersTable)
      .where(eq(portalUsersTable.archived, false)),
    db.select().from(workDocumentAcknowledgmentsTable),
    db.select().from(workDocumentRoleAccessTable),
  ]);

  const roleAccessByDoc = resolveForRole(roleAccessRows);
  const ackedByStaffAndDoc = new Set(acks.map((a) => `${a.staffName}::${a.documentId}`));

  // Precomputes "is doc X required for user Y" for every (user, doc) pair up
  // front, since every reporting endpoint below needs this same check
  // repeatedly and it now depends on the user's role, not just the doc.
  function isRequiredFor(doc: (typeof allDocs)[number], role: string | null) {
    const rolesForDoc = roleAccessByDoc.get(doc.id);
    if (!rolesForDoc) return doc.requiresAcknowledgment;
    if (!role) return false;
    return rolesForDoc.get(role)?.requiredReading ?? false;
  }

  return { allDocs, users, ackedByStaffAndDoc, isRequiredFor };
}

router.get("/work/reporting/overview", requireFullLevel, async (_req, res) => {
  const { allDocs, users, ackedByStaffAndDoc, isRequiredFor } = await loadComplianceData();
  let totalPossible = 0;
  let totalAcked = 0;
  for (const u of users) {
    const fullName = `${u.firstName} ${u.lastName}`;
    for (const doc of allDocs) {
      if (!isRequiredFor(doc, u.role)) continue;
      totalPossible += 1;
      if (ackedByStaffAndDoc.has(`${fullName}::${doc.id}`)) totalAcked += 1;
    }
  }
  res.json({ overallCompliancePercent: totalPossible > 0 ? Math.round((totalAcked / totalPossible) * 1000) / 10 : 0 });
});

router.get("/work/reporting/by-location", requireFullLevel, async (_req, res) => {
  const { allDocs, users, ackedByStaffAndDoc, isRequiredFor } = await loadComplianceData();
  const tally = new Map<string, { acked: number; total: number }>();

  for (const u of users) {
    const fullName = `${u.firstName} ${u.lastName}`;
    const requiredDocs = allDocs.filter((doc) => isRequiredFor(doc, u.role));
    for (const location of u.locations.length ? u.locations : ["(No location set)"]) {
      const bucket = tally.get(location) ?? { acked: 0, total: 0 };
      for (const doc of requiredDocs) {
        bucket.total += 1;
        if (ackedByStaffAndDoc.has(`${fullName}::${doc.id}`)) bucket.acked += 1;
      }
      tally.set(location, bucket);
    }
  }

  const result = Array.from(tally, ([location, { acked, total }]) => ({
    location,
    compliancePercent: total > 0 ? Math.round((acked / total) * 1000) / 10 : 0,
  })).sort((a, b) => a.location.localeCompare(b.location));

  res.json(result);
});

router.get("/work/reporting/by-staff", requireFullLevel, async (_req, res) => {
  const { allDocs, users, ackedByStaffAndDoc, isRequiredFor } = await loadComplianceData();

  const result = users.map((u) => {
    const fullName = `${u.firstName} ${u.lastName}`;
    const requiredDocs = allDocs.filter((doc) => isRequiredFor(doc, u.role));
    let acked = 0;
    for (const doc of requiredDocs) if (ackedByStaffAndDoc.has(`${fullName}::${doc.id}`)) acked += 1;
    return {
      userId: u.id,
      name: fullName,
      compliancePercent: requiredDocs.length > 0 ? Math.round((acked / requiredDocs.length) * 1000) / 10 : 0,
    };
  });

  res.json(result);
});

router.get("/work/reporting/by-policy", requireFullLevel, async (_req, res) => {
  const { allDocs, users, ackedByStaffAndDoc, isRequiredFor } = await loadComplianceData();

  const result = allDocs
    .map((doc) => {
      const requiredForUsers = users.filter((u) => isRequiredFor(doc, u.role));
      if (requiredForUsers.length === 0) return null;
      let acked = 0;
      for (const u of requiredForUsers) if (ackedByStaffAndDoc.has(`${u.firstName} ${u.lastName}::${doc.id}`)) acked += 1;
      return {
        documentId: doc.id,
        title: doc.title,
        outstanding: requiredForUsers.length - acked,
        completedPercent: Math.round((acked / requiredForUsers.length) * 1000) / 10,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  res.json(result);
});

export default router;
