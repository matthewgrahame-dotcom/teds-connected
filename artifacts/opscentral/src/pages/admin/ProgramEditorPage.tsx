import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ChevronLeft, Plus, Trash2, GripVertical, Save, Users, UserCog, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { useToast } from '@/hooks/use-toast';

type Level = 'optional' | 'mandatory';
type PortalUserOption = { id: number; firstName: string; lastName: string; role: string };
type UserGroup = { id: number; name: string; members: { userId: number; name: string }[] };
type ProgramModule = { id: number; title: string; externalUrl: string | null; sortOrder: number };
type ProgramSummary = { id: number; title: string };

type ProgramDetail = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  status: 'draft' | 'live' | 'archived';
  startDate: string | null;
  endDate: string | null;
  prerequisitesEnabled: boolean;
  prerequisiteProgramIds: number[];
  prerequisiteConditions: string | null;
  timeLockEnabled: boolean;
  timeLockDetails: string | null;
  recurringEnabled: boolean;
  estimatedTimeEnabled: boolean;
  estimatedTime: string | null;
  recognizePriorCompletions: boolean;
  modules: ProgramModule[];
  roleAssignments: { role: string; level: Level }[];
  userAssignments: { userId: number; level: Level }[];
  groupAssignments: { groupId: number; level: Level }[];
  enrolled: number;
};

export default function ProgramEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<PortalUserOption[] | null>(null);
  const [groups, setGroups] = useState<UserGroup[] | null>(null);
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[] | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleUrl, setNewModuleUrl] = useState('');
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Create-mode uses a lightweight local draft; edit-mode loads the real thing.
  const [draft, setDraft] = useState({ title: '', description: '', category: '', thumbnailUrl: '', startDate: '', endDate: '' });
  const [draftModules, setDraftModules] = useState<{ title: string; externalUrl: string }[]>([]);

  useEffect(() => {
    fetch('/api/users?status=active', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAllUsers)
      .catch(() => setAllUsers([]));
    fetch('/api/user-groups', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
    fetch('/api/training/admin/programs', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ProgramSummary[]) => setAllPrograms(rows.filter((p) => String(p.id) !== params.id)))
      .catch(() => setAllPrograms([]));
  }, []);

  const loadProgram = () => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/training/admin/programs/${params.id}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setProgram)
      .catch(() => setProgram(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadProgram, [params.id]);

  const roles = useMemo(() => Array.from(new Set((allUsers ?? []).map((u) => u.role))).sort(), [allUsers]);

  const createProgram = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/training/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ ...draft, modules: draftModules.filter((m) => m.title.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create the program');
      toast({ title: 'Program created' });
      navigate(`/admin/programs/${data.program.id}`);
    } catch (err) {
      toast({ title: 'Could not create program', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveProgram = async () => {
    if (!program) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/training/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          title: program.title,
          description: program.description,
          category: program.category,
          thumbnailUrl: program.thumbnailUrl,
          status: program.status,
          startDate: program.startDate,
          endDate: program.endDate,
          prerequisitesEnabled: program.prerequisitesEnabled,
          prerequisiteProgramIds: program.prerequisiteProgramIds,
          prerequisiteConditions: program.prerequisiteConditions,
          timeLockEnabled: program.timeLockEnabled,
          timeLockDetails: program.timeLockDetails,
          recurringEnabled: program.recurringEnabled,
          estimatedTimeEnabled: program.estimatedTimeEnabled,
          estimatedTime: program.estimatedTime,
          recognizePriorCompletions: program.recognizePriorCompletions,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not save');

      await fetch(`/api/training/programs/${program.id}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          roles: program.roleAssignments,
          users: program.userAssignments,
          groups: program.groupAssignments,
        }),
      });

      toast({ title: 'Program saved' });
      loadProgram();
    } catch (err) {
      toast({ title: 'Could not save program', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    if (!program || !newModuleTitle.trim()) return;
    const res = await fetch(`/api/training/programs/${program.id}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ title: newModuleTitle.trim(), externalUrl: newModuleUrl.trim() || undefined }),
    });
    if (res.ok) {
      setNewModuleTitle('');
      setNewModuleUrl('');
      loadProgram();
    }
  };

  const updateModule = async (moduleId: number, patch: Partial<{ title: string; externalUrl: string }>) => {
    await fetch(`/api/training/modules/${moduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify(patch),
    });
    loadProgram();
  };

  const removeModule = async (moduleId: number) => {
    if (!confirm('Remove this module?')) return;
    await fetch(`/api/training/modules/${moduleId}`, { method: 'DELETE', headers: authHeaders(session) });
    loadProgram();
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch('/api/user-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    if (res.ok) {
      setNewGroupName('');
      const groupsRes = await fetch('/api/user-groups', { headers: authHeaders(session) });
      setGroups(await groupsRes.json());
    }
  };

  if (!isNew && loading) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">Loading…</div>;
  }
  if (!isNew && !program) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">This program couldn't be found.</div>;
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/admin/programs" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Manage Programs
        </Link>

        <h1 className="text-2xl font-extrabold text-foreground">{isNew ? 'Create Program' : `Edit: ${program!.title}`}</h1>

        {/* Basic info */}
        <Section title="Basic Info">
          <FormField label="Program Name" required>
            <input
              value={isNew ? draft.title : program!.title}
              onChange={(e) => (isNew ? setDraft((d) => ({ ...d, title: e.target.value })) : setProgram((p) => p && { ...p, title: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              rows={3}
              value={isNew ? draft.description : program!.description ?? ''}
              onChange={(e) => (isNew ? setDraft((d) => ({ ...d, description: e.target.value })) : setProgram((p) => p && { ...p, description: e.target.value }))}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category">
              <input
                value={isNew ? draft.category : program!.category ?? ''}
                onChange={(e) => (isNew ? setDraft((d) => ({ ...d, category: e.target.value })) : setProgram((p) => p && { ...p, category: e.target.value }))}
                placeholder="e.g. Sales Training"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
            <FormField label="Thumbnail URL">
              <input
                value={isNew ? draft.thumbnailUrl : program!.thumbnailUrl ?? ''}
                onChange={(e) => (isNew ? setDraft((d) => ({ ...d, thumbnailUrl: e.target.value })) : setProgram((p) => p && { ...p, thumbnailUrl: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start Date" hint="Free text, e.g. Sep 2026">
              <input
                value={isNew ? draft.startDate : program!.startDate ?? ''}
                onChange={(e) => (isNew ? setDraft((d) => ({ ...d, startDate: e.target.value })) : setProgram((p) => p && { ...p, startDate: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
            <FormField label="End Date">
              <input
                value={isNew ? draft.endDate : program!.endDate ?? ''}
                onChange={(e) => (isNew ? setDraft((d) => ({ ...d, endDate: e.target.value })) : setProgram((p) => p && { ...p, endDate: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </FormField>
          </div>
          {!isNew && (
            <FormField label="Status">
              <select
                value={program!.status}
                onChange={(e) => setProgram((p) => p && { ...p, status: e.target.value as ProgramDetail['status'] })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none"
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="archived">Archived</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{program!.enrolled} people currently enrolled (resolved from role/user/group assignments below; always 0 while Draft).</p>
            </FormField>
          )}
        </Section>

        {/* Modules -- only once the program exists, since modules need a real programId */}
        {isNew ? (
          <Section title="Modules">
            {draftModules.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={m.title} onChange={(e) => setDraftModules((ms) => ms.map((mm, idx) => (idx === i ? { ...mm, title: e.target.value } : mm)))} placeholder="Module title" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
                <input value={m.externalUrl} onChange={(e) => setDraftModules((ms) => ms.map((mm, idx) => (idx === i ? { ...mm, externalUrl: e.target.value } : mm)))} placeholder="Link (optional)" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
                <button type="button" onClick={() => setDraftModules((ms) => ms.filter((_, idx) => idx !== i))} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setDraftModules((ms) => [...ms, { title: '', externalUrl: '' }])} className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline">
              <Plus className="h-4 w-4" /> Add module
            </button>
          </Section>
        ) : (
          <Section title="Modules">
            {program!.modules.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <input defaultValue={m.title} key={`t-${m.id}`} onBlur={(e) => e.target.value.trim() && e.target.value !== m.title && updateModule(m.id, { title: e.target.value.trim() })} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
                <input defaultValue={m.externalUrl ?? ''} key={`u-${m.id}`} onBlur={(e) => e.target.value !== (m.externalUrl ?? '') && updateModule(m.id, { externalUrl: e.target.value })} placeholder="Link (optional)" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
                <button type="button" onClick={() => removeModule(m.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="New module title" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
              <input value={newModuleUrl} onChange={(e) => setNewModuleUrl(e.target.value)} placeholder="Link (optional)" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none" />
              <button type="button" onClick={addModule} disabled={!newModuleTitle.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Section>
        )}

        {!isNew && program && (
          <>
            {/* Advanced settings */}
            <Section title="Advanced Settings" icon={Layers}>
              <ToggleRow
                label="Pre-requisites"
                checked={program.prerequisitesEnabled}
                onChange={(v) => setProgram((p) => p && { ...p, prerequisitesEnabled: v })}
              >
                {program.prerequisitesEnabled && (
                  <div className="mt-2 space-y-2 pl-1">
                    <p className="text-xs font-semibold text-muted-foreground">Pre-requisite programs</p>
                    <div className="flex flex-wrap gap-2">
                      {(allPrograms ?? []).map((ap) => {
                        const active = program.prerequisiteProgramIds.includes(ap.id);
                        return (
                          <button
                            key={ap.id}
                            type="button"
                            onClick={() =>
                              setProgram((p) =>
                                p && {
                                  ...p,
                                  prerequisiteProgramIds: active ? p.prerequisiteProgramIds.filter((id) => id !== ap.id) : [...p.prerequisiteProgramIds, ap.id],
                                },
                              )
                            }
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                          >
                            {ap.title}
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      value={program.prerequisiteConditions ?? ''}
                      onChange={(e) => setProgram((p) => p && { ...p, prerequisiteConditions: e.target.value })}
                      placeholder="Conditions (free text)"
                      rows={2}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                )}
              </ToggleRow>
              <ToggleRow label="Time Lock" checked={program.timeLockEnabled} onChange={(v) => setProgram((p) => p && { ...p, timeLockEnabled: v })}>
                {program.timeLockEnabled && (
                  <input
                    value={program.timeLockDetails ?? ''}
                    onChange={(e) => setProgram((p) => p && { ...p, timeLockDetails: e.target.value })}
                    placeholder="Details, e.g. modules unlock weekly"
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                  />
                )}
              </ToggleRow>
              <ToggleRow label="Recurring Program" checked={program.recurringEnabled} onChange={(v) => setProgram((p) => p && { ...p, recurringEnabled: v })} />
              <ToggleRow label="Estimated Time" checked={program.estimatedTimeEnabled} onChange={(v) => setProgram((p) => p && { ...p, estimatedTimeEnabled: v })}>
                {program.estimatedTimeEnabled && (
                  <input
                    value={program.estimatedTime ?? ''}
                    onChange={(e) => setProgram((p) => p && { ...p, estimatedTime: e.target.value })}
                    placeholder="e.g. 45 mins"
                    className="mt-2 h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                  />
                )}
              </ToggleRow>
              <ToggleRow
                label="Recognise Prior Activity Completions"
                checked={program.recognizePriorCompletions}
                onChange={(v) => setProgram((p) => p && { ...p, recognizePriorCompletions: v })}
              />
            </Section>

            {/* Assignments */}
            <Section title="Assigned To" icon={UserCog}>
              <p className="text-xs font-semibold text-muted-foreground">By Role</p>
              <div className="space-y-1.5">
                {roles.map((role) => {
                  const current = program.roleAssignments.find((r) => r.role === role)?.level ?? null;
                  return (
                    <div key={role} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{role}</span>
                      <LevelPicker
                        value={current}
                        onChange={(level) =>
                          setProgram((p) => {
                            if (!p) return p;
                            const rest = p.roleAssignments.filter((r) => r.role !== role);
                            return { ...p, roleAssignments: level ? [...rest, { role, level }] : rest };
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs font-semibold text-muted-foreground">By User</p>
              <div className="space-y-1.5">
                {program.userAssignments.map((ua) => {
                  const user = (allUsers ?? []).find((u) => u.id === ua.userId);
                  return (
                    <div key={ua.userId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{user ? `${user.firstName} ${user.lastName}` : `User #${ua.userId}`}</span>
                      <div className="flex items-center gap-2">
                        <LevelPicker
                          value={ua.level}
                          onChange={(level) =>
                            setProgram((p) => p && { ...p, userAssignments: p.userAssignments.map((u) => (u.userId === ua.userId ? { ...u, level: level ?? 'optional' } : u)) })
                          }
                        />
                        <button type="button" onClick={() => setProgram((p) => p && { ...p, userAssignments: p.userAssignments.filter((u) => u.userId !== ua.userId) })} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setUserPickerOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline">
                <Plus className="h-4 w-4" /> Add person
              </button>
              {userPickerOpen && (
                <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-border p-2">
                  {(allUsers ?? [])
                    .filter((u) => !program.userAssignments.some((a) => a.userId === u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setProgram((p) => p && { ...p, userAssignments: [...p.userAssignments, { userId: u.id, level: 'optional' }] });
                          setUserPickerOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      >
                        {u.firstName} {u.lastName}
                      </button>
                    ))}
                </div>
              )}

              <p className="mt-4 text-xs font-semibold text-muted-foreground">By User Group</p>
              <div className="space-y-1.5">
                {program.groupAssignments.map((ga) => {
                  const group = (groups ?? []).find((g) => g.id === ga.groupId);
                  return (
                    <div key={ga.groupId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{group?.name ?? `Group #${ga.groupId}`} <span className="text-xs text-muted-foreground">({group?.members.length ?? 0})</span></span>
                      <div className="flex items-center gap-2">
                        <LevelPicker
                          value={ga.level}
                          onChange={(level) =>
                            setProgram((p) => p && { ...p, groupAssignments: p.groupAssignments.map((g) => (g.groupId === ga.groupId ? { ...g, level: level ?? 'optional' } : g)) })
                          }
                        />
                        <button type="button" onClick={() => setProgram((p) => p && { ...p, groupAssignments: p.groupAssignments.filter((g) => g.groupId !== ga.groupId) })} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setGroupPickerOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline">
                <Plus className="h-4 w-4" /> Add group
              </button>
              {groupPickerOpen && (
                <div className="mt-2 space-y-2 rounded-md border border-border p-2">
                  {(groups ?? [])
                    .filter((g) => !program.groupAssignments.some((a) => a.groupId === g.id))
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setProgram((p) => p && { ...p, groupAssignments: [...p.groupAssignments, { groupId: g.id, level: 'optional' }] });
                          setGroupPickerOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      >
                        {g.name} <span className="text-xs text-muted-foreground">({g.members.length})</span>
                      </button>
                    ))}
                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group name" className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none" />
                    <button type="button" onClick={createGroup} disabled={!newGroupName.trim()} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                      Create
                    </button>
                  </div>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" /> Manage members from the Portal Settings area once created (basic groups for now).</p>
                </div>
              )}
            </Section>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={isNew ? createProgram : saveProgram}
            disabled={saving || (isNew ? !draft.title.trim() : false)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : isNew ? 'Create Program' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Layers; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mono-label mb-1.5 block text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-input px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {children}
    </div>
  );
}

function LevelPicker({ value, onChange }: { value: Level | null; onChange: (v: Level | null) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-border text-xs font-bold">
      {(['optional', 'mandatory'] as const).map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(value === level ? null : level)}
          className={`px-2 py-1 capitalize transition ${value === level ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
