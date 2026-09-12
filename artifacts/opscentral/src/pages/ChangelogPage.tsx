import { useEffect, useState } from 'react';
import { Rocket, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

type ChangelogEntry = {
  id: number;
  title: string;
  body: string | null;
  postedBy: string;
  createdAt: string;
};

export default function ChangelogPage() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = session?.level === 'full';

  const load = () => {
    fetch('/api/changelog', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setEntries)
      .catch(() => setEntries([]));
  };

  useEffect(load, []);

  const openAdd = () => requirePublishAccess(() => setAdding(true));

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined }),
      });
      if (res.ok) {
        setTitle('');
        setBody('');
        setAdding(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this update?')) return;
    await fetch(`/api/changelog/${id}`, { method: 'DELETE', headers: authHeaders(session) });
    load();
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">Product Updates</h1>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> Add Update
            </button>
          )}
        </div>

        {adding && (
          <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's new?"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-accent"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details (optional)"
              rows={3}
              className="mt-3 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !title.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:brightness-95 disabled:opacity-50"
              >
                {saving ? 'Posting…' : 'Post Update'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {entries === null && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {entries !== null && entries.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No updates yet.</p>}
          {entries?.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-foreground">{entry.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.postedBy} · {new Date(entry.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {canEdit && (
                  <button type="button" aria-label="Remove update" onClick={() => remove(entry.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {entry.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{entry.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
