import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { ExternalLink, GraduationCap, CalendarCheck, FileCheck } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { EmptyState } from './EmptyState';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

// One flattened, type-tagged list built from the same /api/tasks response
// My Tasks (TasksPage.tsx) uses -- this card is just a short preview of it,
// not a separate source of truth, so a task showing here always matches
// what's on the real page (including which types are switched on via
// PortalSettingsPage's "Outstanding Tasks" checkboxes -- the API already
// filters those out, this card doesn't need its own copy of that logic).
type Task =
  | { type: 'training'; moduleId: number; title: string; programTitle: string }
  | { type: 'rsvp'; eventId: number; title: string; date: string; time: string | null }
  | { type: 'work_document'; documentId: number; title: string; categorySlug: string };

const MAX_PREVIEW = 3;

function taskKey(t: Task): string | number {
  return t.type === 'training' ? t.moduleId : t.type === 'rsvp' ? t.eventId : t.documentId;
}

function taskIcon(t: Task) {
  if (t.type === 'training') return GraduationCap;
  if (t.type === 'rsvp') return CalendarCheck;
  return FileCheck;
}

function taskSubtitle(t: Task) {
  if (t.type === 'training') return t.programTitle;
  if (t.type === 'rsvp') return `${t.date}${t.time ? ` · ${t.time}` : ''}`;
  return 'Needs acknowledgment';
}

export function OutstandingTasksCard() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    fetch('/api/tasks', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        const combined: Task[] = [...(data.trainingTasks ?? []), ...(data.rsvpTasks ?? []), ...(data.workDocumentTasks ?? [])];
        setTasks(combined);
      })
      .catch(() => setTasks([]));
  }, []);

  return (
    <DashboardCard
      title="Outstanding Tasks"
      noPadding
      actions={
        <Link href="/tasks" data-testid="link-tasks-view-all">
          <CardIconButton icon={ExternalLink} label="Open tasks" tone="primary" />
        </Link>
      }
    >
      {tasks === null && <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>}
      {tasks?.length === 0 && <EmptyState heading="No tasks" copy="Nothing outstanding — you're all caught up." />}
      <div className="divide-y divide-border">
        {tasks?.slice(0, MAX_PREVIEW).map((t) => {
          const Icon = taskIcon(t);
          return (
            <Link key={taskKey(t)} href="/tasks" data-testid={`task-${t.type}-${taskKey(t)}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/50">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-extrabold text-foreground">{t.title}</p>
                <p className="truncate text-sm text-muted-foreground">{taskSubtitle(t)}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {!!tasks?.length && tasks.length > MAX_PREVIEW && (
        <Link href="/tasks" className="block px-5 py-3 text-center text-xs font-bold text-accent hover:underline">
          +{tasks.length - MAX_PREVIEW} more
        </Link>
      )}
    </DashboardCard>
  );
}
