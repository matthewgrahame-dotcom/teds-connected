import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, IdCard, Pencil, Plus, Search, UserCog, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

type PortalUser = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  locations: string[];
  role: string;
  activated: boolean;
  archived: boolean;
  brand: string;
  createdAt: string;
};

type PortalUserProfile = {
  userId: number;
  middleName?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  homeAddress1?: string | null;
  homeAddress2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  hiredDate?: string | null;
  manager?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  tfnFormCompleted: boolean;
};

const emptyProfile: PortalUserProfile = { userId: 0, tfnFormCompleted: false };

type UserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  locations: string;
  role: string;
  brand: string;
  activated: boolean;
};

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  locations: '',
  role: '',
  brand: "Ted's Cameras",
  activated: false,
};

function toFormState(user: PortalUser): UserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    locations: user.locations.join(', '),
    role: user.role,
    brand: user.brand,
    activated: user.activated,
  };
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const canViewProfiles = session?.level === 'full';
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [users, setUsers] = useState<PortalUser[] | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profileUser, setProfileUser] = useState<PortalUser | null>(null);
  const [profile, setProfile] = useState<PortalUserProfile>(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const load = () => {
    setUsers(null);
    fetch(`/api/users?status=${tab}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(load, [tab]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.firstName, u.lastName, u.username, u.email, u.role, u.brand, ...u.locations].join(' ').toLowerCase().includes(q),
    );
  }, [users, search]);

  const visible = filtered.slice(0, pageSize);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: PortalUser) => {
    setEditingUser(user);
    setForm(toFormState(user));
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.email.trim() || !form.role.trim()) return;
    setSaving(true);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      locations: form.locations,
      role: form.role.trim(),
      brand: form.brand.trim() || "Ted's Cameras",
      activated: form.activated,
    };
    try {
      const res = await fetch(editingUser ? `/api/users/${editingUser.id}` : '/api/users', {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not save user', description: data.error ?? 'Something went wrong.', variant: 'destructive' });
        return;
      }
      toast({ title: editingUser ? 'User updated' : 'User created' });
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleArchived = async (user: PortalUser) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ archived: !user.archived }),
    });
    if (res.ok) {
      toast({ title: user.archived ? 'User restored' : 'User archived' });
      load();
    }
  };

  const toggleActivated = async (user: PortalUser) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ activated: !user.activated }),
    });
    if (res.ok) load();
  };

  const openProfile = (user: PortalUser) => {
    requirePublishAccess(() => {
      setProfileUser(user);
      setProfile(emptyProfile);
      setProfileLoading(true);
      fetch(`/api/users/${user.id}/profile`, { headers: authHeaders(session) })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(setProfile)
        .catch(() => toast({ title: 'Could not load profile', description: 'Your session may have expired — try logging out and back in.', variant: 'destructive' }))
        .finally(() => setProfileLoading(false));
    });
  };

  const saveProfile = async () => {
    if (!profileUser) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/users/${profileUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast({ title: 'Profile updated' });
        setProfileUser(null);
      } else {
        toast({ title: 'Could not save profile', variant: 'destructive' });
      }
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCog className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">List of Users</h1>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'archived')}>
              <TabsList>
                <TabsTrigger value="active" data-testid="tab-active-users">Active</TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived-users">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              type="button"
              data-testid="button-create-user"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> Create New User
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card shell-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              Show
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-user-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location(s)</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users === null &&
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><div className="skeleton h-6 w-full rounded" /></TableCell>
                    </TableRow>
                  ))}
                {users !== null && visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No {tab} users found.
                    </TableCell>
                  </TableRow>
                )}
                {visible.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-semibold">{user.firstName}</TableCell>
                    <TableCell className="font-semibold">{user.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.locations.join(', ') || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.role}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        data-testid={`button-toggle-activated-${user.id}`}
                        onClick={() => toggleActivated(user)}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                          user.activated ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}
                      >
                        {user.activated ? 'Activated' : 'Not Activated'}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.brand}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canViewProfiles && (
                          <button
                            type="button"
                            aria-label="View profile"
                            data-testid={`button-view-profile-${user.id}`}
                            onClick={() => openProfile(user)}
                            className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            <IdCard className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Edit user"
                          data-testid={`button-edit-user-${user.id}`}
                          onClick={() => openEdit(user)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={user.archived ? 'Restore user' : 'Archive user'}
                          data-testid={`button-archive-user-${user.id}`}
                          onClick={() => toggleArchived(user)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          {user.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users !== null && (
            <div className="border-t border-border p-4 text-xs text-muted-foreground">
              Showing {visible.length} of {filtered.length} {tab} user{filtered.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First Name" required>
                <input
                  data-testid="input-user-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </FormField>
              <FormField label="Last Name" required>
                <input
                  data-testid="input-user-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </FormField>
            </div>
            <FormField label="Username" required>
              <input
                data-testid="input-user-username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
            <FormField label="Email" required>
              <input
                type="email"
                data-testid="input-user-email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
            <FormField label="Location(s)" hint="Comma-separated, e.g. Teds Chadstone, Head Office">
              <input
                data-testid="input-user-locations"
                value={form.locations}
                onChange={(e) => setForm((f) => ({ ...f, locations: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Role" required>
                <input
                  data-testid="input-user-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Employee - Store"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </FormField>
              <FormField label="Brand">
                <input
                  data-testid="input-user-brand"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </FormField>
            </div>
            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">Activated</span>
              <Switch checked={form.activated} onCheckedChange={(v) => setForm((f) => ({ ...f, activated: v }))} data-testid="switch-user-activated" />
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="button-save-user"
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileUser} onOpenChange={(open) => !open && setProfileUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{profileUser ? `${profileUser.firstName} ${profileUser.lastName} — Full Profile` : 'Full Profile'}</DialogTitle>
          </DialogHeader>
          {profileLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <ProfileSection title="Personal">
                <ProfileField label="Middle Name" value={profile.middleName} onChange={(v) => setProfile((p) => ({ ...p, middleName: v }))} />
                <ProfileField label="Phone Number" value={profile.phoneNumber} onChange={(v) => setProfile((p) => ({ ...p, phoneNumber: v }))} />
                <ProfileField label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(v) => setProfile((p) => ({ ...p, dateOfBirth: v }))} />
                <ProfileField label="Gender" value={profile.gender} onChange={(v) => setProfile((p) => ({ ...p, gender: v }))} />
              </ProfileSection>

              <ProfileSection title="Home Address">
                <ProfileField label="Address Line 1" value={profile.homeAddress1} onChange={(v) => setProfile((p) => ({ ...p, homeAddress1: v }))} />
                <ProfileField label="Address Line 2" value={profile.homeAddress2} onChange={(v) => setProfile((p) => ({ ...p, homeAddress2: v }))} />
                <ProfileField label="City" value={profile.city} onChange={(v) => setProfile((p) => ({ ...p, city: v }))} />
                <ProfileField label="State" value={profile.state} onChange={(v) => setProfile((p) => ({ ...p, state: v }))} />
                <ProfileField label="Postcode" value={profile.postcode} onChange={(v) => setProfile((p) => ({ ...p, postcode: v }))} />
                <ProfileField label="Country" value={profile.country} onChange={(v) => setProfile((p) => ({ ...p, country: v }))} />
              </ProfileSection>

              <ProfileSection title="Employment">
                <ProfileField label="Job Title" value={profile.jobTitle} onChange={(v) => setProfile((p) => ({ ...p, jobTitle: v }))} />
                <ProfileField label="Hired Date" type="date" value={profile.hiredDate} onChange={(v) => setProfile((p) => ({ ...p, hiredDate: v }))} />
                <ProfileField label="Manager" value={profile.manager} onChange={(v) => setProfile((p) => ({ ...p, manager: v }))} />
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5">
                  <span className="text-sm font-semibold text-foreground">TFN Form Completed</span>
                  <Switch checked={profile.tfnFormCompleted} onCheckedChange={(v) => setProfile((p) => ({ ...p, tfnFormCompleted: v }))} />
                </div>
              </ProfileSection>

              <ProfileSection title="Emergency Contact">
                <ProfileField label="Name" value={profile.emergencyContactName} onChange={(v) => setProfile((p) => ({ ...p, emergencyContactName: v }))} />
                <ProfileField label="Relationship" value={profile.emergencyContactRelationship} onChange={(v) => setProfile((p) => ({ ...p, emergencyContactRelationship: v }))} />
                <ProfileField label="Best Contact Number" value={profile.emergencyContactPhone} onChange={(v) => setProfile((p) => ({ ...p, emergencyContactPhone: v }))} />
              </ProfileSection>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => setProfileUser(null)} className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileSaving || profileLoading}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ProfileField({ label, value, onChange, type = 'text' }: { label: string; value?: string | null; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mono-label mb-1.5 block text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mono-label mb-2 block text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
