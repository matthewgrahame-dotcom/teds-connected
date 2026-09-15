import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { FileText, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type FormSummary = { id: number; title: string; slug: string; categoryIds: number[]; categoryNames: string[] };

export default function FormsListPage() {
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const [forms, setForms] = useState<FormSummary[] | null>(null);

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then(setForms);
  }, []);

  const loading = forms === null;

  // Groups forms under EACH category they belong to (a form with multiple
  // categories appears under all of them), alphabetically, with an "Other"
  // group for anything with no category at all.
  const groups = new Map<string, FormSummary[]>();
  if (forms) {
    for (const form of forms) {
      const names = form.categoryNames.length ? form.categoryNames : ['Other'];
      for (const name of names) {
        const list = groups.get(name) ?? [];
        list.push(form);
        groups.set(name, list);
      }
    }
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)));

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">Forms</h1>
          {canEdit && (
            <Link
              href="/admin/forms/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-3.5 w-3.5" /> New Form
            </Link>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && forms.length === 0 && <p className="text-sm text-muted-foreground">No forms available yet.</p>}

        {!loading &&
          sortedGroups.map(([label, groupForms]) => (
            <div key={label}>
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</h2>
              <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
                {groupForms.map((form) => (
                  <div key={form.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <Link href={`/people/forms/${form.slug}`} data-testid={`link-form-${form.slug}`} className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-semibold text-foreground">{form.title}</span>
                    </Link>
                    {canEdit && (
                      <Link href={`/admin/forms/${form.id}`} aria-label="Edit form" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
