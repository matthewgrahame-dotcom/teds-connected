import { Router, type IRouter } from "express";
import { eq, gt } from "drizzle-orm";
import { db, newsArticlesTable, notificationReadStateTable } from "@workspace/db";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

type PhocalMessage = { id: string; fromLocation: string; fromName?: string | null; messageText: string; isAnnouncement: boolean; postedAt: string };

async function fetchTedsTalksMessages(): Promise<PhocalMessage[]> {
  const resp = await fetch(`${PHOCAL_BASE_URL}/api/chat-messages`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return Array.isArray(data) ? data : (data.messages ?? []);
}

// GET /api/notifications/summary -- unread counts + a short preview list for
// News and Ted's Talks, "unread" meaning posted after this person's last
// visit to the bell. A brand-new user (no read-state row yet) gets a row
// created with both timestamps set to now, rather than being shown the
// entire historical backlog as "new" the first time this ships.
router.get("/notifications/summary", requireSession, async (req, res) => {
  const staffName = req.sessionPayload!.name;

  const [state] = await db.select().from(notificationReadStateTable).where(eq(notificationReadStateTable.staffName, staffName));

  if (!state) {
    const now = new Date();
    await db.insert(notificationReadStateTable).values({ staffName, lastSeenNewsAt: now, lastSeenTedsTalksAt: now });
    res.json({ newsCount: 0, tedsTalksCount: 0, newsPreview: [], tedsTalksPreview: [] });
    return;
  }

  const lastSeenNews = state.lastSeenNewsAt ?? new Date(0);
  const lastSeenTedsTalks = state.lastSeenTedsTalksAt ?? new Date(0);

  const newNews = await db
    .select({ id: newsArticlesTable.id, title: newsArticlesTable.title, createdAt: newsArticlesTable.createdAt })
    .from(newsArticlesTable)
    .where(gt(newsArticlesTable.createdAt, lastSeenNews));

  const allMessages = await fetchTedsTalksMessages();
  const newMessages = allMessages.filter((m) => new Date(m.postedAt) > lastSeenTedsTalks);

  res.json({
    newsCount: newNews.length,
    tedsTalksCount: newMessages.length,
    newsPreview: newNews.slice(0, 3).map((n) => ({ id: n.id, title: n.title })),
    tedsTalksPreview: newMessages.slice(0, 3).map((m) => ({ id: m.id, fromName: m.fromName ?? m.fromLocation, messageText: m.messageText })),
  });
});

// POST /api/notifications/mark-seen { which: 'news' | 'tedsTalks' | 'all' }
router.post("/notifications/mark-seen", requireSession, async (req, res) => {
  const staffName = req.sessionPayload!.name;
  const which = req.body?.which;
  if (which !== "news" && which !== "tedsTalks" && which !== "all") {
    res.status(400).json({ error: "which must be 'news', 'tedsTalks', or 'all'" });
    return;
  }

  const now = new Date();
  const set: Partial<typeof notificationReadStateTable.$inferInsert> = {};
  if (which === "news" || which === "all") set.lastSeenNewsAt = now;
  if (which === "tedsTalks" || which === "all") set.lastSeenTedsTalksAt = now;

  await db
    .insert(notificationReadStateTable)
    .values({ staffName, lastSeenNewsAt: now, lastSeenTedsTalksAt: now })
    .onConflictDoUpdate({ target: notificationReadStateTable.staffName, set });

  res.json({ ok: true });
});

export default router;
