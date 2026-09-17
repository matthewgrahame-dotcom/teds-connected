import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type Location = { id: number; name: string; locationType: string; suburb: string | null; state: string | null; phone: string | null };
type DraftLocation = { name: string; locationType: string; suburb: string; state: string; phone: string };

const EMPTY_DRAFT: DraftLocation = { name: '', locationType: 'Retail', suburb: '', state: '', phone: '' };

function toDraft(l: Location): DraftLocation {
  return { name: l.name, locationType: l.locationType, suburb: l.suburb ?? '', state: l.state ?? '', phone: l.phone ?? '' };
}

export default function ManageLocationsPage() {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<DraftLocation>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    fetch('/api/locations', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setLocations)
      .catch(() => setLocations([]));
  };

  useEffect(load, []);

  const startEdit = (l: Location) => {
    setError(null);
    setEditingId(l.id);
    setDraft(toDraft(l));
  };

  const startNew = () => {
    setError(null);
    setEditingId('new');
    setDraft(EMPTY_DRAFT);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.locationType.trim()) {
      setError('Name and Type are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = editingId === 'new';
      const res = await fetch(isNew ? '/api/locations' : `/api/locations/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          name: draft.name.trim(),
          locationType: draft.locationType.trim(),
          suburb: draft.suburb.trim() || null,
          state: draft.state.trim() || null,
          phone: draft.phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      cancelEdit();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l: Location) => {
    if (!window.confirm(`Delete "${l.name}"? This cannot be undone.`)) return;
    setDeletingId(l.id);
    try {
      await fetch(`/api/locations/${l.id}`, { method: 'DELETE', headers: authHeaders(session) });
      load();
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-accent';

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">Locations</h1>
          </div>
          {editingId === null && (
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> New Location
            </button>
          )}
        </div>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

        {locations === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {locations?.length === 0 && editingId !== 'new' && <p className="text-sm text-muted-foreground">No locations yet.</p>}

        {(locations !== null && (locations.length > 0 || editingId === 'new')) && (
          <div className="overflow-x-auto rounded-xl border border-card-border bg-card shell-shadow">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Suburb</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {editingId === 'new' && (
                  <tr className="bg-accent/5">
                    <td className="px-4 py-2"><input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Teds Melbourne" className={inputClass} /></td>
                    <td className="px-4 py-2"><input value={draft.locationType} onChange={(e) => setDraft({ ...draft, locationType: e.target.value })} placeholder="Retail" className={inputClass} /></td>
                    <td className="px-4 py-2"><input value={draft.suburb} onChange={(e) => setDraft({ ...draft, suburb: e.target.value })} className={inputClass} /></td>
                    <td className="px-4 py-2"><input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} className={inputClass} /></td>
                    <td className="px-4 py-2"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputClass} /></td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={save} disabled={saving} aria-label="Save" className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEdit} aria-label="Cancel" className="grid h-7 w-7 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {locations.map((l) =>
                  editingId === l.id ? (
                    <tr key={l.id} className="bg-accent/5">
                      <td className="px-4 py-2"><input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} /></td>
                      <td className="px-4 py-2"><input value={draft.locationType} onChange={(e) => setDraft({ ...draft, locationType: e.target.value })} className={inputClass} /></td>
                      <td className="px-4 py-2"><input value={draft.suburb} onChange={(e) => setDraft({ ...draft, suburb: e.target.value })} className={inputClass} /></td>
                      <td className="px-4 py-2"><input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} className={inputClass} /></td>
                      <td className="px-4 py-2"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className={inputClass} /></td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={save} disabled={saving} aria-label="Save" className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-50">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={cancelEdit} aria-label="Cancel" className="grid h-7 w-7 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-semibold text-foreground">{l.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.locationType}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.suburb || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.state || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.phone || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(l)}
                            disabled={editingId !== null}
                            aria-label={`Edit ${l.name}`}
                            className="grid h-7 w-7 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(l)}
                            disabled={editingId !== null || deletingId === l.id}
                            aria-label={`Delete ${l.name}`}
                            className="grid h-7 w-7 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
