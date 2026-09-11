import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type StaffSession = {
  name: string;
  level: string;
  store: string | null;
  allowedTools?: string[];
  crossAppToken?: string | null;
};

const STORAGE_KEY = 'connected_staff_session';

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

type AuthContextValue = {
  session: StaffSession | null;
  ready: boolean;
  loginError: string | null;
  loggingIn: boolean;
  login: (code: string, initials: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

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
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    writeStoredSession(null);
  }, []);

  const value = useMemo(() => ({ session, ready, loginError, loggingIn, login, logout }), [session, ready, loginError, loggingIn, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
