import { useEffect, useState } from 'react';
import { Circle, CircleDot, CheckCircle2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { RichContent } from '@/components/RichContent';

type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

type Module = {
  id: number;
  title: string;
  moduleType: 'lesson' | 'quiz';
  content: string | null;
  externalUrl: string | null;
  status: ModuleStatus;
};

type Program = {
  id: number;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  modules: Module[];
};

const statusConfig: Record<ModuleStatus, { label: string; icon: typeof Circle; className: string }> = {
  not_started: { label: 'Not Started', icon: Circle, className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: CircleDot, className: 'bg-secondary text-secondary-foreground' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-primary text-primary-foreground' },
};

const nextStatus: Record<ModuleStatus, ModuleStatus> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
};

export default function ProgramsPage() {
  const { session } = useAuth();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = async () => {
    const params = session?.name ? `?staffName=${encodeURIComponent(session.name)}` : '';
    try {
      const resp = await fetch(`/api/training/programs${params}`, { headers: authHeaders(session) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setPrograms(await resp.json());
    } catch {
      setPrograms([]);
    }
  };

  useEffect(() => {
    load();
  }, [session?.name]);

  const cycleStatus = async (module: Module) => {
    if (!session?.name) return;
    const status = nextStatus[module.status];
    await fetch(`/api/training/modules/${module.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ staffName: session.name, status }),
    });
    await load();
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-extrabold text-foreground">Programs</h1>

        {programs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {programs?.length === 0 && <p className="text-sm text-muted-foreground">No active programs right now.</p>}

        {programs?.map((program) => (
          <section key={program.id} className="rounded-xl border border-card-border bg-card shell-shadow">
            <div className="px-5 pt-5">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-foreground">
                {program.title}
                {(program.startDate || program.endDate) && (
                  <span className="ml-2 text-sm font-semibold text-muted-foreground">
                    ({program.startDate}
                    {program.endDate ? `–${program.endDate}` : ''})
                  </span>
                )}
              </h2>
              {program.description && <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>}
            </div>
            <div className="mx-5 mt-3 border-t border-border" />
            <div className="divide-y divide-border">
              {program.modules.map((module) => {
                const { label, icon: Icon, className } = statusConfig[module.status];
                const isExpanded = expanded.has(module.id);
                return (
                  <div key={module.id} data-testid={`module-${module.id}`}>
                    <div className="flex items-center justify-between gap-4 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => module.content && toggleExpanded(module.id)}
                        disabled={!module.content}
                        className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
                      >
                        {module.content && (isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)}
                        <span className="truncate text-sm text-foreground">
                          {module.title}
                          {module.moduleType === 'quiz' && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Quiz</span>}
                        </span>
                        {module.externalUrl && (
                          <a href={module.externalUrl} target="_blank" rel="noreferrer" aria-label="Open module content" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </button>
                      <button
                        type="button"
                        data-testid={`button-status-${module.id}`}
                        onClick={() => cycleStatus(module)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:brightness-95 ${className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    </div>
                    {isExpanded && module.content && (
                      <div className="px-5 pb-4">
                        <RichContent text={module.content} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
