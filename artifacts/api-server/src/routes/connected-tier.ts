import { Router, type IRouter } from "express";
import { getConnectedTier } from "../lib/connectedTiers";
import { requireSession } from "../lib/sessionAuth";

const router: IRouter = Router();

// Lets the frontend know the current session's resolved Connected tier
// (basic/manager/admin), so UI can react to it -- e.g. the tier-preview
// toggle in AppHeader, and any page/action that gates itself by tier.
// Deliberately its own small endpoint rather than adding a field to an
// existing one: this is resolved fresh from portal_users.role on every
// call rather than cached anywhere, so it reflects the current Roles &
// Access mapping immediately if an admin changes it.
router.get("/me/connected-tier", requireSession, async (req, res) => {
  const tier = await getConnectedTier(req.sessionPayload!.name);
  // sessionName included alongside tier -- getConnectedTier matches by
  // exact "firstName lastName" string against this, so if it silently
  // doesn't match any portal_users record (a nickname vs. a formal name,
  // a typo, anything), the person falls back to "basic" with nothing in
  // the UI explaining why. Exposing the raw name here means that
  // mismatch is actually visible and diagnosable from the browser,
  // rather than just looking like an unexplained wrong tier.
  res.json({ tier, sessionName: req.sessionPayload!.name });
});

export default router;
