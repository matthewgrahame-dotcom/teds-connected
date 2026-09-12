import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type LocationRow = { location: string; compliancePercent: number };
type StaffRow = { userId: number; name: string; compliancePercent: number };
type PolicyRow = { documentId: number; title: string; outstanding: number; completedPercent: number };

const RING_COLORS = ['hsl(var(--foreground))', 'hsl(var(--muted))'];

export function PolicyComplianceTab() {
  const { session } = useAuth();

  const [overallPercent, setOverallPercent] = useState<number | null>(null);
  const [locationData, setLocationData] = useState<LocationRow[] | null>(null);
  const [staffData, setStaffData] = useState<StaffRow[] | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch('/api/work/reporting/overview', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setOverallPercent(data.overallCompliancePercent))
      .catch(() => setOverallPercent(0));
    fetch('/api/work/reporting/by-location', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setLocationData)
      .catch(() => setLocationData([]));
    fetch('/api/work/reporting/by-staff', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: StaffRow[]) => setStaffData([...rows].sort((a, b) => a.compliancePercent - b.compliancePercent)))
      .catch(() => setStaffData([]));
    fetch('/api/work/reporting/by-policy', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPolicies)
      .catch(() => setPolicies([]));
  }, []);

  const filteredPolicies = useMemo(() => {
    if (!policies) return [];
    const q = search.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => p.title.toLowerCase().includes(q));
  }, [policies, search]);

  const visiblePolicies = filteredPolicies.slice(0, pageSize);

  const ringData = overallPercent === null ? [] : [{ name: 'Compliant', value: overallPercent }, { name: 'Outstanding', value: Math.max(0, 100 - overallPercent) }];

  return (
    <div className="space-y-6">
      {policies !== null && policies.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          No policies are marked as requiring acknowledgment yet — turn this on for a document from its page in the Work hub (full-level staff see a "Requires staff acknowledgment" checkbox under each doc).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Overall Policy Compliance</h2>
          {overallPercent === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="relative mx-auto grid h-56 w-56 place-items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ringData} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={95} startAngle={90} endAngle={-270} stroke="none">
                    {ringData.map((_, i) => (
                      <Cell key={i} fill={RING_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span className="pointer-events-none absolute text-3xl font-extrabold text-foreground">{overallPercent}%</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Policy Compliance (By Location)</h2>
          {locationData === null && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {locationData !== null && locationData.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>}
          {locationData !== null && locationData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationData} margin={{ top: 8, right: 8, left: 0, bottom: 56 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="location" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={80} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="compliancePercent" name="Compliance" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Policy Compliance (By Staff)</h2>
        {staffData === null && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {staffData !== null && staffData.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>}
        {staffData !== null && staffData.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {staffData.map((s) => (
              <div key={s.userId} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-foreground">{s.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${s.compliancePercent}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{s.compliancePercent}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-card-border bg-card shell-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Policies</h2>
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
                <TableHead>Policy Name</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>% Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies === null && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {policies !== null && visiblePolicies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No policies found.</TableCell>
                </TableRow>
              )}
              {visiblePolicies.map((p) => (
                <TableRow key={p.documentId} data-testid={`row-policy-${p.documentId}`}>
                  <TableCell className="font-semibold">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.outstanding}</TableCell>
                  <TableCell className="text-muted-foreground">{p.completedPercent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {policies !== null && (
          <div className="border-t border-border p-4 text-xs text-muted-foreground">
            Showing {visiblePolicies.length} of {filteredPolicies.length} polic{filteredPolicies.length === 1 ? 'y' : 'ies'}
          </div>
        )}
      </div>
    </div>
  );
}
