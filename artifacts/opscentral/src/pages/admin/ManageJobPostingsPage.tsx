import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type AdminJobPosting = {
  id: number;
  title: string;
  location: string | null;
  status: 'draft' | 'open' | 'closed';
  formSlug: string | null;
  updatedAt: string;
};

const statusStyles: Record<AdminJobPosting['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-muted text-muted-foreground',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ManageJobPostingsPage() {
  const { session } = useAuth();
  const [postings, setPostings] = useState<AdminJobPosting[] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    fetch('/api/job-postings/admin', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPostings)
      .catch(() => setPostings([]));
  };

  useEffect(load, []);

  const remove = async (posting: AdminJobPosting) => {
    if (!window.confirm(`Delete "${posting.title}"? This cannot be undone.`)) return;
    setDeletingId(posting.id);
    await fetch(`/api/job-postings/${posting.id}`, { method: 'DELETE', headers: authHeaders(session) });
    load();
    setDeletingId(null);
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">Job Postings</h1>
          </div>
          <Link
            href="/admin/job-postings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" /> New Posting
          </Link>
        </div>

        {postings === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {postings?.length === 0 && <p className="text-sm text-muted-foreground">No job postings yet.</p>}

        {postings && postings.length > 0 && (
          <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
            {postings.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.location || 'No location set'} · Updated {formatDate(p.updatedAt)}
                    {p.formSlug ? ` · Form: ${p.formSlug}` : ' · Uses the general Recruiting form'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyles[p.status]}`}>{p.status}</span>
                  <Link href={`/admin/job-postings/${p.id}`} aria-label="Edit posting" className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete posting"
                    disabled={deletingId === p.id}
                    onClick={() => remove(p)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
