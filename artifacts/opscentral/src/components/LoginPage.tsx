import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import connectedLogo from '@/assets/connected-logo.png';

export function LoginPage() {
  const { login, loginError, loggingIn } = useAuth();
  const [code, setCode] = useState('');
  const [initials, setInitials] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || !initials.trim()) return;
    login(code.trim(), initials.trim());
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-card-border bg-card p-8 shell-shadow">
        <div className="flex flex-col items-center gap-3 pb-6">
          <img src={connectedLogo} alt="Connected" className="h-16 w-auto" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground/80">Staff code</label>
            <input
              data-testid="input-login-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground/80">Initials</label>
            <input
              data-testid="input-login-initials"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
            />
          </div>
          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          <button
            type="submit"
            data-testid="button-login-submit"
            disabled={loggingIn}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
          >
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Uses the same staff code as Phocal — no separate login to remember.
        </p>
      </div>
    </div>
  );
}
