import { useEffect, useMemo, useState } from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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

export default function DirectoryPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/users?status=active', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.firstName, u.lastName, u.role, u.email, ...u.locations].join(' ').toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Staff Directory</h1>
        </div>

        <div className="rounded-xl border border-card-border bg-card shell-shadow">
          <div className="border-b border-border p-4">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location(s)</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users === null && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {users !== null && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No matches.</TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.firstName} {u.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.role}</TableCell>
                    <TableCell className="text-muted-foreground">{u.locations.join(', ') || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
