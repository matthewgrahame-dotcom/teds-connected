import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import DOMPurify from 'dompurify';
import { Briefcase, MapPin, FileText, Download, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type JobPosting = { id: number; title: string; location: string | null; description: string | null; formSlug: string | null };
type FormSummary = { id: number; title: string; slug: string; instructions: string | null; categoryNames: string[] };

export default function RecruitingPage() {
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const [postings, setPostings] = useState<JobPosting[] | null>(null);
  const [forms, setForms] = useState<FormSummary[] | null>(null);

  useEffect(() => {
    fetch('/api/job-postings', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPostings)
      .catch(() => setPostings([]));
    // /api/forms doesn't include instructions (kept light for the general
    // list), so the Recruiting-category forms are fetched individually by
    // slug below once we know which ones belong to that category.
    fetch('/api/forms', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(async (allForms: { id: number; title: string; slug: string; categoryNames: string[] }[]) => {
        const recruitingForms = allForms.filter((f) => f.categoryNames.includes('Recruiting'));
        const withInstructions = await Promise.all(
          recruitingForms.map(async (f) => {
            try {
              const res = await fetch(`/api/forms/${f.slug}`, { headers: authHeaders(session) });
              const data = await res.json();
              return { ...f, instructions: data.instructions ?? null };
            } catch {
              return { ...f, instructions: null };
            }
          }),
        );
        setForms(withInstructions);
      })
      .catch(() => setForms([]));
  }, []);

  const loading = postings === null || forms === null;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold text-foreground">Recruiting</h1>
          {canEdit && (
            <Link
              href="/admin/job-postings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> Manage Job Postings
            </Link>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && (
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-foreground">Open Positions</h2>
            {postings.length === 0 && <p className="text-sm text-muted-foreground">No open positions right now.</p>}
            <div className="space-y-3">
              {postings.map((job) => {
                const applyHref = job.formSlug ? `/people/forms/${job.formSlug}` : forms[0] ? `/people/forms/${forms[0].slug}` : null;
                return (
                  <div key={job.id} className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 font-extrabold text-foreground">
                          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" /> {job.title}
                        </h3>
                        {job.location && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" /> {job.location}
                          </p>
                        )}
                      </div>
                      {applyHref && (
                        <Link href={applyHref} className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95">
                          Apply Now
                        </Link>
                      )}
                    </div>
                    {job.description && (
                      <div
                        className="prose prose-sm mt-3 max-w-none text-sm leading-6 text-foreground"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description) }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!loading && forms.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-foreground">Application Form{forms.length > 1 ? 's' : ''}</h2>
            <p className="text-sm text-muted-foreground">
              Fill this out online, or download it to complete on paper and hand in at your store.
            </p>
            <div className="space-y-3">
              {forms.map((form) => (
                <div key={form.id} className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="flex items-center gap-2 font-extrabold text-foreground">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /> {form.title}
                    </h3>
                  </div>
                  {form.instructions && (
                    <div
                      className="prose prose-sm mt-2 max-w-none text-sm leading-6 text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.instructions) }}
                    />
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/people/forms/${form.slug}`} className="rounded-lg bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95">
                      Fill Out Online
                    </Link>
                    <Link
                      href={`/people/forms/${form.slug}?print=1`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" /> Download / Print
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && postings.length === 0 && forms.length === 0 && canEdit && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing here yet.{' '}
            <Link href="/admin/job-postings/new" className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add a job posting
            </Link>
            , and assign a form to the "Recruiting" category from the Forms editor.
          </div>
        )}
      </div>
    </div>
  );
}
