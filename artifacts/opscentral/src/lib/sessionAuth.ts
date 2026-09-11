import type { StaffSession } from './auth';

/**
 * Header for any request hitting a server-side-gated endpoint (requireSession
 * / requireFullLevel on the api-server side -- see routes/portal-users.ts,
 * routes/dashboard-config.ts). Reuses the same signed crossAppToken already
 * minted at login for Connected<->Phocal SSO; the server verifies its HMAC
 * signature and reads `level` from it directly, so the client can't forge
 * elevated access by editing anything in localStorage.
 */
export function authHeaders(session: StaffSession | null): Record<string, string> {
  return session?.crossAppToken ? { 'X-Session-Token': session.crossAppToken } : {};
}
