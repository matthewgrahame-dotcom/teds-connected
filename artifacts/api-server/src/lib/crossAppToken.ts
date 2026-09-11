// Mirrors lib/crossAppToken.js in the Phocal (seo-optimiser) repo exactly --
// same algorithm, same env var name, so a token minted by either app
// verifies correctly on the other. If you change one, change both.
import crypto from "node:crypto";

const SECRET = process.env.CROSS_APP_AUTH_SECRET;
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours -- a work shift, not a long-lived credential

export type CrossAppTokenPayload = {
  code: string;
  name: string;
  level: string;
  store: string | null;
  exp?: number;
};

export function signCrossAppToken(payload: Omit<CrossAppTokenPayload, "exp">, ttlMs = DEFAULT_TTL_MS): string | null {
  if (!SECRET) return null;
  const body: CrossAppTokenPayload = { ...payload, exp: Date.now() + ttlMs };
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyCrossAppToken(token: string | undefined | null): CrossAppTokenPayload | null {
  if (!SECRET || !token) return null;
  const [b64, sig] = String(token).split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload: CrossAppTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}
