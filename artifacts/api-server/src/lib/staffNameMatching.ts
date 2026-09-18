// Every "staffName"-keyed lookup across this app matches a session's
// name (from the shared Phocal login) against portal_users'
// firstName+lastName. Confirmed directly this needs to be
// case-insensitive: a real session name came through from Phocal's
// login as "MATTHEW GRAHAME" (all caps), while portal_users has
// "Matthew Grahame" (proper case) -- a plain === never matched,
// silently falling back to whatever a missing match defaults to (no
// error, nothing visibly wrong) in every one of these lookups, not just
// the one it was first noticed in. Names aren't reliable
// case-sensitive identifiers regardless of why a given session's
// casing differs, so this is the right fix independent of that root
// cause -- and shared here rather than duplicated, so every one of
// these lookups (connectedTiers.ts, tasks.ts, onboarding.ts,
// work-documents.ts, forms.ts) stays consistent with each other.
export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
