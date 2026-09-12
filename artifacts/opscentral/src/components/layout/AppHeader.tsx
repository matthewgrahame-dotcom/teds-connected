import { useEffect, useRef, useState } from 'react';
import { Bell, CircleUserRound, HelpCircle, ListChecks, LogOut, MousePointer2, Rocket, Search, Settings, User, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import heroBanner from '@/assets/hero-banner.png';

const profileMenuItems = [
  { label: 'My Profile', icon: User, href: '/profile' },
  { label: 'Directory', icon: Users, href: '/people/directory' },
  { label: 'Product Updates', icon: Rocket, href: '/updates' },
  { label: 'System Settings', icon: Settings, href: '/admin/portal-settings' },
] as const;

export function AppHeader({ userName }: { userName: string }) {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <header className="relative z-30">
      {/* Brand hero band -- the real banner asset, not a recreation */}
      <div className="h-[90px] w-full overflow-hidden bg-primary sm:h-[130px]">
        <img src={heroBanner} alt="Ted's Cameras — Helping you capture life" className="h-full w-full object-cover object-left" />
      </div>

      {/* Utility bar */}
      <div className="flex h-14 items-center justify-between gap-4 bg-foreground px-5 sm:px-10">
        <p className="truncate text-sm font-semibold text-background">
          Welcome, <span className="font-extrabold">{userName}</span>
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <MousePointer2 className="hidden h-4 w-4 text-background/70 sm:block" />
          <button type="button" aria-label="Help" className="hidden text-background/70 transition hover:text-background sm:block">
            <HelpCircle className="h-5 w-5" />
          </button>
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/50" />
            <input
              data-testid="input-header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              className="h-9 w-48 rounded-md bg-background/10 pl-9 pr-3 text-sm text-background outline-none placeholder:text-background/50 focus:bg-background/15 lg:w-64"
            />
          </div>
          <button type="button" aria-label="Tasks" className="text-background/70 transition hover:text-background">
            <ListChecks className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Notifications" className="text-background/70 transition hover:text-background">
            <Bell className="h-5 w-5" />
            {/* TODO: wire to a real notifications count once that system exists. Showing an invented number here would be worse than showing none. */}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Profile menu"
              data-testid="button-profile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="text-background/70 transition hover:text-background"
            >
              <CircleUserRound className="h-7 w-7" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-border bg-card py-2 shell-shadow">
                {profileMenuItems.map(({ label, icon: Icon, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </Link>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  data-testid="button-logout"
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
