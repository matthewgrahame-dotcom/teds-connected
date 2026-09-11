import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { FileText, ChevronRight } from 'lucide-react';

type FormSummary = { id: number; title: string; slug: string };

export default function FormsListPage() {
  const [forms, setForms] = useState<FormSummary[] | null>(null);

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then(setForms);
  }, []);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-extrabold text-foreground">Forms</h1>
        <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
          {forms === null && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
          {forms?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No forms available yet.</p>}
          {forms?.map((form) => (
            <Link
              key={form.id}
              href={`/people/forms/${form.slug}`}
              data-testid={`link-form-${form.slug}`}
              className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{form.title}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
