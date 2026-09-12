import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, dashboardWidgetsTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

router.get("/dashboard-widgets", requireSession, async (_req, res) => {
  const widgets = await db.select().from(dashboardWidgetsTable).orderBy(asc(dashboardWidgetsTable.column), asc(dashboardWidgetsTable.sortOrder));
  res.json(widgets);
});

// Wholesale replace -- a drag-and-drop reorder produces the full new
// arrangement in one go client-side, so there's no meaningful "patch a
// single widget" operation here the way there is for e.g. Quick Links.
router.put("/dashboard-widgets", requireFullLevel, async (req, res) => {
  const { widgets } = req.body ?? {};
  if (!Array.isArray(widgets)) {
    res.status(400).json({ error: "widgets must be an array" });
    return;
  }
  const rows = widgets
    .filter((w) => typeof w?.widgetKey === "string" && (w.column === "main" || w.column === "sidebar"))
    .map((w, i) => ({ widgetKey: w.widgetKey.trim(), column: w.column, sortOrder: i }));

  if (rows.length === 0) {
    res.status(400).json({ error: "No valid widgets provided" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(dashboardWidgetsTable);
    await tx.insert(dashboardWidgetsTable).values(rows);
  });

  res.json({ ok: true, widgets: rows });
});

export default router;
