import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { ChevronLeft, FileText, CheckCircle2, Circle } from 'lucide-react';
import { workCategories } from '@/data/workCategories';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type WorkDoc = {
  id: number;
  title: string;
  version: string | null;
  href: string | null;
  note: string | null;
  section: string | null;
  requiresAcknowledgment: boolean;
  acknowledged: boolean;
};

function groupBySection(docs: WorkDoc[]) {
  const groups: { section: string | null; docs: WorkDoc[] }[] = [];
  for (const doc of docs) {
    const last = groups[groups.length - 1];
    if (last && last.section === doc.section) {
      last.docs.push(doc);
    } else {
      groups.push({ section: doc.section, docs: [doc] });
    }
  }
  return groups;
}

export default function WorkCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const categoryTitle = slug ? workCategories[slug]?.title : undefined;

  const [docs, setDocs] = useState<WorkDoc[] | null>(null);
  const [acking, setAcking] = useState<number | null>(null);

  const load = () => {
    if (!slug) return;
    fetch(`/api/work/documents?categorySlug=${encodeURIComponent(slug)}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDocs)
      .catch(() => setDocs([]));
  };

  useEffect(load, [slug]);

  const acknowledge = async (docId: number) => {
    setAcking(docId);
    await fetch(`/api/work/documents/${docId}/acknowledge`, { method: 'POST', headers: authHeaders(session) });
    load();
    setAcking(null);
  };

  const toggleRequires = async (doc: WorkDoc) => {
    await fetch(`/api/work/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
      body: JSON.stringify({ requiresAcknowledgment: !doc.requiresAcknowledgment }),
    });
    load();
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/work" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Work
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">{categoryTitle ?? 'Not set up yet'}</h1>

        {docs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {docs !== null && docs.length === 0 && <p className="text-sm text-muted-foreground">This category doesn't have any content yet.</p>}

        {docs &&
          groupBySection(docs).map((group, groupIndex) => (
            <div key={group.section ?? `group-${groupIndex}`}>
              {group.section && <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{group.section}</h2>}
              <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
                {group.docs.map((doc) => {
                  const content = (
                    <span className="flex items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{doc.title}</span>
                        {doc.version && <span className="block text-xs text-muted-foreground">{doc.version}</span>}
                      </span>
                    </span>
                  );
                  return (
                    <div key={doc.id} className="px-5 py-4" data-testid={`policy-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                      <div className="flex items-center justify-between gap-3">
                        {doc.href ? (
                          <a href={doc.href} target="_blank" rel="noreferrer" className="min-w-0 transition hover:opacity-70">
                            {content}
                          </a>
                        ) : (
                          content
                        )}
                        {doc.requiresAcknowledgment && (
                          <button
                            type="button"
                            disabled={doc.acknowledged || acking === doc.id}
                            onClick={() => acknowledge(doc.id)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                              doc.acknowledged ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                            }`}
                          >
                            {doc.acknowledged ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                            {doc.acknowledged ? "I've read this" : 'Mark as read'}
                          </button>
                        )}
                      </div>
                      {doc.note && <p className="mt-2 text-sm leading-6 text-muted-foreground">{doc.note}</p>}
                      {canEdit && (
                        <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <input type="checkbox" checked={doc.requiresAcknowledgment} onChange={() => toggleRequires(doc)} />
                          Requires staff acknowledgment (tracked in Policy Compliance reporting)
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
