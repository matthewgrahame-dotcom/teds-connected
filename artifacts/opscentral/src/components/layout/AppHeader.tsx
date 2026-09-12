import { useEffect, useRef, useState } from 'react';
import { Bell, CircleUserRound, HelpCircle, ListChecks, LogOut, MousePointer2, Rocket, Search, Settings, User, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import heroBanner from '@/assets/hero-banner.png';

const profileMenuItems = [
  { label: 'My Profile', icon: User, href: '/profile' },
  { label: 'Directory', icon: Users, href: '/people/directory' },
  { label: 'Product Updates', icon: Rocket, href: '/updates' },
  { label: 'System Settings', icon: Settings, href: '/admin/portal-settings' },
] as const;

const guideSections = [
  { title: 'Dashboard', body: "Your homepage — News, Ted's Calendar, Ted's Talks, Quick Links, Key Contacts and more, all in one place." },
  { title: 'News', body: 'Company-wide announcements and updates.' },
  { title: 'Work', body: 'Policies and reference docs, grouped by topic (Operations, HR Handbook, Pronto, etc).' },
  { title: 'Learn', body: 'Training, assessments, and development programs.' },
  { title: 'People', body: 'Forms, performance reviews, onboarding, and other people-ops tools.' },
  { title: 'Admin', body: 'User Management and Portal Settings (full-level staff).' },
  { title: 'Search (top right)', body: 'Searches News, Work hub docs, the Directory, and Quick Links at once.' },
];

export function AppHeader({ userName }: { userName: string }) {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const submitSearch = () => {
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="relative z-30">
      {/* Brand hero band -- the real banner asset, not a recreation */}
      <div className="h-[90px] w-full overflow-hidden bg-primary sm:h-[130px]">
        <img src={heroBanner} alt="Ted's Cameras — Helping you capture life" className="h-full w-full object-cover object-left" />
      </div>

      {/* Utility bar */}
      <div className="flex h-14 items-center justify-between gap-4 bg-foreground px-5 sm:px-10 md:pl-[280px]">
        <p className="truncate text-sm font-semibold text-background">
          Welcome, <span className="font-extrabold">{userName}</span>
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <button type="button" aria-label="Getting started guide" onClick={() => setGuideOpen(true)} className="hidden text-background/70 transition hover:text-background sm:block">
            <MousePointer2 className="h-4 w-4" />
          </button>
          <Link href="/work/op-central-training" aria-label="Help" className="hidden text-background/70 transition hover:text-background sm:block">
            <HelpCircle className="h-5 w-5" />
          </Link>
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/50" />
            <input
              data-testid="input-header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
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

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Getting Started with Connected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {guideSections.map((s) => (
              <div key={s.title}>
                <p className="text-sm font-extrabold text-foreground">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
