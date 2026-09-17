import { Router, type IRouter } from "express";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

// Backs "Report an Issue / Make a Suggestion" (part of the Ted's Talks
// card). Writes straight through to Phocal's staff_reports data via its
// dedicated /api/staff-reports endpoint, same proxy shape as
// social-timeline.ts -- this IS the same Staff Reports list Matt reviews in
// Phocal, not a separate Connected-only copy. No productId/sku/productTitle
// sent (those are specific to Phocal's own Product Lookup "flag an issue"
// button) -- Phocal's Staff Reports page already handles a report that
// arrives without them.
router.post("/staff-reports", requireSession, async (req, res) => {
  const { issueText, reportType } = req.body ?? {};
  if (typeof issueText !== "string" || !issueText.trim()) {
    res.status(400).json({ error: "issueText is required" });
    return;
  }
  const reporterName = req.sessionPayload!.name;

  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/staff-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_staff_report",
        data: {
          issueText: issueText.trim(),
          reportType: reportType === "suggestion" ? "suggestion" : "issue",
          reporterName,
          source: "connected",
        },
      }),
    });
    const data = (await resp.json()) as { error?: string; ok?: boolean };
    if (!resp.ok) {
      res.status(502).json({ error: data.error || "Couldn't send this to Phocal." });
      return;
    }
    res.json(data);
  } catch {
    res.status(502).json({ error: "Couldn't reach Phocal to send this." });
  }
});

export default router;
