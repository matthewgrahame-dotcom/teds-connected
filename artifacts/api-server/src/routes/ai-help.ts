import { Router, type IRouter } from "express";
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
  const sessionToken = req.header("x-session-token");

  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/connected-ai-help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, sessionToken }),
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

export default router;
