import { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, ListChecks, ShieldCheck } from 'lucide-react';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

type AppSetting = { key: string; value: string };
type PortalUser = { id: number; role: string };

// Mirrors CONNECTED_TIERS in lib/connectedTiers.ts -- keep in sync if a
// tier is ever added/removed there.
const CONNECTED_TIER_OPTIONS: { key: string; label: string }[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'manager', label: 'Manager' },
  { key: 'admin', label: 'Admin' },
];
const ROLE_TIER_MAP_KEY = 'connected_role_tier_map';

// Mirrors TASK_TYPES in routes/tasks.ts -- keep in sync if a type is ever
// added/removed there. Labels are the learner-facing copy from the
// Outstanding Tasks card / My Tasks page, not the internal type key.
const TASK_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'training', label: 'Complete Training modules' },
  { key: 'rsvp', label: 'RSVP to events' },
  { key: 'work_documents', label: 'Acknowledge work documents' },
  { key: 'forms', label: 'Complete required Forms' },
  { key: 'onboarding', label: 'Complete Onboarding checklists' },
];
const ENABLED_TASK_TYPES_KEY = 'enabled_task_types';

export default function PortalSettingsPage() {
  const { session, effectiveConnectedTier } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [settings, setSettings] = useState<AppSetting[] | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState<string | 'new' | null>(null);
  const [savingTaskTypes, setSavingTaskTypes] = useState(false);
  const [distinctRoles, setDistinctRoles] = useState<string[] | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const canEdit = meetsConnectedTier(effectiveConnectedTier, 'admin');

  const load = () => {
    fetch('/api/app-settings', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSettings)
      .catch(() => setSettings([]));
    // Pulled LIVE from portal_users rather than hardcoded, so a role that's
    // new (or renamed, or a typo someone's already fixed) shows up here
    // automatically -- an unmapped role already defaults to "basic" server-
    // side (see getConnectedTier), but surfacing it here means that default
    // is a visible, deliberate choice rather than something only discovered
    // by reading the backend code.
    fetch('/api/users', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((users: PortalUser[]) => setDistinctRoles([...new Set(users.map((u) => u.role.trim()).filter(Boolean))].sort()))
      .catch(() => setDistinctRoles([]));
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

  // Stored as one JSON-array value under the generic app_settings key/value
  // store above (same table, same PUT endpoint), rather than a dedicated
  // table -- this is exactly the "future one-off configurable setting" case
  // that table's own schema comment says it's for. Missing/unparseable
  // value in `settings` means "never touched" -> defaults to everything on,
  // matching routes/tasks.ts's own fallback so this page's checkboxes and
  // what actually shows up in Tasks can't disagree about the default.
  const enabledTaskTypesRaw = settings?.find((s) => s.key === ENABLED_TASK_TYPES_KEY)?.value;
  let enabledTaskTypes: string[];
  try {
    const parsed = enabledTaskTypesRaw ? JSON.parse(enabledTaskTypesRaw) : null;
    enabledTaskTypes = Array.isArray(parsed) ? parsed : TASK_TYPE_OPTIONS.map((t) => t.key);
  } catch {
    enabledTaskTypes = TASK_TYPE_OPTIONS.map((t) => t.key);
  }

  const toggleTaskType = async (typeKey: string, checked: boolean) => {
    const next = checked ? [...enabledTaskTypes, typeKey] : enabledTaskTypes.filter((k) => k !== typeKey);
    setSavingTaskTypes(true);
    await fetch(`/api/app-settings/${ENABLED_TASK_TYPES_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ value: JSON.stringify(next) }),
    });
    load();
    setSavingTaskTypes(false);
  };

  // Same generic app_settings storage as Outstanding Tasks above -- one
  // JSON object this time ({ [role]: tier }) rather than an array, since
  // this is a mapping rather than a set of on/off toggles. Unmapped roles
  // simply aren't a key in this object at all (rather than e.g. an explicit
  // "unset" value) -- getConnectedTier already treats "not in the map" the
  // same as "maps to basic", so there's nothing to distinguish here.
  const roleTierMapRaw = settings?.find((s) => s.key === ROLE_TIER_MAP_KEY)?.value;
  let roleTierMap: Record<string, string>;
  try {
    const parsed = roleTierMapRaw ? JSON.parse(roleTierMapRaw) : null;
    roleTierMap = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    roleTierMap = {};
  }

  const setRoleTier = async (role: string, tier: string) => {
    const next = { ...roleTierMap, [role]: tier };
    setSavingRole(role);
    await fetch(`/api/app-settings/${ROLE_TIER_MAP_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ value: JSON.stringify(next) }),
    });
    load();
    setSavingRole(null);
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Portal Settings</h1>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-extrabold text-foreground">Outstanding Tasks</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which task types show up on the Outstanding Tasks dashboard card and the My Tasks page. Unticking a type here
            doesn't delete anything -- it just stops surfacing it as a task (e.g. events still take RSVPs, this only controls
            whether "needs your RSVP" nags people about it).
          </p>

          {!canEdit ? (
            <p className="mt-3 text-xs text-muted-foreground">Only full-level staff can change these.</p>
          ) : (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {TASK_TYPE_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={enabledTaskTypes.includes(opt.key)}
                    disabled={savingTaskTypes || settings === null}
                    onChange={(e) => toggleTaskType(opt.key, e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-extrabold text-foreground">Roles &amp; Access</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Maps each role from User Management to what it can do inside Connected specifically -- separate from Phocal's own
            full/basic access, which stays exactly as-is. A role with nothing picked yet defaults to Basic; that's a deliberate
            safe default, not a bug, so a new or misspelled role never quietly ends up with more access than intended.
          </p>

          {!canEdit ? (
            <p className="mt-3 text-xs text-muted-foreground">Only full-level staff can change these.</p>
          ) : distinctRoles === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading roles…</p>
          ) : distinctRoles.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No roles found yet -- add people in User Management first.</p>
          ) : (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {distinctRoles.map((role) => (
                <div key={role} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{role}</span>
                  <select
                    value={roleTierMap[role] ?? 'basic'}
                    disabled={savingRole === role}
                    onChange={(e) => setRoleTier(role, e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none disabled:opacity-60"
                  >
                    {CONNECTED_TIER_OPTIONS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
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
            {settings !== null && settings.filter((s) => s.key !== ENABLED_TASK_TYPES_KEY).length === 0 && <p className="text-sm text-muted-foreground">No settings yet.</p>}
            {settings
              ?.filter((s) => s.key !== ENABLED_TASK_TYPES_KEY)
              .map((s) => (
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
