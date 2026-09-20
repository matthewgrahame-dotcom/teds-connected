import { Router, type IRouter } from "express";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

// Backs the "What's New on Teds.com.au" dashboard card. Reads straight
// through to Phocal's own recent-products-roundup cache (same data the
// Product Lookup > Recent Products Roundup tool shows, kept fresh by
// Phocal's weekly cron) rather than duplicating any of that generation
// logic here -- Connected has no Shopify/Anthropic credentials of its own
// for this. Same unauthenticated-proxy shape as GET /social-timeline.
router.get("/recent-roundup", async (_req, res) => {
  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/recent-roundup-latest`);
    if (!resp.ok) {
      res.status(502).json({ available: false, error: "Couldn't load the roundup right now." });
      return;
    }
    const data = await resp.json();
    res.json(data);
  } catch {
    res.status(502).json({ available: false, error: "Couldn't reach Phocal to load the roundup." });
  }
});

// Lets staff hand-edit the cached roundup text -- either from the pencil
// icon on the dashboard card itself, or via an AI Help "update_recent_roundup"
// proposal (see routes/ai-help.ts). Connected has no roundup storage of its
// own (see comment above), so this is a straight proxy through to Phocal's
// cache, same as the GET above -- Phocal is the source of truth and its own
// weekly cron can still overwrite this later, same as any other Phocal-side
// edit would.
router.patch("/recent-roundup", requireSession, async (req, res) => {
  const roundup = typeof req.body?.roundup === "string" ? req.body.roundup : "";
  if (!roundup.trim()) {
    res.status(400).json({ error: "Missing roundup text" });
    return;
  }
  const sessionToken = req.header("x-session-token");

  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/recent-roundup-latest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundup, sessionToken }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach Phocal to save the roundup." });
  }
});

export default router;
