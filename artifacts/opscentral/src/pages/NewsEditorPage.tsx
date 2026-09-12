import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ChevronLeft, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { useToast } from '@/hooks/use-toast';
import { fileToResizedDataUri } from '@/lib/imageUpload';
import { FormattingToolbar } from '@/components/FormattingToolbar';

const TAG_COLORS = [
  { label: 'Yellow', value: 'bg-primary' },
  { label: 'Red', value: 'bg-destructive' },
  { label: 'Blue', value: 'bg-accent' },
  { label: 'Green', value: 'bg-emerald-500' },
  { label: 'Purple', value: 'bg-purple-500' },
];

type NewsArticle = {
  id: number;
  title: string;
  snippet: string;
  body: string | null;
  imageUrl: string | null;
  imagePhotographerName: string | null;
  linkUrl: string | null;
  tagColor: string;
};

export default function NewsEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', snippet: '', body: '', imageUrl: '', linkUrl: '', tagColor: 'bg-primary' });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [photographerCredit, setPhotographerCredit] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/news/${params.id}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: NewsArticle) => {
        setForm({
          title: data.title,
          snippet: data.snippet,
          body: data.body ?? '',
          imageUrl: data.imageUrl ?? '',
          linkUrl: data.linkUrl ?? '',
          tagColor: data.tagColor,
        });
        setPhotographerCredit(data.imagePhotographerName);
      })
      .catch(() => toast({ title: "Couldn't load this article", variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleImageUpload = async (file: File) => {
    try {
      const dataUri = await fileToResizedDataUri(file);
      setForm((f) => ({ ...f, imageUrl: dataUri }));
      setPhotographerCredit(null); // a manually uploaded image replaces any prior Unsplash sourcing/credit
    } catch (err) {
      toast({ title: 'Could not upload that image', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.snippet.trim()) {
      toast({ title: 'Title and snippet are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        snippet: form.snippet.trim(),
        body: form.body.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        tagColor: form.tagColor,
        // Clears any stale Unsplash credit once the image itself has been replaced by an upload/different URL.
        // Sent as '' rather than null so the backend's typeof === 'string' check picks it up (it treats '' as clear-to-null itself).
        imagePhotographerName: photographerCredit ?? '',
      };
      const res = await fetch(isNew ? '/api/news' : `/api/news/${params.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast({ title: isNew ? 'Article published' : 'Article saved' });
      navigate(`/news/${data.article.id}`);
    } catch (err) {
      toast({ title: 'Could not save article', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">Loading…</div>;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to News
        </Link>

        <h1 className="text-2xl font-extrabold text-foreground">{isNew ? 'New Article' : 'Edit Article'}</h1>

        <div className="space-y-4 rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Snippet *</label>
            <textarea
              value={form.snippet}
              onChange={(e) => setForm((f) => ({ ...f, snippet: e.target.value }))}
              placeholder="Shown on the dashboard card and News list"
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Body</label>
            <FormattingToolbar textareaRef={bodyRef} value={form.body} onChange={(v) => setForm((f) => ({ ...f, body: v }))} />
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Full article text, shown on the article page"
              rows={6}
              className="w-full resize-y rounded-b-md rounded-t-none border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-muted-foreground">Use the buttons above, or type directly: **bold**, *italic*, __underline__, [text](url), ## Heading, - bullet, 1. numbered.</p>
          </div>
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Image</label>
            {form.imageUrl && (
              <div className="mb-2 aspect-[16/9] w-full overflow-hidden rounded-md border border-border bg-muted">
                <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={form.imageUrl}
                onChange={(e) => {
                  setForm((f) => ({ ...f, imageUrl: e.target.value }));
                  setPhotographerCredit(null);
                }}
                placeholder="Paste a URL, or upload"
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
              <label className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted">
                <Upload className="h-3.5 w-3.5" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {!form.imageUrl && <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="h-3 w-3" /> No image — a generic placeholder shows until one's set.</p>}
          </div>
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Link URL</label>
            <input
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="Optional — makes the article image clickable"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mono-label mb-1.5 block text-muted-foreground">Tag Colour</label>
            <div className="flex gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setForm((f) => ({ ...f, tagColor: c.value }))}
                  className={`h-8 w-8 rounded-full ${c.value} ${form.tagColor === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : isNew ? 'Publish' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
