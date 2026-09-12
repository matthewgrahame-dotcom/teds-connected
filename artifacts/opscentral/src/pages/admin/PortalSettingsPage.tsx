import { useEffect, useState } from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

type AppSetting = { key: string; value: string };

export default function PortalSettingsPage() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [settings, setSettings] = useState<AppSetting[] | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState<string | 'new' | null>(null);

  const canEdit = session?.level === 'full';

  const load = () => {
    fetch('/api/app-settings', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSettings)
      .catch(() => setSettings([]));
  };

  useEffect(load, []);

  const requestUnlock = () => requirePublishAccess(() => setUnlocked(true));

  const saveValue = async (key: string, value: string) => {
    setSaving(key);
    await fetch(`/api/app-settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ value }),
    });
    load();
    setSaving(null);
  };

  const removeSetting = async (key: string) => {
    if (!confirm(`Remove the "${key}" setting?`)) return;
    setSaving(key);
    await fetch(`/api/app-settings/${encodeURIComponent(key)}`, { method: 'DELETE', headers: authHeaders(session) });
    load();
    setSaving(null);
  };

  const addSetting = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving('new');
    await fetch(`/api/app-settings/${encodeURIComponent(newKey.trim())}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ value: newValue.trim() }),
    });
    setNewKey('');
    setNewValue('');
    load();
    setSaving(null);
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Portal Settings</h1>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <p className="text-sm text-muted-foreground">
            Site-wide settings shared across the portal — currently just the Facebook Stream page, but more can be added here over time
            {' '}(each dashboard widget with its own settings, like Quick Links or Key Contacts, is still edited from that widget directly).
          </p>

          {!canEdit ? (
            <p className="mt-4 text-xs text-muted-foreground">Only full-level staff can edit these — you can still view current values below.</p>
          ) : !unlocked ? (
            <button type="button" onClick={requestUnlock} className="mt-4 text-sm font-bold text-accent hover:underline">
              Unlock editing
            </button>
          ) : null}

          <div className="mt-5 space-y-2 border-t border-border pt-5">
            {settings === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {settings !== null && settings.length === 0 && <p className="text-sm text-muted-foreground">No settings yet.</p>}
            {settings?.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-48 shrink-0 truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">{s.key}</span>
                <input
                  defaultValue={s.value}
                  key={s.value}
                  disabled={!canEdit || !unlocked}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== s.value && saveValue(s.key, e.target.value.trim())}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none disabled:opacity-60"
                />
                {canEdit && unlocked && (
                  <button
                    type="button"
                    aria-label="Remove setting"
                    disabled={saving === s.key}
                    onClick={() => removeSetting(s.key)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && unlocked && (
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="new_setting_key" className="h-9 w-48 shrink-0 rounded-md border border-input bg-background px-2 text-xs outline-none" />
              <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="value" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
              <button
                type="button"
                onClick={addSetting}
                disabled={saving === 'new' || !newKey.trim() || !newValue.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
