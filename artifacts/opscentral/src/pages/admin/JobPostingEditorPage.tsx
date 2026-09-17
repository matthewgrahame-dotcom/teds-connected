import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';

type Form = { id: number; title: string; slug: string };

export default function JobPostingEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'draft' | 'open' | 'closed'>('draft');
  const [formSlug, setFormSlug] = useState('');
  const [forms, setForms] = useState<Form[] | null>(null);

  useEffect(() => {
    // Uses the plain staff-facing GET /forms list -- fine here since it's
    // just used to populate a dropdown of forms to link to, not to read
    // anything sensitive.
    fetch('/api/forms')
      .then((r) => (r.ok ? r.json() : []))
      .then(setForms)
      .catch(() => setForms([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/job-postings/admin/${params.id}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setPostingId(data.id);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
        setStatus(data.status);
        setFormSlug(data.formSlug ?? '');
      })
      .catch(() => toast({ title: "Couldn't load this posting", variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const save = async () => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { title: title.trim(), description, location: location.trim() || null, status, formSlug: formSlug || null };
      const res = await fetch(isNew ? '/api/job-postings' : `/api/job-postings/${postingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast({ title: 'Posting saved' });
      navigate(`/admin/job-postings/${data.posting.id}`);
      if (isNew) setPostingId(data.posting.id);
    } catch (err) {
      toast({ title: 'Could not save posting', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!postingId || !window.confirm('Delete this job posting? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/job-postings/${postingId}`, { method: 'DELETE', headers: authHeaders(session) });
      if (!res.ok) throw new Error('Could not delete');
      toast({ title: 'Posting deleted' });
      navigate('/people/recruiting');
    } catch (err) {
      toast({ title: 'Could not delete posting', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">Loading…</div>;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/people/recruiting" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Recruiting
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">{isNew ? 'New Job Posting' : 'Edit Job Posting'}</h1>
          {!isNew && (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-extrabold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>

        <section className="space-y-4 rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Job Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sales Assistant"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Richmond, or Head Office"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Description</label>
            <RichTextEditor value={description} onChange={setDescription} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Application Form</label>
            <select
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            >
              <option value="">No specific form (link to Recruiting forms category)</option>
              {forms?.map((f) => (
                <option key={f.id} value={f.slug}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">Status</label>
            <div className="flex overflow-hidden rounded-md border border-border text-xs font-bold">
              {(['draft', 'open', 'closed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-2 capitalize transition ${status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Only "Open" postings show on the staff-facing Recruiting hub.</p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Posting'}
          </button>
        </div>
      </div>
    </div>
  );
}
