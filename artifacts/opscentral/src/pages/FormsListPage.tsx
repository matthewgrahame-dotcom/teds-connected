import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type FormSummary = { id: number; title: string; slug: string; categoryId: number | null; categoryName: string | null };
type Category = { id: number; name: string; sortOrder: number };

export default function FormsListPage() {
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);

  const load = () => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then(setForms);
    fetch('/api/forms/categories')
      .then((r) => r.json())
      .then(setCategories);
  };

  useEffect(load, []);

  const setCategory = async (formId: number, categoryId: string) => {
    await fetch(`/api/forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ categoryId: categoryId === '' ? null : Number(categoryId) }),
    });
    load();
  };

  const loading = forms === null || categories === null;

  // Groups forms under each category, in the category's own sort order, with
  // uncategorized forms collected into a final "Other" group. Categories
  // with no forms in them are skipped rather than shown empty.
  const groups: { label: string; forms: FormSummary[] }[] = [];
  if (forms && categories) {
    for (const cat of [...categories].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const inCategory = forms.filter((f) => f.categoryId === cat.id);
      if (inCategory.length) groups.push({ label: cat.name, forms: inCategory });
    }
    const uncategorized = forms.filter((f) => !f.categoryId);
    if (uncategorized.length) groups.push({ label: 'Other', forms: uncategorized });
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-extrabold text-foreground">Forms</h1>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && forms.length === 0 && <p className="text-sm text-muted-foreground">No forms available yet.</p>}

        {!loading &&
          groups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
              <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
                {group.forms.map((form) => (
                  <div key={form.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <Link href={`/people/forms/${form.slug}`} data-testid={`link-form-${form.slug}`} className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-semibold text-foreground">{form.title}</span>
                    </Link>
                    {canEdit && (
                      <select
                        value={form.categoryId ?? ''}
                        onChange={(e) => setCategory(form.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 shrink-0 rounded-md border border-input bg-background px-1.5 text-xs outline-none"
                      >
                        <option value="">No category</option>
                        {categories!.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
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
