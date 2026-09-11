import { useEffect, useState } from 'react';
import { User, Phone, Mail, Settings, Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';

type KeyContactRow = {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  sortOrder: number;
};

export function KeyContactsCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [contacts, setContacts] = useState<KeyContactRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<number | 'new' | null>(null);

  const canEdit = session?.level === 'full';

  const load = () => {
    fetch('/api/key-contacts')
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  };

  useEffect(load, []);

  const openSettings = () => requirePublishAccess(() => setEditing(true));

  const saveContact = async (id: number, patch: Partial<KeyContactRow>) => {
    setSaving(id);
    await fetch(`/api/key-contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    load();
    setSaving(null);
  };

  const deleteContact = async (id: number) => {
    if (!confirm('Remove this contact?')) return;
    setSaving(id);
    await fetch(`/api/key-contacts/${id}`, { method: 'DELETE' });
    load();
    setSaving(null);
  };

  const addContact = async () => {
    setSaving('new');
    const maxOrder = Math.max(0, ...(contacts ?? []).map((c) => c.sortOrder));
    await fetch('/api/key-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Contact', role: 'Role', sortOrder: maxOrder + 1 }),
    });
    load();
    setSaving(null);
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!contacts) return;
    const other = contacts[index + direction];
    const current = contacts[index];
    if (!other) return;
    await Promise.all([
      saveContact(current.id, { sortOrder: other.sortOrder }),
      saveContact(other.id, { sortOrder: current.sortOrder }),
    ]);
  };

  return (
    <DashboardCard title="Key Contacts" noPadding actions={canEdit ? <CardIconButton icon={Settings} label="Edit key contacts" onClick={openSettings} /> : <></>}>
      <div className="divide-y divide-border">
        {contacts === null && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {contacts?.map((contact) => (
          <div key={contact.id} data-testid={`contact-${contact.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
              {contact.photoUrl ? (
                <img src={contact.photoUrl} alt={contact.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-foreground">{contact.name}</p>
              <p className="truncate text-sm text-muted-foreground">{contact.role}</p>
              {(contact.phone || contact.email) && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-accent">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-accent">
                      <Mail className="h-3 w-3" /> {contact.email}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Key Contacts</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {contacts?.map((contact, index) => (
              <div key={contact.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={index === (contacts?.length ?? 0) - 1} onClick={() => move(index, 1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                    {contact.photoUrl ? <img src={contact.photoUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                  </span>
                  <input
                    defaultValue={contact.name}
                    key={`name-${contact.id}`}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== contact.name && saveContact(contact.id, { name: e.target.value.trim() })}
                    placeholder="Name"
                    className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm outline-none"
                  />
                  <input
                    defaultValue={contact.role}
                    key={`role-${contact.id}`}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== contact.role && saveContact(contact.id, { role: e.target.value.trim() })}
                    placeholder="Role"
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Remove contact"
                    disabled={saving === contact.id}
                    onClick={() => deleteContact(contact.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 pl-9">
                  <input
                    defaultValue={contact.photoUrl ?? ''}
                    key={`photo-${contact.id}`}
                    onBlur={(e) => e.target.value.trim() !== (contact.photoUrl ?? '') && saveContact(contact.id, { photoUrl: e.target.value.trim() || null })}
                    placeholder="Photo URL"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  />
                  <input
                    defaultValue={contact.phone ?? ''}
                    key={`phone-${contact.id}`}
                    onBlur={(e) => e.target.value.trim() !== (contact.phone ?? '') && saveContact(contact.id, { phone: e.target.value.trim() || null })}
                    placeholder="Phone"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  />
                  <input
                    defaultValue={contact.email ?? ''}
                    key={`email-${contact.id}`}
                    onBlur={(e) => e.target.value.trim() !== (contact.email ?? '') && saveContact(contact.id, { email: e.target.value.trim() || null })}
                    placeholder="Email"
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={addContact}
              disabled={saving === 'new'}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> Add contact
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
