import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck, CircleUserRound, GraduationCap, HelpCircle, ListChecks, LogOut, MousePointer2, Rocket, Search, Settings, User, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
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
  { title: 'Tasks (top right)', body: 'Outstanding training and event RSVPs, all in one list.' },
  { title: 'Search (top right)', body: 'Searches News, Work hub docs, the Directory, and Quick Links at once.' },
];

type TrainingTask = { type: 'training'; moduleId: number; title: string; programTitle: string };
type RsvpTask = { type: 'rsvp'; eventId: number; title: string; date: string; time: string | null };

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function AppHeader({ userName }: { userName: string }) {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { session, logout } = useAuth();
  const [, navigate] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const [trainingTasks, setTrainingTasks] = useState<TrainingTask[]>([]);
  const [rsvpTasks, setRsvpTasks] = useState<RsvpTask[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/tasks', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setTrainingTasks(data.trainingTasks);
        setRsvpTasks(data.rsvpTasks);
      })
      .catch(() => {});
  }, [session]);

  const taskCount = trainingTasks.length + rsvpTasks.length;

  useEffect(() => {
    if (!menuOpen && !bellOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
      if (bellOpen && bellRef.current && !bellRef.current.contains(event.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, bellOpen]);

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
          <Link href="/tasks" aria-label="Tasks" className="relative text-background/70 transition hover:text-background">
            <ListChecks className="h-5 w-5" />
            <Badge count={taskCount} />
          </Link>

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setBellOpen((v) => !v)}
              className="relative text-background/70 transition hover:text-background"
            >
              <Bell className="h-5 w-5" />
              <Badge count={taskCount} />
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-border bg-card py-2 shell-shadow">
                <p className="px-4 pb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Things to do</p>
                {taskCount === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">You're all caught up.</p>}
                {rsvpTasks.slice(0, 3).map((t) => (
                  <Link key={`rsvp-${t.eventId}`} href="/tasks" onClick={() => setBellOpen(false)} className="flex items-start gap-2 px-4 py-2 text-sm transition hover:bg-muted">
                    <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block font-semibold text-foreground">{t.title}</span>
                      <span className="text-xs text-muted-foreground">RSVP needed — {t.date}</span>
                    </span>
                  </Link>
                ))}
                {trainingTasks.slice(0, 3).map((t) => (
                  <Link key={`training-${t.moduleId}`} href="/tasks" onClick={() => setBellOpen(false)} className="flex items-start gap-2 px-4 py-2 text-sm transition hover:bg-muted">
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block font-semibold text-foreground">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.programTitle}</span>
                    </span>
                  </Link>
                ))}
                {taskCount > 0 && (
                  <>
                    <div className="my-1 border-t border-border" />
                    <Link href="/tasks" onClick={() => setBellOpen(false)} className="block px-4 py-2 text-center text-sm font-bold text-accent hover:underline">
                      View all tasks
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

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
