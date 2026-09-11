import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsArticlesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/news", async (_req, res) => {
  const articles = await db.select().from(newsArticlesTable).orderBy(desc(newsArticlesTable.createdAt));
  res.json(articles);
});

router.get("/news/:id", async (req, res) => {
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

router.post("/news", async (req, res) => {
  const { title, snippet, body, imageUrl, tagColor, postedBy } = req.body ?? {};
  if (typeof title !== "string" || !title.trim() || typeof snippet !== "string" || !snippet.trim() || typeof postedBy !== "string" || !postedBy.trim()) {
    res.status(400).json({ error: "title, snippet, and postedBy are required" });
    return;
  }
  const [article] = await db
    .insert(newsArticlesTable)
    .values({
      title: title.trim(),
      snippet: snippet.trim(),
      body: body?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      tagColor: tagColor?.trim() || undefined,
      postedBy: postedBy.trim(),
    })
    .returning();
  res.json({ ok: true, article });
});

router.patch("/news/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid article id" });
    return;
  }
  const { title, snippet, body, imageUrl, tagColor, postedBy } = req.body ?? {};
  const updates: Partial<typeof newsArticlesTable.$inferInsert> = {};
  if (typeof title === "string") updates.title = title.trim();
  if (typeof snippet === "string") updates.snippet = snippet.trim();
  if (typeof body === "string") updates.body = body.trim() || null;
  if (typeof imageUrl === "string") updates.imageUrl = imageUrl.trim() || null;
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
