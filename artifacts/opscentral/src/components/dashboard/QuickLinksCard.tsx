import { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { LinkTileGrid, type LinkTile } from './LinkTileGrid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { ICON_KEYS, iconForKey } from './iconRegistry';
import { authHeaders } from '@/lib/sessionAuth';

// TODO: replace with the real Phocal URL for this store (currently
// seo-optimiser.vercel.app -- see the pending Vercel-project-rename
// discussion for phocal-teds.vercel.app).
const PHOCAL_BASE_URL = 'https://seo-optimiser.vercel.app';
const PHOCAL_TOKEN = 'phocal:sso';

type QuickLinkRow = {
  id: number;
  label: string;
  icon: string;
  href: string;
  external: boolean;
  sortOrder: number;
};

export function QuickLinksCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [links, setLinks] = useState<QuickLinkRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<number | 'new' | null>(null);

  const canEdit = session?.level === 'full';

  // Carries the same cross-app token used for the Connected -> Phocal
  // direction, so clicking through doesn't ask to log in again.
  const phocalHref = session?.crossAppToken
    ? `${PHOCAL_BASE_URL}/?ssoToken=${encodeURIComponent(session.crossAppToken)}`
    : PHOCAL_BASE_URL;

  const load = () => {
    fetch('/api/quick-links', { headers: authHeaders(session) })
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => setLinks([]));
  };

  useEffect(load, []);

  const tiles: LinkTile[] = (links ?? []).map((l) => ({
    label: l.label,
    icon: iconForKey(l.icon),
    href: l.href === PHOCAL_TOKEN ? phocalHref : l.href,
    external: l.href === PHOCAL_TOKEN ? true : l.external,
  }));

  const openSettings = () => requirePublishAccess(() => setEditing(true));

  const saveLink = async (id: number, patch: Partial<QuickLinkRow>) => {
    setSaving(id);
    await fetch(`/api/quick-links/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders(session) }, body: JSON.stringify(patch) });
    load();
    setSaving(null);
  };

  const deleteLink = async (id: number) => {
    if (!confirm('Remove this link?')) return;
    setSaving(id);
    await fetch(`/api/quick-links/${id}`, { method: 'DELETE', headers: authHeaders(session) });
    load();
    setSaving(null);
  };

  const addLink = async () => {
    setSaving('new');
    const maxOrder = Math.max(0, ...(links ?? []).map((l) => l.sortOrder));
    await fetch('/api/quick-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ label: 'New Link', icon: 'Link', href: 'https://', external: true, sortOrder: maxOrder + 1 }),
    });
    load();
    setSaving(null);
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!links) return;
    const other = links[index + direction];
    const current = links[index];
    if (!other) return;
    await Promise.all([
      saveLink(current.id, { sortOrder: other.sortOrder }),
      saveLink(other.id, { sortOrder: current.sortOrder }),
    ]);
  };

  return (
    <DashboardCard title="Quick Links" actions={canEdit ? <CardIconButton icon={Settings} label="Edit quick links" onClick={openSettings} /> : <></>}>
      {links === null ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p> : <LinkTileGrid tiles={tiles} />}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quick Links</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {links?.map((link, index) => (
              <div key={link.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-col">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={index === (links?.length ?? 0) - 1} onClick={() => move(index, 1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={link.icon}
                  onChange={(e) => saveLink(link.id, { icon: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
                >
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                <input
                  defaultValue={link.label}
                  key={`label-${link.id}`}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== link.label && saveLink(link.id, { label: e.target.value.trim() })}
                  placeholder="Label"
                  className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm outline-none"
                />
                <input
                  defaultValue={link.href === PHOCAL_TOKEN ? '' : link.href}
                  key={`href-${link.id}`}
                  disabled={link.href === PHOCAL_TOKEN}
                  placeholder={link.href === PHOCAL_TOKEN ? '(auto-linked to Phocal, with SSO)' : 'https:// or /internal/path'}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== link.href && saveLink(link.id, { href: e.target.value.trim() })}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none disabled:opacity-50"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={link.external} disabled={link.href === PHOCAL_TOKEN} onChange={(e) => saveLink(link.id, { external: e.target.checked })} />
                  New tab
                </label>
                <button
                  type="button"
                  aria-label="Remove link"
                  disabled={saving === link.id}
                  onClick={() => deleteLink(link.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={addLink}
              disabled={saving === 'new'}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> Add link
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:brightness-95"
            >
              <X className="h-3.5 w-3.5" /> Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
}
