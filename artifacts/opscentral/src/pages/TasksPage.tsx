import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ListChecks, GraduationCap, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type TrainingTask = { type: 'training'; moduleId: number; title: string; programTitle: string };
type RsvpTask = { type: 'rsvp'; eventId: number; title: string; date: string; time: string | null };

export default function TasksPage() {
  const { session } = useAuth();
  const [trainingTasks, setTrainingTasks] = useState<TrainingTask[] | null>(null);
  const [rsvpTasks, setRsvpTasks] = useState<RsvpTask[] | null>(null);
  const [rsvpSaving, setRsvpSaving] = useState<number | null>(null);

  const load = () => {
    fetch('/api/tasks', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setTrainingTasks(data.trainingTasks);
        setRsvpTasks(data.rsvpTasks);
      })
      .catch(() => {
        setTrainingTasks([]);
        setRsvpTasks([]);
      });
  };

  useEffect(load, []);

  const rsvp = async (eventId: number, response: 'yes' | 'no' | 'maybe') => {
    setRsvpSaving(eventId);
    try {
      await fetch(`/api/calendar/events/${eventId}/rsvp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ response }),
      });
      load();
    } finally {
      setRsvpSaving(null);
    }
  };

  const loading = trainingTasks === null || rsvpTasks === null;
  const total = (trainingTasks?.length ?? 0) + (rsvpTasks?.length ?? 0);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">My Tasks</h1>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && total === 0 && <p className="text-sm text-muted-foreground">Nothing outstanding — you're all caught up.</p>}

        {!!rsvpTasks?.length && (
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              <CalendarCheck className="h-3.5 w-3.5" /> Needs your RSVP
            </h2>
            <div className="space-y-2">
              {rsvpTasks.map((t) => (
                <div key={t.eventId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground">{t.date}{t.time ? ` · ${t.time}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['yes', 'maybe', 'no'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={rsvpSaving === t.eventId}
                        onClick={() => rsvp(t.eventId, r)}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-bold capitalize text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!!trainingTasks?.length && (
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" /> Training to complete
            </h2>
            <div className="space-y-2">
              {trainingTasks.map((t) => (
                <Link key={t.moduleId} href="/learn/programs" className="block rounded-lg border border-border p-4 transition hover:bg-muted">
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground">{t.programTitle}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
