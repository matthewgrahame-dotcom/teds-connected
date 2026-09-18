import { useEffect, useMemo, useState } from 'react';
import { Search, Users as UsersIcon, User as UserIcon, ChevronDown, Mail, X, Phone, MapPin, Cake, Briefcase, UserCog } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type DirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  locations: string[];
  email: string;
  photoUrl: string | null;
};

type Location = { id: number; name: string; locationType: string; suburb: string | null; state: string | null };

type UserProfile = {
  userId: number;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  homeAddress1?: string | null;
  homeAddress2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  hiredDate?: string | null;
  manager?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
};

// Retail locations (the ones customers actually walk into) surface first,
// then everything else -- Storeroom/Office -- alphabetically within each
// tier. This is a judgment call, not something the person confirmed
// explicitly; easy to change to pure alphabetical if it doesn't feel right.
const TYPE_PRIORITY: Record<string, number> = { Retail: 0 };

function StaffCard({ user, onOpen }: { user: DirectoryUser; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card text-left shell-shadow transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="grid aspect-square w-full shrink-0 place-items-center overflow-hidden bg-muted text-muted-foreground">
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="" className="h-full w-full object-cover object-top transition group-hover:scale-[1.03]" />
        ) : (
          <UserIcon className="h-8 w-8" />
        )}
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
    </button>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

// Admin-only -- portal_user_profiles (home address, DOB, emergency contact)
// is materially more sensitive than anything else on this page and its API
// route is gated to full-level sessions, so a basic session never attempts
// this fetch at all rather than hitting a 403.
function StaffDetailModal({ user, session, onClose }: { user: DirectoryUser; session: ReturnType<typeof useAuth>['session']; onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const canSeeProfile = session?.level === 'full';

  useEffect(() => {
    if (!canSeeProfile) return;
    fetch(`/api/users/${user.id}/profile`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [user.id, canSeeProfile]);

  const address = profile ? [profile.homeAddress1, profile.homeAddress2, profile.city, profile.state, profile.postcode].filter(Boolean).join(', ') : '';
  const emergency = profile?.emergencyContactName
    ? `${profile.emergencyContactName}${profile.emergencyContactRelationship ? ` (${profile.emergencyContactRelationship})` : ''}${profile.emergencyContactPhone ? ` — ${profile.emergencyContactPhone}` : ''}`
    : '';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-card-border bg-card shell-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted text-muted-foreground">
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover object-top" /> : <UserIcon className="h-10 w-10" />}
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-muted-foreground">{profile?.jobTitle || user.role}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            {user.email && <DetailRow icon={Mail} label="Email" value={user.email} />}
            {user.locations.length > 0 && <DetailRow icon={MapPin} label="Location" value={user.locations.join(', ')} />}
            {!canSeeProfile && <p className="text-xs text-muted-foreground">Sign in as an admin to see phone, address, and emergency contact details.</p>}
            {canSeeProfile && profile?.phoneNumber && <DetailRow icon={Phone} label="Phone" value={profile.phoneNumber} />}
            {canSeeProfile && address && <DetailRow icon={MapPin} label="Home Address" value={address} />}
            {canSeeProfile && profile?.dateOfBirth && <DetailRow icon={Cake} label="Date of Birth" value={profile.dateOfBirth} />}
            {canSeeProfile && profile?.manager && <DetailRow icon={UserCog} label="Manager" value={profile.manager} />}
            {canSeeProfile && emergency && <DetailRow icon={Briefcase} label="Emergency Contact" value={emergency} />}
          </div>
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
  const [openUser, setOpenUser] = useState<DirectoryUser | null>(null);
  // Stores which groups are EXPANDED (opposite of before) -- everything
  // defaults to collapsed unless explicitly opened, rather than defaulting
  // to expanded unless explicitly closed. Renamed the storage key too, so
  // a stale value from before this change (when the same key meant the
  // opposite thing) can't flip a group's state unexpectedly.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('directoryExpandedLocations') ?? '{}');
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

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('directoryExpandedLocations', JSON.stringify(next));
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
          <div className="space-y-4">
            {grouped.map((group) => {
              const isExpanded = !!expanded[group.key];
              return (
                <div key={group.key} className="overflow-hidden rounded-xl border border-card-border bg-card shell-shadow">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.key)}
                    className="flex w-full items-center gap-2 px-4 py-3.5 text-left transition hover:bg-muted/50"
                  >
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{group.label}</h2>
                    {group.meta && <span className="text-xs font-semibold text-muted-foreground">{group.meta}</span>}
                    <span className="text-xs font-semibold text-muted-foreground">({group.users.length})</span>
                    <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>
                  {isExpanded && (
                    <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.users.map((user) => (
                        <StaffCard key={`${group.key}-${user.id}`} user={user} onOpen={() => setOpenUser(user)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {openUser && <StaffDetailModal user={openUser} session={session} onClose={() => setOpenUser(null)} />}
    </div>
  );
}
