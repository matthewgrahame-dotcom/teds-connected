import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, FileText, ShieldCheck, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { useToast } from '@/hooks/use-toast';

type ItemType = 'form' | 'policy_signoff';
type ItemDraft = { itemType: ItemType; formId: number | null; workDocumentId: number | null; title: string };
type SectionDraft = { title: string; items: ItemDraft[] };
type FormOption = { id: number; title: string };
type WorkDocOption = { id: number; title: string };
type UserOption = { id: number; firstName: string; lastName: string; role: string };

function emptySection(): SectionDraft {
  return { title: '', items: [] };
}

export default function OnboardingEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<'details' | 'content' | 'permissions'>('details');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState<'draft' | 'published' | 'content' | 'permissions' | false>(false);
  const [programId, setProgramId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [defaultRoles, setDefaultRoles] = useState<string[]>([]);
  const [reminderEmailsEnabled, setReminderEmailsEnabled] = useState(false);
  const [reminderIntervalValue, setReminderIntervalValue] = useState(3);
  const [reminderIntervalUnit, setReminderIntervalUnit] = useState<'day' | 'week'>('day');
  const [autoAssignExternal, setAutoAssignExternal] = useState(false);

  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [itemPickerFor, setItemPickerFor] = useState<number | null>(null);
  const [itemPickerType, setItemPickerType] = useState<ItemType>('form');

  const [viewRoles, setViewRoles] = useState<{ role: string; notifyOnCompletion: boolean }[]>([]);
  const [viewUsers, setViewUsers] = useState<{ userId: number; notifyOnCompletion: boolean }[]>([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  const [users, setUsers] = useState<UserOption[] | null>(null);
  const [forms, setForms] = useState<FormOption[] | null>(null);
  const [workDocs, setWorkDocs] = useState<WorkDocOption[] | null>(null);

  const roles = useMemo(() => Array.from(new Set((users ?? []).map((u) => u.role))).sort(), [users]);

  useEffect(() => {
    fetch('/api/users', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setUsers(rows.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role }))))
      .catch(() => setUsers([]));
    fetch('/api/forms/admin', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setForms(rows.map((f) => ({ id: f.id, title: f.title }))))
      .catch(() => setForms([]));
    fetch('/api/work/documents', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => setWorkDocs(rows.map((d) => ({ id: d.id, title: d.title }))))
      .catch(() => setWorkDocs([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/onboarding/admin/programs/${params.id}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setProgramId(data.id);
        setTitle(data.title);
        setDefaultRoles(data.defaultRoles ?? []);
        setReminderEmailsEnabled(data.reminderEmailsEnabled);
        setReminderIntervalValue(data.reminderIntervalValue);
        setReminderIntervalUnit(data.reminderIntervalUnit === 'week' ? 'week' : 'day');
        setAutoAssignExternal(data.autoAssignExternal);
        setSections(
          (data.sections ?? []).map((s: any) => ({
            title: s.title,
            items: (s.items ?? []).map((i: any) => ({ itemType: i.itemType, formId: i.formId, workDocumentId: i.workDocumentId, title: i.title })),
          })),
        );
        setViewRoles(data.viewRoleAssignments?.map((r: any) => ({ role: r.role, notifyOnCompletion: r.notifyOnCompletion })) ?? []);
        setViewUsers(data.viewUserAssignments?.map((u: any) => ({ userId: u.userId, notifyOnCompletion: u.notifyOnCompletion })) ?? []);
      })
      .catch(() => toast({ title: "Couldn't load this program", variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const toggleRole = (role: string) => setDefaultRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const saveDetails = async (status: 'draft' | 'published') => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(status);
    try {
      if (isNew) {
        const res = await fetch('/api/onboarding/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({ title: title.trim(), defaultRoles }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the program');
        // Status/reminder fields for a brand-new program are just the
        // defaults until it's saved once more from the loaded editor --
        // simplest to redirect into edit mode and let the next save (now
        // PATCH) carry the rest, same two-step creation flow ProgramEditorPage
        // and FormEditorPage already use.
        navigate(`/admin/onboarding/${data.program.id}`);
        toast({ title: 'Program created' });
        return;
      }
      const res = await fetch(`/api/onboarding/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          title: title.trim(),
          defaultRoles,
          status,
          reminderEmailsEnabled,
          reminderIntervalValue,
          reminderIntervalUnit,
          autoAssignExternal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast({ title: status === 'published' ? 'Program published' : 'Draft saved' });
    } catch (err) {
      toast({ title: 'Could not save', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveContent = async () => {
    if (!programId) return;
    setSaving('content');
    try {
      const res = await fetch(`/api/onboarding/programs/${programId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ sections: sections.map((s) => ({ title: s.title, items: s.items.map((i) => ({ itemType: i.itemType, formId: i.formId, workDocumentId: i.workDocumentId })) })) }),
      });
      if (!res.ok) throw new Error('Could not save content');
      toast({ title: 'Content saved' });
    } catch (err) {
      toast({ title: 'Could not save content', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!programId) return;
    setSaving('permissions');
    try {
      const res = await fetch(`/api/onboarding/programs/${programId}/view-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ roles: viewRoles, userIds: viewUsers }),
      });
      if (!res.ok) throw new Error('Could not save permissions');
      toast({ title: 'Permissions saved' });
    } catch (err) {
      toast({ title: 'Could not save permissions', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -- Content tab helpers ---------------------------------------------------
  const addSection = () => setSections((prev) => [...prev, emptySection()]);
  const removeSection = (index: number) => setSections((prev) => prev.filter((_, i) => i !== index));
  const moveSection = (index: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const updateSectionTitle = (index: number, value: string) => setSections((prev) => prev.map((s, i) => (i === index ? { ...s, title: value } : s)));

  const addItem = (sectionIndex: number, item: ItemDraft) => {
    setSections((prev) => prev.map((s, i) => (i === sectionIndex ? { ...s, items: [...s.items, item] } : s)));
    setItemPickerFor(null);
  };
  const removeItem = (sectionIndex: number, itemIndex: number) => {
    setSections((prev) => prev.map((s, i) => (i === sectionIndex ? { ...s, items: s.items.filter((_, ii) => ii !== itemIndex) } : s)));
  };
  const moveItem = (sectionIndex: number, itemIndex: number, dir: -1 | 1) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        const target = itemIndex + dir;
        if (target < 0 || target >= s.items.length) return s;
        const items = [...s.items];
        [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
        return { ...s, items };
      }),
    );
  };

  if (loading) {
    return (
      <div className="px-5 py-8 lg:px-10 lg:py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/admin/onboarding" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Onboarding Programs
        </Link>

        <h1 className="text-2xl font-extrabold text-foreground">{isNew ? 'Create Onboarding Program' : title || 'Onboarding Program'}</h1>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content" disabled={isNew}>Content</TabsTrigger>
            <TabsTrigger value="permissions" disabled={isNew}>Permissions</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'details' && (
          <section className="space-y-5 rounded-xl border border-card-border bg-card p-5 shell-shadow">
            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                placeholder="Onboarding Program - Store Manager"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-foreground">Default Role(s)</label>
              <p className="mb-2 text-xs text-muted-foreground">Anyone in one of these roles gets this checklist on their My Tasks.</p>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${defaultRoles.includes(role) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                  >
                    {role}
                  </button>
                ))}
                {roles.length === 0 && <p className="text-xs text-muted-foreground">No roles found.</p>}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <SettingToggle
                label="Reminder Emails"
                hint="Captured for later, but Connected has no email sending set up yet, so this doesn't send anything yet."
                checked={reminderEmailsEnabled}
                onChange={setReminderEmailsEnabled}
              />
              {reminderEmailsEnabled && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={reminderIntervalValue}
                    onChange={(e) => setReminderIntervalValue(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-accent"
                  />
                  <select
                    value={reminderIntervalUnit}
                    onChange={(e) => setReminderIntervalUnit(e.target.value as 'day' | 'week')}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <SettingToggle
                label="Auto Assign to User(s) Created via External Source"
                hint="Captured for later -- no external HR/candidate-system integration exists yet, so this doesn't do anything yet."
                checked={autoAssignExternal}
                onChange={setAutoAssignExternal}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => saveDetails('draft')}
                disabled={saving !== false}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-extrabold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {saving === 'draft' ? 'Saving…' : isNew ? 'Create Program' : 'Save As Draft'}
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={() => saveDetails('published')}
                  disabled={saving !== false}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saving === 'published' ? 'Publishing…' : 'Save & Publish'}
                </button>
              )}
            </div>
          </section>
        )}

        {tab === 'content' && !isNew && (
          <section className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="rounded-xl border border-card-border bg-card shell-shadow">
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                    placeholder="Section title (e.g. Required forms to complete)"
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm font-bold outline-none focus:border-accent"
                  />
                  <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === sections.length - 1} className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSection(sectionIndex)} className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-border">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        {item.itemType === 'form' ? <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className="shrink-0 font-bold text-foreground">{item.itemType === 'form' ? 'Form:' : 'Policy Sign-off:'}</span>
                        <span className="truncate text-foreground">{item.title}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => moveItem(sectionIndex, itemIndex, -1)} disabled={itemIndex === 0} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => moveItem(sectionIndex, itemIndex, 1)} disabled={itemIndex === section.items.length - 1} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeItem(sectionIndex, itemIndex)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {section.items.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No items yet.</p>}
                </div>

                <div className="border-t border-border p-3">
                  {itemPickerFor === sectionIndex ? (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex overflow-hidden rounded-md border border-border text-xs font-bold">
                          {(['form', 'policy_signoff'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setItemPickerType(t)}
                              className={`px-3 py-1.5 transition ${itemPickerType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                              {t === 'form' ? 'Form' : 'Policy Sign-off'}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => setItemPickerFor(null)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {itemPickerType === 'form'
                          ? (forms ?? []).map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => addItem(sectionIndex, { itemType: 'form', formId: f.id, workDocumentId: null, title: f.title })}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                              >
                                {f.title}
                              </button>
                            ))
                          : (workDocs ?? []).map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => addItem(sectionIndex, { itemType: 'policy_signoff', formId: null, workDocumentId: d.id, title: d.title })}
                                className="block w-full rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                              >
                                {d.title}
                              </button>
                            ))}
                        {itemPickerType === 'form' && (forms ?? []).length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No forms found.</p>}
                        {itemPickerType === 'policy_signoff' && (workDocs ?? []).length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No documents found.</p>}
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setItemPickerFor(sectionIndex)} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSection}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Add Section
            </button>

            <div className="flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={saveContent}
                disabled={saving !== false}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving === 'content' ? 'Saving…' : 'Save Content'}
              </button>
            </div>
          </section>
        )}

        {tab === 'permissions' && !isNew && (
          <section className="space-y-5 rounded-xl border border-card-border bg-card p-5 shell-shadow">
            <div>
              <p className="text-sm font-bold text-foreground">Who Can View Reporting</p>
              <p className="mb-2 text-xs text-muted-foreground">Leave empty for the default (any full-level admin can view). Add a role or person to restrict it, and choose whether they're notified when someone completes this program.</p>

              <p className="mono-label mb-1.5 text-muted-foreground">By Role</p>
              <div className="space-y-1">
                {viewRoles.map((r) => (
                  <div key={r.role} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{r.role}</span>
                    <div className="flex items-center gap-3">
                      <NotifyToggle checked={r.notifyOnCompletion} onChange={(v) => setViewRoles((prev) => prev.map((x) => (x.role === r.role ? { ...x, notifyOnCompletion: v } : x)))} />
                      <button type="button" onClick={() => setViewRoles((prev) => prev.filter((x) => x.role !== r.role))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roles
                  .filter((role) => !viewRoles.some((r) => r.role === role))
                  .map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setViewRoles((prev) => [...prev, { role, notifyOnCompletion: false }])}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted/70"
                    >
                      + {role}
                    </button>
                  ))}
              </div>

              <p className="mono-label mb-1.5 mt-4 text-muted-foreground">By Person</p>
              <div className="space-y-1">
                {viewUsers.map((vu) => {
                  const user = (users ?? []).find((u) => u.id === vu.userId);
                  return (
                    <div key={vu.userId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{user ? `${user.firstName} ${user.lastName}` : `User #${vu.userId}`}</span>
                      <div className="flex items-center gap-3">
                        <NotifyToggle checked={vu.notifyOnCompletion} onChange={(v) => setViewUsers((prev) => prev.map((x) => (x.userId === vu.userId ? { ...x, notifyOnCompletion: v } : x)))} />
                        <button type="button" onClick={() => setViewUsers((prev) => prev.filter((x) => x.userId !== vu.userId))} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setUserPickerOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add person
              </button>
              {userPickerOpen && (
                <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border p-2">
                  {(users ?? [])
                    .filter((u) => !viewUsers.some((vu) => vu.userId === u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setViewUsers((prev) => [...prev, { userId: u.id, notifyOnCompletion: false }]);
                          setUserPickerOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-muted"
                      >
                        {u.firstName} {u.lastName}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={savePermissions}
                disabled={saving !== false}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving === 'permissions' ? 'Saving…' : 'Save Permissions'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SettingToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function NotifyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> Notify on completion
    </label>
  );
}
