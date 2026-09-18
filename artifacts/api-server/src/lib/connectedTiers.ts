import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable, portalUsersTable } from "@workspace/db";
import { verifyCrossAppToken } from "./crossAppToken";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Set by requireConnectedTier once it's verified the minimum tier is
      // met -- exposed so a route that needs manager-vs-admin-specific
      // behavior (see e.g. GET /users/:id/profile, GET /work/reporting/by-staff)
      // doesn't need a second, redundant getConnectedTier lookup just to find
      // out which of the two it actually is.
      connectedTier?: ConnectedTier;
    }
  }
}

// Connected's OWN permission tiers -- deliberately separate from Phocal's
// `level` (full/basic), which stays exactly as-is and keeps doing exactly
// what it does today (proving you're a real, currently logged-in staff
// member at all, and gating Phocal's own high-stakes actions like pricing
// and checkout, which only 3 people have). Phocal's `full` is far too
// restrictive to reuse here -- e.g. portal_users already has ~10 people
// with an "Admin" role and 22 Store Managers, almost none of whom are among
// Phocal's 3 -- so Connected needs its own ladder, derived from
// portal_users.role instead.
export const CONNECTED_TIERS = ["basic", "manager", "admin"] as const;
export type ConnectedTier = (typeof CONNECTED_TIERS)[number];
const TIER_RANK: Record<ConnectedTier, number> = { basic: 0, manager: 1, admin: 2 };

const ROLE_TIER_MAP_KEY = "connected_role_tier_map";

// { [role string as it appears in portal_users.role]: ConnectedTier }.
// Stored in the generic app_settings key/value table (same one Outstanding
// Tasks and the Facebook Stream setting already use) as one JSON object,
// rather than a column on portal_users -- this maps a ROLE to a tier, not a
// person to a tier, so it stays correct automatically as people's roles
// change, and one admin edit here re-scopes everyone with that role at
// once. Configured from Portal Settings' "Roles & Access" section.
async function getRoleTierMap(): Promise<Record<string, ConnectedTier>> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, ROLE_TIER_MAP_KEY));
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const valid: Record<string, ConnectedTier> = {};
    for (const [role, tier] of Object.entries(parsed)) {
      if (typeof tier === "string" && (CONNECTED_TIERS as readonly string[]).includes(tier)) valid[role] = tier as ConnectedTier;
    }
    return valid;
  } catch {
    return {};
  }
}

// Debug-only: exposes every intermediate step of getConnectedTier's own
// resolution, rather than just its final answer -- built specifically
// because the final answer alone ("basic") gave no way to tell WHERE in
// the resolution it went wrong when the input data all checked out
// correct on its own (matching name, correct role, correct map entry,
// no duplicates). Mirrors getConnectedTier's exact logic rather than
// calling it, so every intermediate value used along the way is visible.
export async function getConnectedTierDebugInfo(fullName: string) {
  const map = await getRoleTierMap();
  const users = await db.select({ role: portalUsersTable.role, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable);
  const match = users.find((u) => `${u.firstName} ${u.lastName}` === fullName);
  return {
    fullNameReceived: fullName,
    fullNameLength: fullName.length,
    matchFound: !!match,
    matchedRole: match?.role ?? null,
    mapKeys: Object.keys(map),
    mapHasMatchedRole: match ? Object.prototype.hasOwnProperty.call(map, match.role) : null,
    mapLookupResult: match ? (map[match.role] ?? null) : null,
    resolvedTier: match ? (map[match.role] ?? "basic") : "basic",
  };
}

// Resolves a logged-in person to their Connected tier. Matches
// portal_users by exact "firstName lastName" against the session's `name`
// -- same name-matching convention already used throughout this app for
// staffName-keyed data (training progress, calendar RSVPs, work document
// acknowledgments). Defaults to "basic" -- the safe/restrictive tier --
// whenever anything is uncertain: no portal_users match at all, a role
// that isn't in the map yet (a typo, or a genuinely new role nobody's
// configured), or no map configured yet at all. This is deliberate, not a
// placeholder: an unrecognized person or role should never silently end up
// with elevated access.
export async function getConnectedTier(fullName: string): Promise<ConnectedTier> {
  const [map, users] = await Promise.all([getRoleTierMap(), db.select({ role: portalUsersTable.role, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable)]);
  const match = users.find((u) => `${u.firstName} ${u.lastName}` === fullName);
  if (!match) return "basic";
  return map[match.role] ?? "basic";
}

// Express middleware version, mirroring requireFullLevel/requireSession's
// shape in sessionAuth.ts -- verifies the same crossAppToken (still needed
// to know WHO is asking at all), then additionally checks their resolved
// Connected tier meets the minimum. Tiers are ordered (admin implies
// manager implies basic), not an exact-match check, matching how "more
// access" is normally expected to work.
export function requireConnectedTier(minTier: ConnectedTier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("x-session-token");
    const payload = verifyCrossAppToken(token);
    if (!payload) {
      res.status(401).json({ error: "Missing or expired session. Please log in again." });
      return;
    }
    const tier = await getConnectedTier(payload.name);
    if (TIER_RANK[tier] < TIER_RANK[minTier]) {
      res.status(403).json({ error: `This action requires ${minTier}-level Connected access.` });
      return;
    }
    req.sessionPayload = payload;
    req.connectedTier = tier;
    next();
  };
}

// For a manager-tier route that needs to scope its own results (a manager
// sees only their own team, an admin sees everyone) -- looks up the
// CALLER's own locations, using the exact same name-matching convention as
// getConnectedTier (portal_users has no single "full name" column, so this
// matches "firstName lastName" against the full string). Returns an empty
// array (never null/undefined) if the caller has no portal_users match at
// all, so a scoping check like `locations.some(l => callerLocations.includes(l))`
// always safely evaluates to "no overlap" rather than throwing.
export async function getUserLocations(fullName: string): Promise<string[]> {
  const users = await db.select({ locations: portalUsersTable.locations, firstName: portalUsersTable.firstName, lastName: portalUsersTable.lastName }).from(portalUsersTable);
  const person = users.find((u) => `${u.firstName} ${u.lastName}` === fullName);
  return person?.locations ?? [];
}

