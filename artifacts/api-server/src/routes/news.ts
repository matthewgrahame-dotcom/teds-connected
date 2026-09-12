import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsArticlesTable } from "@workspace/db";
import { requireFullLevel, requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

router.get("/news", requireSession, async (_req, res) => {
  const articles = await db.select().from(newsArticlesTable).orderBy(desc(newsArticlesTable.createdAt));
  res.json(articles);
});

router.get("/news/:id", requireSession, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid article id" });
    return;
  }
  const [article] = await db.select().from(newsArticlesTable).where(eq(newsArticlesTable.id, id));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(article);
});

router.post("/news", requireFullLevel, async (req, res) => {
  const { title, snippet, body, imageUrl, imagePhotographerName, imagePhotographerUrl, linkUrl, tagColor } = req.body ?? {};
  const postedBy = req.sessionPayload!.name;
  if (typeof title !== "string" || !title.trim() || typeof snippet !== "string" || !snippet.trim()) {
    res.status(400).json({ error: "title and snippet are required" });
    return;
  }
  const [article] = await db
    .insert(newsArticlesTable)
    .values({
      title: title.trim(),
      snippet: snippet.trim(),
      body: body?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      imagePhotographerName: imagePhotographerName?.trim() || null,
      imagePhotographerUrl: imagePhotographerUrl?.trim() || null,
      linkUrl: linkUrl?.trim() || null,
      tagColor: tagColor?.trim() || undefined,
      postedBy,
    })
    .returning();
  res.json({ ok: true, article });
});

router.patch("/news/:id", requireFullLevel, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid article id" });
    return;
  }
  const { title, snippet, body, imageUrl, imagePhotographerName, imagePhotographerUrl, linkUrl, tagColor, postedBy } = req.body ?? {};
  const updates: Partial<typeof newsArticlesTable.$inferInsert> = {};
  if (typeof title === "string") updates.title = title.trim();
  if (typeof snippet === "string") updates.snippet = snippet.trim();
  if (typeof body === "string") updates.body = body.trim() || null;
  if (typeof imageUrl === "string") updates.imageUrl = imageUrl.trim() || null;
  if (typeof imagePhotographerName === "string") updates.imagePhotographerName = imagePhotographerName.trim() || null;
  if (typeof imagePhotographerUrl === "string") updates.imagePhotographerUrl = imagePhotographerUrl.trim() || null;
  if (typeof linkUrl === "string") updates.linkUrl = linkUrl.trim() || null;
  if (typeof tagColor === "string") updates.tagColor = tagColor.trim();
  if (typeof postedBy === "string") updates.postedBy = postedBy.trim();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [article] = await db
    .update(newsArticlesTable)
    .set(updates)
    .where(eq(newsArticlesTable.id, id))
    .returning();

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json({ ok: true, article });
});

export default router;
