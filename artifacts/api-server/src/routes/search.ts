import { Router, type IRouter } from "express";
import { ilike, or } from "drizzle-orm";
import { db, newsArticlesTable, portalUsersTable, quickLinksTable } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// Searches News, the staff Directory, and Quick Links server-side (DB-backed
// data). Work hub content is static frontend data (workCategories.ts), so
// that part of the header search is filtered client-side instead -- see
// SearchResultsPage.tsx, which merges both.
router.get("/search", requireSession, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ news: [], users: [], quickLinks: [] });
    return;
  }
  const pattern = `%${q}%`;

  const [news, users, quickLinks] = await Promise.all([
    db
      .select({ id: newsArticlesTable.id, title: newsArticlesTable.title, snippet: newsArticlesTable.snippet })
      .from(newsArticlesTable)
      .where(or(ilike(newsArticlesTable.title, pattern), ilike(newsArticlesTable.snippet, pattern)))
      .limit(8),
    db
      .select({ id: portalUsersTable.id, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName, role: portalUsersTable.role })
      .from(portalUsersTable)
      .where(or(ilike(portalUsersTable.firstName, pattern), ilike(portalUsersTable.lastName, pattern), ilike(portalUsersTable.role, pattern)))
      .limit(8),
    db
      .select({ id: quickLinksTable.id, label: quickLinksTable.label, href: quickLinksTable.href })
      .from(quickLinksTable)
      .where(ilike(quickLinksTable.label, pattern))
      .limit(8),
  ]);

  res.json({ news, users, quickLinks });
});

export default router;
