import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type Template = { id: number; label: string; prompt: string; sortOrder: number };

export function AiHelpTemplatesDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/ai-help/templates', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => setTemplates([]));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const addTemplate = async () => {
    if (!newLabel.trim() || !newPrompt.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/ai-help/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ label: newLabel.trim(), prompt: newPrompt.trim() }),
      });
      setNewLabel('');
      setNewPrompt('');
      load();
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async (id: number, patch: Partial<{ label: string; prompt: string }>) => {
    await fetch(`/api/ai-help/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify(patch),
    });
    load();
    onChanged();
  };

  const deleteTemplate = async (id: number) => {
    await fetch(`/api/ai-help/templates/${id}`, { method: 'DELETE', headers: authHeaders(session) });
    load();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Help Quick Actions</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          These show up as clickable starters above the AI Help question box. Clicking one fills in the question rather than sending it straight away, so there's still room to add specifics.
        </p>

        <div className="space-y-2">
          {templates === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {templates?.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  defaultValue={t.label}
                  key={`label-${t.id}`}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== t.label && updateTemplate(t.id, { label: e.target.value.trim() })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none"
                />
                <input
                  defaultValue={t.prompt}
                  key={`prompt-${t.id}`}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== t.prompt && updateTemplate(t.id, { prompt: e.target.value.trim() })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground outline-none"
                />
              </div>
              <button type="button" onClick={() => deleteTemplate(t.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="mono-label text-muted-foreground">Add a quick action</p>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Button label, e.g. Create news item" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none" />
          <input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Starter text, e.g. Create a news article about "
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={addTemplate}
            disabled={saving || !newLabel.trim() || !newPrompt.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:brightness-95 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted">
            <X className="h-3.5 w-3.5" /> Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
