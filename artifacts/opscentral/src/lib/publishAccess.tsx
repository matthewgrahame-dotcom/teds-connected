import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type PublishAccessContextValue = {
  requirePublishAccess: (action: () => void) => void;
};

const PublishAccessContext = createContext<PublishAccessContextValue | null>(null);

/**
 * Mirrors Phocal's requirePublishAccess: once unlocked, stays unlocked for
 * the rest of this browser session (resets on reload) -- same posture as
 * the password gate over there, since this checks the exact same
 * PUBLISH_PASSWORD via Phocal's own /api/verify-publish-password (proxied
 * through Connected's backend so the password itself never needs to live
 * in Connected's own env vars).
 */
export function PublishAccessProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const requirePublishAccess = useCallback(
    (action: () => void) => {
      if (unlocked) {
        action();
        return;
      }
      pendingAction.current = action;
      setPassword('');
      setError(null);
      setOpen(true);
    },
    [unlocked],
  );

  const handleSubmit = async () => {
    setVerifying(true);
    setError(null);
    try {
      const resp = await fetch('/api/social-timeline-verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Incorrect password');
      setUnlocked(true);
      setOpen(false);
      pendingAction.current?.();
      pendingAction.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PublishAccessContext.Provider value={{ requirePublishAccess }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 px-4">
          <div className="w-full max-w-sm rounded-xl border border-card-border bg-card p-6 shell-shadow">
            <p className="mb-1 font-extrabold text-foreground">Enter password</p>
            <p className="mb-4 text-sm text-muted-foreground">Same password used for publishing changes in Phocal.</p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              data-testid="input-publish-password"
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="button-confirm-publish-password"
                onClick={handleSubmit}
                disabled={verifying || !password}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
              >
                {verifying ? 'Checking…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublishAccessContext.Provider>
  );
}

export function usePublishAccess() {
  const ctx = useContext(PublishAccessContext);
  if (!ctx) throw new Error('usePublishAccess must be used within a PublishAccessProvider');
  return ctx;
}
