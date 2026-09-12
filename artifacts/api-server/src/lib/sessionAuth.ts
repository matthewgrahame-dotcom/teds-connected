import type { NextFunction, Request, Response } from "express";
import { verifyCrossAppToken, type CrossAppTokenPayload } from "./crossAppToken";

// Every write/read endpoint touching admin-only data was previously gated
// ONLY client-side (hide the button, ask for the shared publish password in
// the browser) -- nothing stopped a direct API call. This middleware closes
// that gap using a credential that already exists: the same signed
// crossAppToken minted at login for the Connected<->Phocal SSO handoff. It's
// HMAC-signed server-side (see crossAppToken.ts), so the client can carry it
// but not forge or edit its `level` field -- exactly what's needed here,
// with no new login/token system required.
//
// Sent by the frontend as the X-Session-Token header (see
// lib/sessionAuth.ts on the opscentral side).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionPayload?: CrossAppTokenPayload;
    }
  }
}

export function requireFullLevel(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-session-token");
  const payload = verifyCrossAppToken(token);
  if (!payload) {
    res.status(401).json({ error: "Missing or expired session. Please log in again." });
    return;
  }
  if (payload.level !== "full") {
    res.status(403).json({ error: "This action requires full-level access." });
    return;
  }
  req.sessionPayload = payload;
  next();
}

// Looser check for routes any logged-in staff member should reach (e.g.
// adding a calendar event, posting to Ted's Talks) -- just proves there's a
// real, unexpired session, no level requirement.
export function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-session-token");
  const payload = verifyCrossAppToken(token);
  if (!payload) {
    res.status(401).json({ error: "Missing or expired session. Please log in again." });
    return;
  }
  req.sessionPayload = payload;
  next();
}
