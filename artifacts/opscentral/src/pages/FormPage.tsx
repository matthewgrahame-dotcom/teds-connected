import { useEffect, useState } from 'react';
import { useParams, useSearch, Link } from 'wouter';
import { CheckCircle2, Printer } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { SignaturePad } from '@/components/SignaturePad';
import { openPrivateFormFile } from '@/lib/privateFile';

type FormField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'radio' | 'select' | 'file' | 'signature' | 'date';
  required?: boolean;
  options?: string[];
  helpText?: string;
  section?: string;
};

type FormDef = { id: number; title: string; slug: string; instructions: string | null; groupedFields: boolean; fields: FormField[] };

type FileUploadState = { status: 'idle' | 'uploading' | 'error'; progress?: number; error?: string };

export default function FormPage() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearch();
  const wantsPrint = new URLSearchParams(search).get('print') === '1';
  const { session } = useAuth();
  const [form, setForm] = useState<FormDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, FileUploadState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${slug}`, { headers: authHeaders(session) })
      .then((r) => r.json())
      .then(setForm);
  }, [slug]);

  // Arriving via RecruitingPage's "Download / Print" link (?print=1)
  // triggers the browser's print dialog automatically once the form has
  // actually loaded -- saves a click for the specific "get me a paper copy"
  // flow, while the manual Print button below covers everyone else.
  useEffect(() => {
    if (wantsPrint && form) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [wantsPrint, form]);

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const MAX_FILE_UPLOAD_BYTES = 3 * 1024 * 1024;

  // XHR rather than fetch specifically for xhr.upload.onprogress -- fetch
  // has no equivalent for upload (as opposed to download) progress, and a
  // base64-inflated multi-MB file over a slow store connection is exactly
  // the case where a stalled-looking "Uploading..." with no feedback is
  // worst.
  const handleFileSelect = (field: FormField, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_UPLOAD_BYTES) {
      setFileUploads((u) => ({ ...u, [field.key]: { status: 'error', error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB) -- the limit is ${MAX_FILE_UPLOAD_BYTES / (1024 * 1024)}MB.` } }));
      return;
    }
    setFileNames((n) => ({ ...n, [field.key]: file.name }));
    setFileUploads((u) => ({ ...u, [field.key]: { status: 'uploading', progress: 0 } }));

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/forms/upload');
      xhr.setRequestHeader('Content-Type', 'application/json');
      const headers = authHeaders(session);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setFileUploads((u) => ({ ...u, [field.key]: { status: 'uploading', progress: Math.round((e.loaded / e.total) * 100) } }));
      };
      xhr.onload = () => {
        try {
          const responseData = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && responseData.url) {
            setValue(field.key, responseData.url);
            setFileUploads((u) => ({ ...u, [field.key]: { status: 'idle' } }));
          } else {
            setFileUploads((u) => ({ ...u, [field.key]: { status: 'error', error: responseData.error || 'Upload failed' } }));
          }
        } catch {
          setFileUploads((u) => ({ ...u, [field.key]: { status: 'error', error: 'Upload failed' } }));
        }
      };
      xhr.onerror = () => setFileUploads((u) => ({ ...u, [field.key]: { status: 'error', error: 'Network error during upload' } }));
      xhr.send(JSON.stringify({ fileData: dataUrl, fileName: file.name, formSlug: slug }));
    };
    reader.readAsDataURL(file);
  };

  const anyFileUploading = Object.values(fileUploads).some((u) => u.status === 'uploading');

  const handleSubmit = async () => {
    if (!form || anyFileUploading) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ submittedBy: session?.name, submitterLocation: session?.store, data: values }),
      });
      const responseData = await resp.json();
      if (!resp.ok) throw new Error(responseData.error || 'Submission failed');
      setThankYouMessage(responseData.thankYouMessage ?? null);
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
          <p className="mt-1 text-sm text-muted-foreground">{thankYouMessage || `Your ${form.title} has been recorded.`}</p>
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
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold text-foreground">{form.title}</h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-extrabold text-muted-foreground transition hover:bg-muted"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Download
          </button>
        </div>
        {form.instructions && (
          <div
            className="prose prose-sm max-w-none rounded-xl border border-card-border bg-card p-5 shell-shadow [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-1.5"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.instructions) }}
          />
        )}
        <div className="space-y-5 rounded-xl border border-card-border bg-card p-6 shell-shadow">
          {form.fields.map((field) => {
            const showSectionHeading = form.groupedFields && field.section && field.section !== lastSection;
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
                      onChange={(e) => handleFileSelect(field, e.target.files?.[0])}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                    />
                    {fileUploads[field.key]?.status === 'uploading' && (
                      <div className="mt-1.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${fileUploads[field.key]?.progress ?? 0}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Uploading {fileNames[field.key]}… {fileUploads[field.key]?.progress ?? 0}%</p>
                      </div>
                    )}
                    {fileUploads[field.key]?.status === 'error' && (
                      <p className="mt-1 text-xs text-destructive">{fileUploads[field.key]?.error} — choose the file again to retry.</p>
                    )}
                    {(!fileUploads[field.key] || fileUploads[field.key]?.status === 'idle') && values[field.key] && (
                      <p className="mt-1 text-xs text-emerald-600">
                        ✓ {fileNames[field.key] || 'File'} uploaded —{' '}
                        <button
                          type="button"
                          onClick={async () => {
                            const err = await openPrivateFormFile(values[field.key], slug ?? '', session);
                            if (err) setFileUploads((u) => ({ ...u, [field.key]: { status: 'error', error: err } }));
                          }}
                          className="underline"
                        >
                          view
                        </button>
                      </p>
                    )}
                  </>
                ) : field.type === 'signature' ? (
                  <SignaturePad value={values[field.key] ?? ''} onChange={(dataUrl) => setValue(field.key, dataUrl)} required={field.required} />
                ) : field.type === 'date' ? (
                  <input
                    data-testid={`input-${field.key}`}
                    type="date"
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                ) : (
                  <input
                    data-testid={`input-${field.key}`}
                    type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
                {field.helpText && <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>}
              </div>
            );
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            data-testid="button-submit-form"
            onClick={handleSubmit}
            disabled={submitting || anyFileUploading}
            className="print:hidden w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : anyFileUploading ? 'Waiting for upload…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
