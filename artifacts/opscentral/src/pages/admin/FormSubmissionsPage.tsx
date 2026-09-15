import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { ChevronLeft, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type FormField = { key: string; label: string };
type FormDef = { id: number; title: string; slug: string; fields: FormField[] };
type Submission = { id: number; submittedBy: string; submitterLocation: string | null; data: Record<string, string>; submittedAt: string };

export default function FormSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [form, setForm] = useState<FormDef | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    fetch(`/api/forms/admin/${id}`, { headers: authHeaders(session) })
      .then((r) => r.json())
      .then(setForm);
    fetch(`/api/forms/admin/${id}/submissions`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: Submission[]) => setSubmissions([...rows].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())))
      .catch(() => setSubmissions([]));
  }, [id]);

  const loading = form === null || submissions === null;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href={form ? `/admin/forms/${form.id}` : '/people/forms'} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to {form ? 'Form Editor' : 'Forms'}
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">{form ? `${form.title} — Submissions` : 'Submissions'}</h1>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && submissions.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
          </div>
        )}

        {!loading && submissions.length > 0 && form && (
          <div className="overflow-x-auto rounded-xl border border-card-border bg-card shell-shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="whitespace-nowrap px-4 py-3 font-extrabold text-foreground">Submitted By</th>
                  <th className="whitespace-nowrap px-4 py-3 font-extrabold text-foreground">Location</th>
                  <th className="whitespace-nowrap px-4 py-3 font-extrabold text-foreground">Date</th>
                  {form.fields.map((f) => (
                    <th key={f.key} className="whitespace-nowrap px-4 py-3 font-extrabold text-foreground">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((s) => (
                  <tr key={s.id} data-testid={`row-submission-${s.id}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">{s.submittedBy}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.submitterLocation ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(s.submittedAt).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {form.fields.map((f) => (
                      <td key={f.key} className="max-w-xs px-4 py-3 text-muted-foreground">
                        {s.data[f.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
