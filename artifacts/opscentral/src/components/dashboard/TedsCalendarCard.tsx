import { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { Clock, MapPin, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { Calendar } from '@/components/ui/calendar';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

type Rsvp = { staffName: string; response: 'yes' | 'no' | 'maybe' };

type CalendarEvent = {
  id: number;
  date: string; // 'yyyy-MM-dd', local date -- see toDateKey below for why not an ISO/UTC string
  title: string;
  time?: string | null;
  location?: string | null;
  requiresRsvp: boolean;
  rsvps: Rsvp[];
};

/** 'yyyy-MM-dd' from LOCAL date parts, not Date#toISOString(). toISOString
 * converts to UTC first, which silently shifts the date for anyone east of
 * UTC (all of Australia) -- e.g. a local midnight in Melbourne becomes the
 * previous day once converted to UTC, so a day's events would look like
 * they belong to the day before. date-fns' format() uses local time, so
 * this stays correct in AEST/AEDT (and everywhere else). */
function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// TODO: once role-based permissions exist, restrict adding events to
// Admin/Manager levels -- open to any logged-in staff member for now, per
// explicit instruction to scope that properly later. Editing/deleting
// someone else's event is more consequential though, so those two are
// full-level + publish-password gated (see canEdit below), matching how
// Ted's Talks message deletion works elsewhere in this app.
export function TedsCalendarCard() {
  const { session, effectiveConnectedTier } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const canEdit = meetsConnectedTier(effectiveConnectedTier, 'admin');
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: '', time: '', location: '', requiresRsvp: false });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rsvpSaving, setRsvpSaving] = useState<number | null>(null);

  const loadEvents = async () => {
    try {
      const resp = await fetch('/api/calendar/events', { headers: authHeaders(session) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setEvents(data);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(toDateKey(selectedDate)) ?? [];

  const closeForm = () => {
    setShowAddForm(false);
    setEditingEventId(null);
    setDraft({ title: '', time: '', location: '', requiresRsvp: false });
    setError(null);
  };

  const openAddForm = () => {
    setEditingEventId(null);
    setDraft({ title: '', time: '', location: '', requiresRsvp: false });
    setShowAddForm(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    requirePublishAccess(() => {
      setEditingEventId(event.id);
      setDraft({ title: event.title, time: event.time ?? '', location: event.location ?? '', requiresRsvp: event.requiresRsvp });
      setShowAddForm(true);
    });
  };

  const handleSaveEvent = async () => {
    if (!draft.title.trim() || !session?.name) return;
    setSubmitting(true);
    setError(null);
    try {
      const isEditing = editingEventId !== null;
      const resp = await fetch(isEditing ? `/api/calendar/events/${editingEventId}` : '/api/calendar/events', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          title: draft.title.trim(),
          date: toDateKey(selectedDate),
          time: draft.time.trim() || undefined,
          location: draft.location.trim() || undefined,
          requiresRsvp: draft.requiresRsvp,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'save' : 'add'} event`);
      }
      closeForm();
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    if (!confirm(`Remove "${event.title}"?`)) return;
    requirePublishAccess(async () => {
      setDeletingId(event.id);
      try {
        await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE', headers: authHeaders(session) });
        await loadEvents();
      } finally {
        setDeletingId(null);
      }
    });
  };

  const rsvp = async (eventId: number, response: 'yes' | 'no' | 'maybe') => {
    setRsvpSaving(eventId);
    try {
      await fetch(`/api/calendar/events/${eventId}/rsvp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ response }),
      });
      await loadEvents();
    } finally {
      setRsvpSaving(null);
    }
  };

  return (
    <DashboardCard title="Teds Calendar" actions={<></>}>
      <Calendar
        mode="single"
        required
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          closeForm();
        }}
        modifiers={{ hasEvent: (date) => eventsByDate.has(toDateKey(date)) }}
        modifiersClassNames={{
          hasEvent: "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-['']",
        }}
        classNames={{ root: 'w-full' }}
        className="mx-auto"
        data-testid="calendar-teds"
      />

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, d MMMM')}
          </p>
          <button
            type="button"
            data-testid="button-add-event"
            onClick={() => (showAddForm ? closeForm() : openAddForm())}
            aria-label={showAddForm ? 'Cancel' : 'Add event'}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        {showAddForm && (
          <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
            <input
              data-testid="input-event-title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Event title"
              className="w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <input
                data-testid="input-event-time"
                value={draft.time}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                placeholder="Time (optional)"
                className="w-1/2 rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
              <input
                data-testid="input-event-location"
                value={draft.location}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                placeholder="Location (optional)"
                className="w-1/2 rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={draft.requiresRsvp} onChange={(e) => setDraft((d) => ({ ...d, requiresRsvp: e.target.checked }))} />
              Needs an RSVP (shows up on people's Tasks/Bell until they respond)
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="button"
              data-testid="button-save-event"
              onClick={handleSaveEvent}
              disabled={submitting || !draft.title.trim()}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : editingEventId !== null ? 'Save Changes' : `Add to ${format(selectedDate, 'd MMM')}`}
            </button>
          </div>
        )}

        {events === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : selectedEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="text-no-events-selected-day">
            No events on this day.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {selectedEvents.map((event) => {
              const myRsvp = event.rsvps.find((r) => r.staffName === session?.name);
              return (
                <div key={event.id} data-testid={`event-${event.id}`} className="py-3 first:pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-extrabold text-foreground">{event.title}</p>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit event"
                          onClick={() => openEditForm(event)}
                          className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete event"
                          disabled={deletingId === event.id}
                          onClick={() => handleDeleteEvent(event)}
                          className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {(event.time || event.location) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {event.time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {event.location}
                        </span>
                      )}
                    </div>
                  )}
                  {event.requiresRsvp && (
                    <div className="mt-2 flex items-center gap-2">
                      {(['yes', 'maybe', 'no'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={rsvpSaving === event.id}
                          onClick={() => rsvp(event.id, r)}
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                            myRsvp?.response === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
