import { useState } from 'react';
import { Bell, Camera, CircleUserRound, HelpCircle, ListChecks, MousePointer2, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AppHeader({ userName }: { userName: string }) {
  const [search, setSearch] = useState('');
  const { logout } = useAuth();

  return (
    <header className="relative z-30">
      {/* Brand hero band */}
      <div className="relative flex h-[120px] overflow-hidden bg-primary sm:h-[150px]">
        <div className="flex flex-1 items-center px-6 sm:px-10">
          <div>
            <div className="flex items-baseline gap-1 text-[28px] font-black italic leading-none tracking-tight text-foreground sm:text-[38px]">
              Ted's Cameras
            </div>
            <p className="mt-1 text-xs font-bold text-foreground/70 sm:text-sm">Helping you capture life</p>
          </div>
        </div>
        {/* TODO: replace with the real lifestyle photo asset */}
        <div className="relative hidden w-[38%] shrink-0 items-center justify-center bg-foreground/90 text-primary-foreground/20 sm:flex">
          <Camera className="h-12 w-12" strokeWidth={1.25} />
        </div>
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
