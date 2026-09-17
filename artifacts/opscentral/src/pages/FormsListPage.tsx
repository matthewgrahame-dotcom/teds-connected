import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { FileText, ChevronRight, ChevronLeft, Pencil, Plus, FolderOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type FormSummary = { id: number; title: string; slug: string; categoryIds: number[]; categoryNames: string[] };

// Same defensive pattern SearchResultsPage's useQueryParam already uses --
// wouter's location from useLocation() doesn't reliably include the query
// string depending on how navigation happened, so fall back to
// window.location.search when it's missing.
function useQueryParam(name: string): string {
  const [location] = useLocation();
  const search = location.includes('?') ? location.split('?')[1] : window.location.search.slice(1);
  return new URLSearchParams(search).get(name) ?? '';
}

export default function FormsListPage() {
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const category = useQueryParam('category');

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

  const newFormButton = canEdit ? (
    <Link
      href="/admin/forms/new"
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95"
    >
      <Plus className="h-3.5 w-3.5" /> New Form
    </Link>
  ) : null;

  // A specific category is selected -- either from clicking a block below,
  // or from a direct sidebar link like "Staff Surveys"/"Contracts" that
  // points straight at ?category=X. Shows just that group's forms in the
  // original flat list layout, with a way back to the full category grid.
  if (category) {
    const groupForms = groups.get(category) ?? [];
    return (
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/people/forms" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> All Forms
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-foreground">{category}</h1>
            {newFormButton}
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && groupForms.length === 0 && (
            <p className="text-sm text-muted-foreground">No forms in this category yet.</p>
          )}

          {!loading && groupForms.length > 0 && (
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
          )}
        </div>
      </div>
    );
  }

  // No category selected -- the default "All Forms" landing view: each
  // category as its own clickable block, matching the card-grid look of
  // Learn > Training and Programs (ProgramsPage), rather than the old
  // stacked list-with-headers layout.
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">All Forms</h1>
          {newFormButton}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && forms.length === 0 && <p className="text-sm text-muted-foreground">No forms available yet.</p>}

        {!loading && forms.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGroups.map(([label, groupForms]) => (
              <Link
                key={label}
                href={`/people/forms?category=${encodeURIComponent(label)}`}
                data-testid={`link-form-category-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card shell-shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid aspect-video w-full shrink-0 place-items-center bg-muted text-muted-foreground">
                  <FolderOpen className="h-8 w-8" />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 p-4">
                  <h2 className="font-extrabold leading-snug text-foreground">{label}</h2>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                    {groupForms.length} {groupForms.length === 1 ? 'form' : 'forms'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
