import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Archive, ArchiveRestore, GraduationCap, Image as ImageIcon, Pencil, Plus, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type AdminProgram = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  category: string | null;
  status: 'draft' | 'live' | 'archived';
  publishedAt: string | null;
  updatedAt: string;
  moduleCount: number;
  enrolled: number;
};

const statusStyles: Record<AdminProgram['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  live: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-muted text-muted-foreground',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ManageProgramsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [programs, setPrograms] = useState<AdminProgram[] | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => {
    setPrograms(null);
    fetch('/api/training/admin/programs', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPrograms)
      .catch(() => setPrograms([]));
  };

  useEffect(load, []);

  const scoped = useMemo(() => {
    if (!programs) return [];
    return programs.filter((p) => (tab === 'archived' ? p.status === 'archived' : p.status !== 'archived'));
  }, [programs, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((p) => [p.title, p.category ?? ''].join(' ').toLowerCase().includes(q));
  }, [scoped, search]);

  const visible = filtered.slice(0, pageSize);

  const toggleArchive = async (program: AdminProgram) => {
    setSavingId(program.id);
    const status = program.status === 'archived' ? 'draft' : 'archived';
    await fetch(`/api/training/programs/${program.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ status }),
    });
    load();
    setSavingId(null);
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">Manage Programs</h1>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'archived')}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            <Link
              href="/admin/programs/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> Create Program
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card shell-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              Show
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none">
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Program Name</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Program Category(s)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published On</TableHead>
                  <TableHead>Updated On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs === null && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {programs !== null && visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No {tab} programs found.</TableCell>
                  </TableRow>
                )}
                {visible.map((p) => (
                  <TableRow key={p.id} data-testid={`row-program-${p.id}`}>
                    <TableCell>
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                        {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4" />}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.enrolled}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category || '—'}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyles[p.status]}`}>{p.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.publishedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/programs/${p.id}`}
                          aria-label="Edit program"
                          className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          aria-label={p.status === 'archived' ? 'Restore program' : 'Archive program'}
                          disabled={savingId === p.id}
                          onClick={() => toggleArchive(p)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          {p.status === 'archived' ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {programs !== null && (
            <div className="border-t border-border p-4 text-xs text-muted-foreground">
              Showing {visible.length} of {filtered.length} {tab} program{filtered.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
