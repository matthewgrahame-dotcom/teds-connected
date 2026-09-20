import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsArticlesTable, formsTable, formCategoriesTable, formCategoryLinksTable, workDocumentsTable } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// Phocal's own base URL -- same pattern as auth.ts and social-timeline.ts.
const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

// Proxies to Phocal's /api/connected-ai-help, which holds the actual
// ANTHROPIC_API_KEY -- Connected has no AI credentials of its own. The raw
// session token (already verified once here by requireSession) is forwarded
// so Phocal can independently verify it too before spending on a real API
// call -- see that endpoint's own comment for why.
router.post("/ai-help", requireSession, async (req, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const sessionToken = req.header("x-session-token");

  // Grounds "update my most recent article" / "the one about X" style
  // requests in something real -- Phocal has no DB access of its own, so
  // without this the model would have to either guess an id or refuse
  // every update_news_article request outright.
  const recentNewsArticles = await db
    .select({ id: newsArticlesTable.id, title: newsArticlesTable.title, createdAt: newsArticlesTable.createdAt })
    .from(newsArticlesTable)
    .orderBy(desc(newsArticlesTable.createdAt))
    .limit(15);

  // Same reasoning as recentNewsArticles above, for update_form -- lets the
  // model resolve "the WHS form" / "my equipment request form" to a real id
  // instead of guessing.
  const [allForms, allCategories, allLinks] = await Promise.all([
    db.select({ id: formsTable.id, title: formsTable.title }).from(formsTable).where(eq(formsTable.archived, false)),
    db.select({ id: formCategoriesTable.id, name: formCategoriesTable.name }).from(formCategoriesTable),
    db.select().from(formCategoryLinksTable),
  ]);
  const categoryNameById = new Map(allCategories.map((c) => [c.id, c.name]));
  const categoryNamesByForm = new Map<number, string[]>();
  for (const link of allLinks) {
    const list = categoryNamesByForm.get(link.formId) ?? [];
    const name = categoryNameById.get(link.categoryId);
    if (name) list.push(name);
    categoryNamesByForm.set(link.formId, list);
  }
  const existingForms = allForms.map((f) => ({ id: f.id, title: f.title, categoryNames: categoryNamesByForm.get(f.id) ?? [] }));

  // Same reasoning as existingForms above, for create_onboarding_program --
  // onboarding items can only reference a form or a policy/work document
  // that already exists (there's no "invent new content" item type on
  // PUT /onboarding/programs/:id/content), so the model needs real ids to
  // pick from rather than guessing or inventing titles.
  const existingWorkDocuments = await db.select({ id: workDocumentsTable.id, title: workDocumentsTable.title }).from(workDocumentsTable);

  // Grounds "update the Teds.com.au roundup" / "fix the products roundup"
  // style requests -- the roundup itself lives entirely in Phocal's cache
  // (see routes/recent-roundup.ts), so unlike everything above this isn't a
  // DB read, just a best-effort fetch of the same cached copy the dashboard
  // card shows. Failure here shouldn't block the rest of AI Help, so it's
  // swallowed rather than surfaced.
  let recentRoundup: { roundup?: string; savedAt?: string | null } | null = null;
  try {
    const roundupResp = await fetch(`${PHOCAL_BASE_URL}/api/recent-roundup-latest`);
    if (roundupResp.ok) {
      const roundupData = await roundupResp.json();
      if (roundupData?.available && typeof roundupData.roundup === "string") {
        recentRoundup = { roundup: roundupData.roundup, savedAt: roundupData.savedAt ?? null };
      }
    }
  } catch {
    // non-fatal -- AI Help still works for everything else without this
  }

  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/connected-ai-help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history, sessionToken, recentNewsArticles, existingForms, formCategories: allCategories, existingWorkDocuments, recentRoundup }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach the AI help service. Try again shortly." });
  }
});

// Fires Unsplash's required download-tracking ping (see connected-ai-help.js)
// once a photo proposed alongside a create_news_article tool call is
// actually confirmed/used -- separate from the question flow above since no
// Claude call is involved, just forwarding to Phocal (only place the
// UNSPLASH_ACCESS_KEY lives).
router.post("/ai-help/confirm-image", requireSession, async (req, res) => {
  const downloadLocationUrl = typeof req.body?.downloadLocationUrl === "string" ? req.body.downloadLocationUrl : "";
  if (!downloadLocationUrl) {
    res.status(400).json({ error: "Missing downloadLocationUrl" });
    return;
  }
  const sessionToken = req.header("x-session-token");

  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/connected-ai-help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmDownloadLocationUrl: downloadLocationUrl, sessionToken }),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach the AI help service. Try again shortly." });
  }
});

export default router;
