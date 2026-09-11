import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type FormField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'radio' | 'select' | 'file';
  required?: boolean;
  options?: string[];
  helpText?: string;
  section?: string;
};

type FormDef = { id: number; title: string; slug: string; fields: FormField[] };

export default function FormPage() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const [form, setForm] = useState<FormDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${slug}`)
      .then((r) => r.json())
      .then(setForm);
  }, [slug]);

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submittedBy: session?.name, submitterLocation: session?.store, data: values }),
      });
      const responseData = await resp.json();
      if (!resp.ok) throw new Error(responseData.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) return <div className="px-5 py-8 lg:px-10 lg:py-10 text-sm text-muted-foreground">Loading…</div>;

  if (submitted) {
    return (
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-card-border bg-card p-8 text-center shell-shadow">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-extrabold text-foreground">Submitted</p>
          <p className="mt-1 text-sm text-muted-foreground">Your {form.title} has been recorded.</p>
          <Link href="/people/forms" className="mt-4 inline-block text-sm font-semibold text-primary underline">
            Back to Forms
          </Link>
        </div>
      </div>
    );
  }

  let lastSection: string | undefined;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-extrabold text-foreground">{form.title}</h1>
        <div className="space-y-5 rounded-xl border border-card-border bg-card p-6 shell-shadow">
          {form.fields.map((field) => {
            const showSectionHeading = field.section && field.section !== lastSection;
            lastSection = field.section;
            return (
              <div key={field.key}>
                {showSectionHeading && (
                  <h2 className="mb-3 mt-2 border-t border-border pt-5 text-sm font-extrabold uppercase tracking-wide text-foreground first:mt-0 first:border-t-0 first:pt-0">
                    {field.section}
                  </h2>
                )}
                <label className="mb-1.5 block text-sm font-semibold text-foreground/80">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    data-testid={`input-${field.key}`}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                ) : field.type === 'radio' ? (
                  <div className="flex flex-col gap-2">
                    {field.options?.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name={field.key}
                          value={option}
                          checked={values[field.key] === option}
                          onChange={() => setValue(field.key, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : field.type === 'select' ? (
                  <select
                    data-testid={`input-${field.key}`}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select…</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'file' ? (
                  <>
                    <input
                      data-testid={`input-${field.key}`}
                      type="file"
                      onChange={(e) => setValue(field.key, e.target.files?.[0]?.name ?? '')}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      File storage isn't wired up yet — the filename is recorded, but attach the actual file another way for now.
                    </p>
                  </>
                ) : (
                  <input
                    data-testid={`input-${field.key}`}
                    type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
                {field.helpText && field.type !== 'file' && <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>}
              </div>
            );
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            data-testid="button-submit-form"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
