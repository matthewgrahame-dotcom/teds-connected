import { useState } from 'react';
import { Bell, CircleUserRound, HelpCircle, ListChecks, MousePointer2, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import heroBanner from '@/assets/hero-banner.png';

export function AppHeader({ userName }: { userName: string }) {
  const [search, setSearch] = useState('');
  const { logout } = useAuth();

  return (
    <header className="relative z-30">
      {/* Brand hero band -- the real banner asset, not a recreation */}
      <div className="h-[90px] w-full overflow-hidden bg-primary sm:h-[130px]">
        <img src={heroBanner} alt="Ted's Cameras — Helping you capture life" className="h-full w-full object-cover object-left" />
      </div>

      {/* Utility bar */}
      <div className="flex h-14 items-center justify-between gap-4 bg-foreground px-5 sm:px-10">
        <p className="truncate text-sm font-semibold text-primary-foreground">
          Welcome, <span className="font-extrabold">{userName}</span>
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <MousePointer2 className="hidden h-4 w-4 text-primary-foreground/70 sm:block" />
          <button type="button" aria-label="Help" className="hidden text-primary-foreground/70 transition hover:text-primary-foreground sm:block">
            <HelpCircle className="h-5 w-5" />
          </button>
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/50" />
            <input
              data-testid="input-header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              className="h-9 w-48 rounded-md bg-primary-foreground/10 pl-9 pr-3 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/50 focus:bg-primary-foreground/15 lg:w-64"
            />
          </div>
          <button type="button" aria-label="Tasks" className="text-primary-foreground/70 transition hover:text-primary-foreground">
            <ListChecks className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Notifications" className="relative text-primary-foreground/70 transition hover:text-primary-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground">
              99+
            </span>
          </button>
          <button type="button" aria-label="Sign out" onClick={logout} className="text-primary-foreground/70 transition hover:text-primary-foreground">
            <CircleUserRound className="h-7 w-7" />
          </button>
        </div>
      </div>
    </header>
  );
}
