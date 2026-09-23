import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, CalendarDays, BookOpen, ClipboardList, Sparkles, ExternalLink, Download } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type Task = { type: 'training' | 'rsvp' | 'work_document' | 'form' | 'onboarding' };
type CalendarEvent = { date: string };

export function SiftCard() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks', { headers: authHeaders(session) })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data) => [
          ...(data.trainingTasks ?? []),
          ...(data.rsvpTasks ?? []),
          ...(data.workDocumentTasks ?? []),
          ...(data.formTasks ?? []),
          ...(data.onboardingTasks ?? []),
        ] as Task[])
        .catch(() => [] as Task[]),
      fetch('/api/calendar/events', { headers: authHeaders(session) })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .catch(() => [] as CalendarEvent[]),
    ]).then(([taskRows, eventRows]) => {
      setTasks(taskRows);
      setEvents(eventRows);
    });
  }, [session]);

  const todayKey = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  const summary = {
    tasks: tasks?.length ?? 0,
    today: events?.filter((event) => event.date === todayKey).length ?? 0,
    training: tasks?.filter((task) => task.type === 'training').length ?? 0,
    work: tasks?.filter((task) => task.type === 'form' || task.type === 'work_document' || task.type === 'onboarding').length ?? 0,
  };

  const loading = tasks === null || events === null;

  const tiles = [
    { icon: CheckCircle2, label: 'Tasks', value: summary.tasks, detail: 'Need your attention', href: '/tasks' },
    { icon: CalendarDays, label: 'Today', value: summary.today, detail: 'Calendar items today' },
    { icon: BookOpen, label: 'Training', value: summary.training, detail: 'Learning to continue', href: '/tasks' },
    { icon: ClipboardList, label: 'Work', value: summary.work, detail: 'Forms & follow-ups', href: '/tasks' },
  ];

  return (
    <DashboardCard title="Sift" className="overflow-hidden">
      <div
        className="rounded-xl border p-4"
        style={{
          background: 'linear-gradient(135deg, #eadff0 0%, #d9e6d3 100%)',
          borderColor: '#cdbfd3',
          color: '#493f4e',
        }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/65 text-[#66566e] shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-[#493f4e]">Life, with less clutter.</p>
            <p className="mt-1 text-xs leading-5 text-[#756b7b]">
              Your personal summary of what needs attention across Connected.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {tiles.map(({ icon: Icon, label, value, detail, href }) => {
            const inner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <Icon className="h-4 w-4 text-[#66566e]" />
                  <span className="text-lg font-black leading-none text-[#493f4e]">{loading ? '…' : value}</span>
                </div>
                <div className="mt-3 text-xs font-extrabold text-[#493f4e]">{label}</div>
                <div className="mt-0.5 text-[11px] leading-4 text-[#756b7b]">{detail}</div>
              </>
            );

            return href ? (
              <Link
                key={label}
                href={href}
                className="rounded-xl border border-white/60 bg-white/55 p-3 text-left shadow-sm transition hover:bg-white/80"
              >
                {inner}
              </Link>
            ) : (
              <div key={label} className="rounded-xl border border-white/60 bg-white/55 p-3 shadow-sm">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[#b9a9c1]/60 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#756b7b]">Want Sift for yourself?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="https://sift-neon-iota.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-[11px] font-extrabold text-[#55485e] transition hover:bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open personal Sift
            </a>
            <a
              href="https://sift-neon-iota.vercel.app/sift-android.apk"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#66566e] px-3 py-2 text-[11px] font-extrabold text-white transition hover:brightness-95"
            >
              <Download className="h-3.5 w-3.5" /> Android
            </a>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
