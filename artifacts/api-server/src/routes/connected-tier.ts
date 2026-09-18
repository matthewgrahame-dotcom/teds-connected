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
  res.json({ tier });
});

export default router;
