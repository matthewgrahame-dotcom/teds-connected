import { useEffect, useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type LocationRow = { location: string; completedPercent: number; inProgressPercent: number; notStartedPercent: number };
type LearnerRow = {
  userId: number;
  name: string;
  role: string;
  location: string | null;
  overallProgressPercent: number;
  mandatoryProgressPercent: number;
  optionalProgressPercent: number;
  updatedAt: string | null;
};
type ProgramOption = { id: number; title: string };

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ReportingPage() {
  const { session } = useAuth();
  const canView = session?.level === 'full';

  const [programs, setPrograms] = useState<ProgramOption[] | null>(null);
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [locationData, setLocationData] = useState<LocationRow[] | null>(null);
  const [learners, setLearners] = useState<LearnerRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!canView) return;
    fetch('/api/training/admin/programs', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ProgramOption[]) => setPrograms(rows.map((r) => ({ id: r.id, title: r.title }))))
      .catch(() => setPrograms([]));
    fetch('/api/training/reporting/learners', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setLearners)
      .catch(() => setLearners([]));
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    setLocationData(null);
    fetch(`/api/training/reporting/by-location?programId=${encodeURIComponent(programFilter)}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setLocationData)
      .catch(() => setLocationData([]));
  }, [canView, programFilter]);

  const filteredLearners = useMemo(() => {
    if (!learners) return [];
    const q = search.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter((l) => [l.name, l.role, l.location ?? ''].join(' ').toLowerCase().includes(q));
  }, [learners, search]);

  const visibleLearners = filteredLearners.slice(0, pageSize);

  if (!canView) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">You don't have access to this page.</div>;
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Training Reporting</h1>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Progress by Location</h2>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none"
            >
              <option value="all">All Programs</option>
              {programs?.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {locationData === null && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {locationData !== null && locationData.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No data for this selection.</p>}
          {locationData !== null && locationData.length > 0 && (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={locationData} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="location" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={90} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Bar dataKey="completedPercent" name="Completed" stackId="progress" fill="hsl(var(--foreground))" />
                <Bar dataKey="inProgressPercent" name="In Progress" stackId="progress" fill="hsl(var(--primary))" />
                <Bar dataKey="notStartedPercent" name="Not Started" stackId="progress" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card shell-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">By Learner</h2>
            <div className="flex flex-wrap items-center gap-3">
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Overall Progress</TableHead>
                  <TableHead>Mandatory Progress</TableHead>
                  <TableHead>Optional Progress</TableHead>
                  <TableHead>Updated On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners === null && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {learners !== null && visibleLearners.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No learners found.</TableCell>
                  </TableRow>
                )}
                {visibleLearners.map((l) => (
                  <TableRow key={l.userId} data-testid={`row-learner-${l.userId}`}>
                    <TableCell className="font-semibold">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.role}</TableCell>
                    <TableCell className="text-muted-foreground">{l.location ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.overallProgressPercent}%</TableCell>
                    <TableCell className="text-muted-foreground">{l.mandatoryProgressPercent}%</TableCell>
                    <TableCell className="text-muted-foreground">{l.optionalProgressPercent}%</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(l.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {learners !== null && (
            <div className="border-t border-border p-4 text-xs text-muted-foreground">
              Showing {visibleLearners.length} of {filteredLearners.length} learner{filteredLearners.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
