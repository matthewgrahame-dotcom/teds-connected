import { Router, type IRouter } from "express";
import { signCrossAppToken, verifyCrossAppToken } from "../lib/crossAppToken";

const router: IRouter = Router();

// Phocal's own base URL -- Connected has no staff data of its own. Login
// here proxies straight to Phocal's existing /api/staff-access, which stays
// the single source of truth for who's who; there is deliberately no copy
// of the staff list in Connected's own database, so the two can't drift.
const PHOCAL_BASE_URL = process.env.PHOCAL_BASE_URL || "https://seo-optimiser.vercel.app";

type StaffAccessLoginResponse = {
  ok?: boolean;
  error?: string;
  name?: string;
  level?: string;
  store?: string | null;
  allowedTools?: string[];
};

router.post("/auth/login", async (req, res) => {
  const { code, initials } = req.body ?? {};
  if (!code || !initials) {
    res.status(400).json({ error: "Code and initials are required" });
    return;
  }

  let data: StaffAccessLoginResponse;
  try {
    const resp = await fetch(`${PHOCAL_BASE_URL}/api/staff-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", code, initials }),
    });
    data = (await resp.json()) as StaffAccessLoginResponse;
    if (!resp.ok || !data.ok) {
      res.status(401).json({ error: data.error || "Code or initials not recognised" });
      return;
    }
  } catch {
    res.status(502).json({ error: "Couldn't reach the staff login service. Try again shortly." });
    return;
  }

  // Also mint a token for the OTHER direction (Connected -> Phocal), so a
  // "Phocal" link from here can carry identity the same way Phocal's
  // "Connected" link does.
  const crossAppToken = signCrossAppToken({
    code: String(code).trim(),
    name: data.name!,
    level: data.level!,
    store: data.store ?? null,
  });

  res.json({
    ok: true,
    name: data.name,
    level: data.level,
    store: data.store ?? null,
    allowedTools: data.allowedTools ?? [],
    crossAppToken,
  });
});

// Silent login when arriving from a Phocal link carrying ?ssoToken=... --
// verifies the signature locally (no network call back to Phocal needed).
router.get("/auth/verify-token", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  const payload = verifyCrossAppToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token missing, invalid, or expired" });
    return;
  }
  // Re-sign a fresh Connected-side token too, so a subsequent click back to
  // Phocal from this same visit also carries identity.
  const crossAppToken = signCrossAppToken({ code: payload.code, name: payload.name, level: payload.level, store: payload.store });
  res.json({ ok: true, name: payload.name, level: payload.level, store: payload.store, crossAppToken });
});

export default router;
