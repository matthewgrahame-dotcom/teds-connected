import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ChevronLeft, Save, Copy, Plus, Trash2, GripVertical, Check, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';

type FieldType = 'text' | 'textarea' | 'number' | 'currency' | 'radio' | 'select' | 'file';
type FieldDraft = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string; // comma-separated in the UI, split to an array on save
  helpText: string;
  section: string;
};
type Category = { id: number; name: string };

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'select', label: 'Dropdown' },
  { value: 'file', label: 'File upload' },
];

function emptyField(): FieldDraft {
  return { key: '', label: '', type: 'text', required: false, options: '', helpText: '', section: '' };
}

export default function FormEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState<'draft' | 'live' | false>(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [slug, setSlug] = useState('');

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [groupedFields, setGroupedFields] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [autoArchive, setAutoArchive] = useState(false);
  const [notifyUserName, setNotifyUserName] = useState('');
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string }[] | null>(null);
  const [fields, setFields] = useState<FieldDraft[]>([emptyField()]);
  const [copied, setCopied] = useState(false);

  const instructionsRef = useRef(instructions);
  instructionsRef.current = instructions;

  useEffect(() => {
    fetch('/api/forms/categories', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
    fetch('/api/users', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/forms/admin/${params.id}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setFormId(data.id);
        setSlug(data.slug);
        setTitle(data.title);
        setInstructions(data.instructions ?? '');
        setSelectedCategoryIds(data.categoryIds ?? []);
        setIsPublic(data.isPublic);
        setGroupedFields(data.groupedFields);
        setShowThankYouMessage(data.showThankYouMessage);
        setThankYouMessage(data.thankYouMessage ?? '');
        setAutoArchive(data.autoArchive);
        setNotifyUserName(data.notifyUserName ?? '');
        setFields(
          data.fields.length
            ? data.fields.map((f: any) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: !!f.required,
                options: (f.options ?? []).join(', '),
                helpText: f.helpText ?? '',
                section: f.section ?? '',
              }))
            : [emptyField()],
        );
      })
      .catch(() => toast({ title: "Couldn't load this form", variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const updateField = (index: number, patch: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };
  const addField = () => setFields((prev) => [...prev, emptyField()]);
  const removeField = (index: number) => setFields((prev) => prev.filter((_, i) => i !== index));

  const buildPayload = (status: 'draft' | 'live') => ({
    title: title.trim(),
    instructions: instructionsRef.current,
    status,
    isPublic,
    groupedFields,
    showThankYouMessage,
    thankYouMessage: thankYouMessage.trim() || null,
    autoArchive,
    notifyUserName: notifyUserName || null,
    categoryIds: selectedCategoryIds,
    fields: fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        key: f.key.trim() || undefined,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.options.trim() ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        helpText: f.helpText.trim() || undefined,
        section: f.section.trim() || undefined,
      })),
  });

  const save = async (status: 'draft' | 'live') => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (fields.filter((f) => f.label.trim()).length === 0) {
      toast({ title: 'At least one field is required', variant: 'destructive' });
      return;
    }
    setSaving(status);
    try {
      const payload = buildPayload(status);
      const res = await fetch(isNew ? '/api/forms' : `/api/forms/${formId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast({ title: status === 'live' ? 'Form published' : 'Saved as draft' });
      navigate(`/admin/forms/${data.form.id}`);
      if (isNew) {
        setFormId(data.form.id);
        setSlug(data.form.slug);
      }
    } catch (err) {
      toast({ title: 'Could not save form', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const formUrl = slug ? `${window.location.origin}/people/forms/${slug}` : '';

  const copyUrl = async () => {
    if (!formUrl) return;
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">Loading…</div>;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/people/forms" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Forms
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">{isNew ? 'New Form' : 'Edit Form'}</h1>
          {!isNew && (
            <Link href={`/admin/forms/${formId}/submissions`} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
              <Inbox className="h-3.5 w-3.5" /> View Submissions
            </Link>
          )}
        </div>

        {/* Details */}
        <section className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <h2 className="mono-label mb-4 border-b border-border pb-3 text-muted-foreground">Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-bold text-foreground">
                Title <span className="rounded bg-muted px-1.5 text-[10px] font-extrabold text-muted-foreground">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Instructions</label>
              <RichTextEditor value={instructions} onChange={setInstructions} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">Form Category(s)</label>
              <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
                {categories === null && <p className="text-xs text-muted-foreground">Loading…</p>}
                {categories?.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedCategoryIds.includes(c.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Fields */}
        <section className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="mono-label text-muted-foreground">Fields</h2>
            <button type="button" onClick={addField} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add Field
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Field label"
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm outline-none"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                    className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 pl-6 sm:grid-cols-2">
                  <input
                    value={field.section}
                    onChange={(e) => updateField(i, { section: e.target.value })}
                    placeholder="Section heading (optional)"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  />
                  <input
                    value={field.helpText}
                    onChange={(e) => updateField(i, { helpText: e.target.value })}
                    placeholder="Help text (optional)"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  />
                  {(field.type === 'radio' || field.type === 'select') && (
                    <input
                      value={field.options}
                      onChange={(e) => updateField(i, { options: e.target.value })}
                      placeholder="Options, comma-separated"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none sm:col-span-2"
                    />
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl border border-card-border bg-card p-5 shell-shadow">
          <h2 className="mono-label mb-4 border-b border-border pb-3 text-muted-foreground">Settings</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-foreground">Private URL</span>
              {formUrl ? (
                <button type="button" onClick={copyUrl} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : formUrl}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Save the form first to get its URL</span>
              )}
            </div>
            <SettingToggle label="Public URL" hint="Off requires a Connected login to view/submit this form (default, matches every other form)." checked={isPublic} onChange={setIsPublic} />
            <SettingToggle label="Grouped Fields" hint="Groups fields under their section heading on the submission page instead of one flat list." checked={groupedFields} onChange={setGroupedFields} />
            <div>
              <SettingToggle label="Show Thank You Message" hint="Shows a custom message after submission instead of the generic confirmation." checked={showThankYouMessage} onChange={setShowThankYouMessage} />
              {showThankYouMessage && (
                <textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Thanks! Your form has been submitted."
                  rows={2}
                  className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              )}
            </div>
            <SettingToggle label="Auto Archive" hint="Stored for now -- no schedule/trigger is defined yet for what should cause this to fire." checked={autoArchive} onChange={setAutoArchive} />
            <div>
              <p className="font-bold text-foreground">Notify on Submission</p>
              <p className="mb-1.5 text-xs text-muted-foreground">Posts a Ted's Talks message to this person whenever someone submits this form.</p>
              <select
                value={notifyUserName}
                onChange={(e) => setNotifyUserName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
              >
                <option value="">No one (don't notify)</option>
                {users?.map((u) => (
                  <option key={u.id} value={`${u.firstName} ${u.lastName}`}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={saving !== false}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-extrabold text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            {saving === 'draft' ? 'Saving…' : 'Save As Draft'}
          </button>
          <button
            type="button"
            onClick={() => save('live')}
            disabled={saving !== false}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving === 'live' ? 'Publishing…' : 'Save & Publish'}
          </button>
        </div>
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
