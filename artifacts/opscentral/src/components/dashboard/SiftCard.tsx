import { CheckCircle2, CalendarDays, BookOpen, ClipboardList, Sparkles } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

const items = [
  { icon: CheckCircle2, label: 'Tasks', detail: 'What needs your attention' },
  { icon: CalendarDays, label: 'Today', detail: 'Your upcoming calendar' },
  { icon: BookOpen, label: 'Training', detail: 'Learning to continue' },
  { icon: ClipboardList, label: 'Work', detail: 'Forms and follow-ups' },
];

export function SiftCard() {
  return (
    <DashboardCard title="Sift" className="overflow-hidden">
      <div className="rounded-xl border border-border bg-muted/35 p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-extrabold text-foreground">Life, with less clutter.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">A personal view of what needs your attention across Connected.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map(({ icon: Icon, label, detail }) => (
            <button key={label} type="button" className="rounded-lg border border-border bg-card p-3 text-left transition hover:bg-muted">
              <Icon className="mb-2 h-4 w-4 text-primary" />
              <div className="text-xs font-extrabold text-foreground">{label}</div>
              <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{detail}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Personal to you · prototype</p>
      </div>
    </DashboardCard>
  );
}
