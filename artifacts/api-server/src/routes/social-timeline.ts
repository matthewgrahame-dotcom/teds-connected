import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

// Reads/writes go straight through to Phocal's staff_chat_messages KV data
// (via its dedicated /api/chat-messages endpoint) rather than keeping a
// separate copy in Connected's own Postgres -- this IS the same feed as
// Phocal's "Ted's Talks", not a look-alike.
router.get("/social-timeline", async (_req, res) => {
  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/chat-messages`);
    if (!resp.ok) {
      res.status(502).json({ error: "Couldn't load the shared timeline right now." });
      return;
    }
    const data = await resp.json();
    res.json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach Phocal to load the shared timeline." });
  }
});

router.post("/social-timeline", async (req, res) => {
  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/chat-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_chat_message", data: req.body }),
    });
    const data = (await resp.json()) as { error?: string; ok?: boolean; message?: unknown };
    if (!resp.ok) {
      res.status(502).json({ error: data.error || "Couldn't post to the shared timeline." });
      return;
    }
    res.json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach Phocal to post to the shared timeline." });
  }
});

export default router;
