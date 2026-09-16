import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

type Module = {
  id: number;
  status: ModuleStatus;
};

type Program = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  modules: Module[];
};

export default function ProgramsPage() {
  const { session } = useAuth();
  const [programs, setPrograms] = useState<Program[] | null>(null);

  useEffect(() => {
    const params = session?.name ? `?staffName=${encodeURIComponent(session.name)}` : '';
    fetch(`/api/training/programs${params}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, [session?.name]);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-extrabold text-foreground">Training and Programs</h1>

        {programs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {programs?.length === 0 && <p className="text-sm text-muted-foreground">No active programs right now.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs?.map((program) => {
            const total = program.modules.length;
            const completed = program.modules.filter((m) => m.status === 'completed').length;

            return (
              <Link
                key={program.id}
                href={`/learn/programs/${program.id}`}
                data-testid={`link-program-${program.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card shell-shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-video w-full shrink-0 overflow-hidden bg-muted">
                  {program.thumbnailUrl ? (
                    <img
                      src={program.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <GraduationCap className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-extrabold leading-snug text-foreground">{program.title}</h2>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </div>

                  {program.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{program.description}</p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    {program.category && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {program.category}
                      </span>
                    )}
                    {total > 0 && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                        {completed}/{total} modules complete
                      </span>
                    )}
                    {(program.startDate || program.endDate) && (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {program.startDate}
                        {program.endDate ? `–${program.endDate}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
