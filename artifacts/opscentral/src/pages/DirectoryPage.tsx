import { useEffect, useMemo, useState } from 'react';
import { Search, Users as UsersIcon, User as UserIcon, ChevronDown, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type DirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  locations: string[];
  email: string;
};

type Location = { id: number; name: string; locationType: string; suburb: string | null; state: string | null };

// Retail locations (the ones customers actually walk into) surface first,
// then everything else -- Storeroom/Office -- alphabetically within each
// tier. This is a judgment call, not something the person confirmed
// explicitly; easy to change to pure alphabetical if it doesn't feel right.
const TYPE_PRIORITY: Record<string, number> = { Retail: 0 };

function StaffCard({ user }: { user: DirectoryUser }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card shell-shadow transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid aspect-video w-full shrink-0 place-items-center bg-muted text-muted-foreground">
        <UserIcon className="h-8 w-8" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-extrabold leading-snug text-foreground">{user.firstName} {user.lastName}</h2>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">{user.role}</span>
          {user.email && (
            <a
              href={`mailto:${user.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground transition hover:brightness-95"
            >
              <Mail className="h-3 w-3" /> Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('directoryCollapsedLocations') ?? '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetch('/api/users?status=active', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    fetch('/api/locations', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('directoryCollapsedLocations', JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.firstName, u.lastName, u.role, u.email, ...u.locations].join(' ').toLowerCase().includes(q));
  }, [users, search]);

  // Someone with more than one location (there's exactly one such person
  // today, but this doesn't assume that stays true) appears under each of
  // their locations -- simplest correct behavior, and matches "which
  // locations is this person part of" more literally than picking one.
  const grouped = useMemo(() => {
    const byLocation = new Map<string, DirectoryUser[]>();
    const unassigned: DirectoryUser[] = [];
    for (const user of filtered) {
      if (!user.locations.length) {
        unassigned.push(user);
        continue;
      }
      for (const loc of user.locations) {
        if (!byLocation.has(loc)) byLocation.set(loc, []);
        byLocation.get(loc)!.push(user);
      }
    }
    for (const list of byLocation.values()) list.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

    const known = locations
      .filter((l) => byLocation.has(l.name))
      .sort((a, b) => (TYPE_PRIORITY[a.locationType] ?? 1) - (TYPE_PRIORITY[b.locationType] ?? 1) || a.name.localeCompare(b.name))
      .map((l) => ({ key: l.name, label: l.name, meta: [l.suburb, l.state].filter(Boolean).join(', '), users: byLocation.get(l.name)! }));

    // A location string on a user that doesn't match any real Location
    // record (shouldn't happen given tonight's data, but not assumed to
    // never happen) still gets its own group rather than silently
    // vanishing -- named by whatever string the user actually has.
    const knownNames = new Set(known.map((g) => g.key));
    const stray = [...byLocation.keys()].filter((name) => !knownNames.has(name)).sort();
    const strayGroups = stray.map((name) => ({ key: name, label: name, meta: '', users: byLocation.get(name)! }));

    const groups = [...known, ...strayGroups];
    if (unassigned.length) {
      unassigned.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      groups.push({ key: '__unassigned', label: 'No location on file', meta: '', users: unassigned });
    }
    return groups;
  }, [filtered, locations]);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Staff Directory</h1>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        {users === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {users !== null && filtered.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}

        {users !== null && filtered.length > 0 && (
          <div className="space-y-6">
            {grouped.map((group) => {
              const isCollapsed = collapsed[group.key];
              return (
                <div key={group.key}>
                  <button type="button" onClick={() => toggleCollapsed(group.key)} className="mb-3 flex w-full items-center gap-2 text-left">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{group.label}</h2>
                    {group.meta && <span className="text-xs font-semibold text-muted-foreground">{group.meta}</span>}
                    <span className="text-xs font-semibold text-muted-foreground">({group.users.length})</span>
                    <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.users.map((user) => (
                        <StaffCard key={`${group.key}-${user.id}`} user={user} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
