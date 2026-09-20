import { Router, type IRouter, type Request, type Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router: IRouter = Router();

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const OVERRIDE_FILE = path.join(DATA_DIR, "recent-roundup-override.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read override from file
function getOverride(): string | null {
  try {
    ensureDataDir();
    if (fs.existsSync(OVERRIDE_FILE)) {
      const content = fs.readFileSync(OVERRIDE_FILE, "utf-8");
      const data = JSON.parse(content);
      return data.roundup || null;
    }
  } catch (error) {
    console.error("Error reading roundup override:", error);
  }
  return null;
}

// Write override to file
function setOverride(roundup: string): void {
  try {
    ensureDataDir();
    fs.writeFileSync(OVERRIDE_FILE, JSON.stringify({ roundup, updatedAt: new Date().toISOString() }, null, 2));
  } catch (error) {
    console.error("Error writing roundup override:", error);
    throw error;
  }
}

// Backs the "What's New on Teds.com.au" dashboard card. Reads straight
// through to Phocal's own recent-products-roundup cache (same data the
// Product Lookup > Recent Products Roundup tool shows, kept fresh by
// Phocal's weekly cron) rather than duplicating any of that generation
// logic here -- Connected has no Shopify/Anthropic credentials of its own
// for this. Same unauthenticated-proxy shape as GET /social-timeline.
//
// If an admin has edited the roundup text via Connected's UI, that override
// is returned instead of Phocal's version.
router.get("/recent-roundup", async (_req: Request, res: Response) => {
  try {
    // Check for locally stored override first
    const override = getOverride();
    if (override) {
      res.json({ roundup: override, isOverride: true });
      return;
    }

    // Fall back to Phocal's cached version
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

// PATCH endpoint to update the roundup text (admin-only edit)
router.patch("/recent-roundup", (req: Request, res: Response) => {
  try {
    const { roundup } = req.body;

    if (typeof roundup !== "string" || roundup.trim().length === 0) {
      return res.status(400).json({ error: "roundup must be a non-empty string" });
    }

    setOverride(roundup);
    res.json({ success: true, roundup, message: "Roundup text updated" });
  } catch (error) {
    console.error("Error updating roundup:", error);
    res.status(500).json({ error: "Failed to update roundup text" });
  }
});

export default router;
