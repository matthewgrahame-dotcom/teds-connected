import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type StaffSession = {
  name: string;
  level: string;
  store: string | null;
  allowedTools?: string[];
  crossAppToken?: string | null;
};

export type ConnectedTier = 'basic' | 'manager' | 'admin';
const CONNECTED_TIER_RANK: Record<ConnectedTier, number> = { basic: 0, manager: 1, admin: 2 };

// For any component gating a nav item, button, or page section by tier --
// mirrors the backend's own TIER_RANK ordering in connectedTiers.ts
// (admin implies manager implies basic). `tier` is nullable since a
// logged-out or not-yet-resolved session has none yet; treated as not
// meeting anything above 'basic' rather than throwing.
export function meetsConnectedTier(tier: ConnectedTier | null, min: ConnectedTier): boolean {
  if (!tier) return false;
  return CONNECTED_TIER_RANK[tier] >= CONNECTED_TIER_RANK[min];
}

const STORAGE_KEY = 'connected_staff_session';
const PREVIEW_KEY = 'connected_preview_as_basic';
const PREVIEW_TIER_KEY = 'connected_preview_tier';

function readStoredPreviewTier(): ConnectedTier | null {
  try {
    const raw = localStorage.getItem(PREVIEW_TIER_KEY);
    return raw === 'basic' || raw === 'manager' || raw === 'admin' ? raw : null;
  } catch {
    return null;
  }
}

function readStoredSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StaffSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. private browsing) -- session just won't persist across reloads.
  }
}

function readStoredPreview(): boolean {
  try {
    return localStorage.getItem(PREVIEW_KEY) === 'true';
  } catch {
    return false;
  }
}

type AuthContextValue = {
  session: StaffSession | null;
  ready: boolean;
  loginError: string | null;
  loggingIn: boolean;
  sessionExpired: boolean;
  login: (code: string, initials: string) => Promise<void>;
  logout: () => void;
  // "Preview as Basic User" -- lets a real full-level admin see what the
  // app looks like for a basic-level person, without actually being one.
  // Only overrides `session.level` as exposed to the REST of the app (every
  // existing `session?.level === 'full'` check across the codebase respects
  // it automatically, with no changes needed anywhere else) -- the real
  // session/crossAppToken underneath is untouched, so this is a UI preview
  // only, not a real permission change. Any admin action attempted while
  // previewing would still actually succeed server-side, since the real
  // token is what's sent -- this shows what a basic user WOULD see, it
  // doesn't sandbox what you can actually do while looking at it.
  isPreviewingBasic: boolean;
  canPreview: boolean; // true only when the REAL underlying session is full-level
  setPreviewAsBasic: (value: boolean) => void;
  // Connected's OWN tier (basic/manager/admin), separate from the Phocal
  // level preview above -- resolved server-side from portal_users.role via
  // Roles & Access, not something the crossAppToken carries. connectedTier
  // is the REAL resolved value; previewConnectedTier is a same-shaped
  // override (same "look without actually becoming" property as
  // isPreviewingBasic above -- a route actually gated by requireConnectedTier
  // would still enforce against the real session, this only changes what
  // tier-aware UI here renders). effectiveConnectedTier is the one
  // components should actually read.
  connectedTier: ConnectedTier | null;
  previewConnectedTier: ConnectedTier | null;
  effectiveConnectedTier: ConnectedTier | null;
  setPreviewConnectedTier: (tier: ConnectedTier | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [realSession, setSession] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [isPreviewingBasic, setIsPreviewingBasic] = useState(readStoredPreview);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [connectedTier, setConnectedTier] = useState<ConnectedTier | null>(null);
  const [previewConnectedTier, setPreviewConnectedTierState] = useState<ConnectedTier | null>(readStoredPreviewTier);
  // Read inside the fetch interceptor below, which is set up once on mount
  // and would otherwise only ever see the session value from that first
  // render -- a ref stays current without re-patching window.fetch on
  // every session change.
  const sessionRef = useRef<StaffSession | null>(null);
  sessionRef.current = realSession;

  // Global 401 detection: every page in this app calls fetch() directly
  // (no shared API client to add this to individually), so this patches
  // window.fetch itself, once, rather than touching every one of those
  // call sites. Only fires when we currently believe we're logged in --
  // a 401 during the login attempt itself (wrong staff code, no session
  // yet) is a completely normal, expected response, not an expired
  // session, and must not trigger this.
  useEffect(() => {
    if ((window.fetch as { __sessionExpiryPatched?: boolean }).__sessionExpiryPatched) return;
    const original = window.fetch.bind(window);
    const patched = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args);
      if (response.status === 401 && sessionRef.current) {
        setSession(null);
        writeStoredSession(null);
        setSessionExpired(true);
      }
      return response;
    };
    (patched as { __sessionExpiryPatched?: boolean }).__sessionExpiryPatched = true;
    window.fetch = patched;
  }, []);

  // On mount: an incoming ?ssoToken= from a Phocal click-through takes
  // priority over whatever's already stored, since it represents the most
  // recent, deliberate "I am this person" signal.
  useEffect(() => {
    const url = new URL(window.location.href);
    const ssoToken = url.searchParams.get('ssoToken');
    if (!ssoToken) {
      setSession(readStoredSession());
      setReady(true);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`/api/auth/verify-token?token=${encodeURIComponent(ssoToken)}`);
        const data = await resp.json();
        if (resp.ok && data.ok) {
          const next: StaffSession = { name: data.name, level: data.level, store: data.store, crossAppToken: data.crossAppToken };
          setSession(next);
          writeStoredSession(next);
        } else {
          setSession(readStoredSession());
        }
      } catch {
        setSession(readStoredSession());
      } finally {
        url.searchParams.delete('ssoToken');
        window.history.replaceState({}, '', url.toString());
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (code: string, initials: string) => {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, initials }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Login failed');
      const next: StaffSession = { name: data.name, level: data.level, store: data.store, allowedTools: data.allowedTools, crossAppToken: data.crossAppToken };
      setSession(next);
      writeStoredSession(next);
      setSessionExpired(false);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    writeStoredSession(null);
    setIsPreviewingBasic(false);
    setSessionExpired(false);
    setPreviewConnectedTierState(null);
    try {
      localStorage.removeItem(PREVIEW_KEY);
      localStorage.removeItem(PREVIEW_TIER_KEY);
    } catch {
      // ignore
    }
  }, []);

  const setPreviewAsBasic = useCallback((value: boolean) => {
    setIsPreviewingBasic(value);
    try {
      if (value) localStorage.setItem(PREVIEW_KEY, 'true');
      else localStorage.removeItem(PREVIEW_KEY);
    } catch {
      // ignore -- preview toggle just won't persist across reloads
    }
  }, []);

  // Fetches the real Connected tier whenever a session appears, and clears
  // it on logout -- resolved fresh from the server (portal_users.role via
  // Roles & Access) rather than derived from anything in the token itself.
  useEffect(() => {
    if (!realSession?.crossAppToken) {
      setConnectedTier(null);
      return;
    }
    fetch('/api/me/connected-tier', { headers: { 'X-Session-Token': realSession.crossAppToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setConnectedTier(data?.tier ?? null))
      .catch(() => setConnectedTier(null));
  }, [realSession?.crossAppToken]);

  const setPreviewConnectedTier = useCallback((tier: ConnectedTier | null) => {
    setPreviewConnectedTierState(tier);
    try {
      if (tier) localStorage.setItem(PREVIEW_TIER_KEY, tier);
      else localStorage.removeItem(PREVIEW_TIER_KEY);
    } catch {
      // ignore -- preview toggle just won't persist across reloads
    }
  }, []);

  const canPreview = realSession?.level === 'full';
  // Only actually override level while genuinely eligible (a real
  // full-level session) -- if the real session were ever basic already,
  // or logged out, previewing "as basic" would be meaningless/could mask a
  // real permissions bug, so it only applies on top of real full access.
  const session: StaffSession | null = useMemo(() => {
    if (!realSession) return null;
    if (isPreviewingBasic && canPreview) return { ...realSession, level: 'basic' };
    return realSession;
  }, [realSession, isPreviewingBasic, canPreview]);

  const effectiveConnectedTier = previewConnectedTier ?? connectedTier;

  const value = useMemo(
    () => ({
      session, ready, loginError, loggingIn, sessionExpired, login, logout,
      isPreviewingBasic, canPreview, setPreviewAsBasic,
      connectedTier, previewConnectedTier, effectiveConnectedTier, setPreviewConnectedTier,
    }),
    [session, ready, loginError, loggingIn, sessionExpired, login, logout,
     isPreviewingBasic, canPreview, setPreviewAsBasic,
     connectedTier, previewConnectedTier, effectiveConnectedTier, setPreviewConnectedTier],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
