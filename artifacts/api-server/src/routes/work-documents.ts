import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, workDocumentsTable, workDocumentAcknowledgmentsTable, portalUsersTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// -- Staff-facing (Work hub) --------------------------------------------

router.get("/work/documents", requireSession, async (req, res) => {
  const categorySlug = typeof req.query.categorySlug === "string" ? req.query.categorySlug : null;
  const staffName = req.sessionPayload!.name;

  const docs = await db
    .select()
    .from(workDocumentsTable)
    .where(categorySlug ? eq(workDocumentsTable.categorySlug, categorySlug) : undefined)
    .orderBy(asc(workDocumentsTable.sortOrder));

  const docIds = docs.map((d) => d.id);
  const myAcks = docIds.length
    ? await db
        .select({ documentId: workDocumentAcknowledgmentsTable.documentId })
        .from(workDocumentAcknowledgmentsTable)
        .where(and(inArray(workDocumentAcknowledgmentsTable.documentId, docIds), eq(workDocumentAcknowledgmentsTable.staffName, staffName)))
    : [];
  const ackedIds = new Set(myAcks.map((a) => a.documentId));

  res.json(docs.map((d) => ({ ...d, acknowledged: ackedIds.has(d.id) })));
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
// Every doc with requiresAcknowledgment=true applies to every active staff
// member -- unlike Training's role/user/group assignment matrix, there's no
// per-policy audience targeting here (nothing in the source export
// suggested one), so "required for everyone" is the simplest honest reading.

async function loadComplianceData() {
  const [requiredDocs, users, acks] = await Promise.all([
    db.select().from(workDocumentsTable).where(eq(workDocumentsTable.requiresAcknowledgment, true)),
    db
      .select({ id: portalUsersTable.id, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, locations: portalUsersTable.locations })
      .from(portalUsersTable)
      .where(eq(portalUsersTable.archived, false)),
    db.select().from(workDocumentAcknowledgmentsTable),
  ]);

  const ackedByStaffAndDoc = new Set(acks.map((a) => `${a.staffName}::${a.documentId}`));
  return { requiredDocs, users, ackedByStaffAndDoc };
}

router.get("/work/reporting/overview", requireFullLevel, async (_req, res) => {
  const { requiredDocs, users, ackedByStaffAndDoc } = await loadComplianceData();
  const totalPossible = requiredDocs.length * users.length;
  let totalAcked = 0;
  for (const u of users) {
    const fullName = `${u.firstName} ${u.lastName}`;
    for (const doc of requiredDocs) if (ackedByStaffAndDoc.has(`${fullName}::${doc.id}`)) totalAcked += 1;
  }
  res.json({ overallCompliancePercent: totalPossible > 0 ? Math.round((totalAcked / totalPossible) * 1000) / 10 : 0 });
});

router.get("/work/reporting/by-location", requireFullLevel, async (_req, res) => {
  const { requiredDocs, users, ackedByStaffAndDoc } = await loadComplianceData();
  const tally = new Map<string, { acked: number; total: number }>();

  for (const u of users) {
    const fullName = `${u.firstName} ${u.lastName}`;
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
  const { requiredDocs, users, ackedByStaffAndDoc } = await loadComplianceData();

  const result = users.map((u) => {
    const fullName = `${u.firstName} ${u.lastName}`;
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
  const { requiredDocs, users, ackedByStaffAndDoc } = await loadComplianceData();

  const result = requiredDocs.map((doc) => {
    let acked = 0;
    for (const u of users) if (ackedByStaffAndDoc.has(`${u.firstName} ${u.lastName}::${doc.id}`)) acked += 1;
    const outstanding = users.length - acked;
    return {
      documentId: doc.id,
      title: doc.title,
      outstanding,
      completedPercent: users.length > 0 ? Math.round((acked / users.length) * 1000) / 10 : 0,
    };
  });

  res.json(result);
});

export default router;
