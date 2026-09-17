import { Router, type IRouter } from "express";

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

export default router;
