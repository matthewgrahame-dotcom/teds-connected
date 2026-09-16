import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Circle, FileText, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type OnboardingItem = {
  id: number;
  itemType: 'form' | 'policy_signoff';
  title: string;
  slug?: string | null;
  documentId?: number | null;
  completed: boolean;
};

type OnboardingSection = {
  id: number;
  title: string;
  items: OnboardingItem[];
};

type OnboardingProgram = {
  id: number;
  title: string;
  sections: OnboardingSection[];
};

export default function OnboardingPage() {
  const { session } = useAuth();
  const [programs, setPrograms] = useState<OnboardingProgram[] | null>(null);
  const [acking, setAcking] = useState<number | null>(null);

  const load = () => {
    fetch('/api/onboarding/programs', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPrograms)
      .catch(() => setPrograms([]));
  };

  useEffect(load, [session?.name]);

  const acknowledge = async (documentId: number) => {
    setAcking(documentId);
    try {
      await fetch(`/api/work/documents/${documentId}/acknowledge`, { method: 'POST', headers: authHeaders(session) });
      await load();
    } finally {
      setAcking(null);
    }
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Onboarding</h1>
        </div>

        {programs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {programs?.length === 0 && <p className="text-sm text-muted-foreground">No onboarding checklist assigned to you right now.</p>}

        {programs?.map((program) => {
          const totalItems = program.sections.reduce((sum, s) => sum + s.items.length, 0);
          const completedItems = program.sections.reduce((sum, s) => sum + s.items.filter((i) => i.completed).length, 0);

          return (
            <section key={program.id} className="rounded-xl border border-card-border bg-card shell-shadow">
              <div className="flex items-center justify-between gap-4 px-5 pt-5">
                <h2 className="text-lg font-extrabold uppercase tracking-wide text-foreground">{program.title}</h2>
                {totalItems > 0 && (
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                    {completedItems}/{totalItems} complete
                  </span>
                )}
              </div>
              <div className="mx-5 mt-3 border-t border-border" />

              {program.sections.map((section) => (
                <div key={section.id}>
                  <p className="px-5 pt-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                  <div className="divide-y divide-border">
                    {section.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          {item.itemType === 'form' ? <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          <span className="truncate text-foreground">{item.title}</span>
                        </span>

                        {item.itemType === 'form' ? (
                          item.completed ? (
                            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                            </span>
                          ) : (
                            <Link
                              href={`/people/forms/${item.slug}`}
                              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground transition hover:bg-muted/70"
                            >
                              <Circle className="h-3.5 w-3.5" /> Complete Form
                            </Link>
                          )
                        ) : item.completed ? (
                          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={acking === item.documentId}
                            onClick={() => item.documentId && acknowledge(item.documentId)}
                            className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground transition hover:bg-muted/70 disabled:opacity-50"
                          >
                            <Circle className="h-3.5 w-3.5" /> {acking === item.documentId ? 'Saving…' : 'Acknowledge'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pb-3" />
            </section>
          );
        })}
      </div>
    </div>
  );
}
