import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Search as SearchIcon, Newspaper, Users, LinkIcon as LinkIconLucide, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { workCategories } from '@/data/workCategories';

type ServerResults = {
  news: { id: number; title: string; snippet: string }[];
  users: { id: number; firstName: string; lastName: string; role: string }[];
  quickLinks: { id: number; label: string; href: string }[];
};

function useQueryParam(name: string): string {
  const [location] = useLocation();
  const search = location.includes('?') ? location.split('?')[1] : window.location.search.slice(1);
  return new URLSearchParams(search).get(name) ?? '';
}

export default function SearchResultsPage() {
  const { session } = useAuth();
  const q = useQueryParam('q');
  const [results, setResults] = useState<ServerResults | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ news: [], users: [], quickLinks: [] });
      return;
    }
    setResults(null);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setResults)
      .catch(() => setResults({ news: [], users: [], quickLinks: [] }));
  }, [q]);

  const workMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const matches: { slug: string; categoryTitle: string; docTitle: string }[] = [];
    for (const cat of Object.values(workCategories)) {
      for (const doc of cat.docs) {
        if (doc.title.toLowerCase().includes(query) || cat.title.toLowerCase().includes(query)) {
          matches.push({ slug: cat.slug, categoryTitle: cat.title, docTitle: doc.title });
        }
      }
    }
    return matches.slice(0, 8);
  }, [q]);

  const loading = results === null;
  const totalResults = (results?.news.length ?? 0) + (results?.users.length ?? 0) + (results?.quickLinks.length ?? 0) + workMatches.length;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <SearchIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Search results for "{q}"</h1>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!loading && totalResults === 0 && <p className="text-sm text-muted-foreground">No matches across News, Work hub, Directory, or Quick Links.</p>}

        {!!results?.news.length && (
          <ResultSection icon={Newspaper} title="News">
            {results.news.map((n) => (
              <Link key={n.id} href={`/news/${n.id}`} className="block rounded-lg border border-border p-3 transition hover:bg-muted">
                <p className="font-semibold text-foreground">{n.title}</p>
                <p className="truncate text-sm text-muted-foreground">{n.snippet}</p>
              </Link>
            ))}
          </ResultSection>
        )}

        {!!workMatches.length && (
          <ResultSection icon={BookOpen} title="Work Hub">
            {workMatches.map((m, i) => (
              <Link key={i} href={`/work/${m.slug}`} className="block rounded-lg border border-border p-3 transition hover:bg-muted">
                <p className="font-semibold text-foreground">{m.docTitle}</p>
                <p className="text-sm text-muted-foreground">{m.categoryTitle}</p>
              </Link>
            ))}
          </ResultSection>
        )}

        {!!results?.users.length && (
          <ResultSection icon={Users} title="Directory">
            {results.users.map((u) => (
              <div key={u.id} className="rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground">{u.firstName} {u.lastName}</p>
                <p className="text-sm text-muted-foreground">{u.role}</p>
              </div>
            ))}
          </ResultSection>
        )}

        {!!results?.quickLinks.length && (
          <ResultSection icon={LinkIconLucide} title="Quick Links">
            {results.quickLinks.map((l) => (
              <a key={l.id} href={l.href} className="block rounded-lg border border-border p-3 transition hover:bg-muted">
                <p className="font-semibold text-foreground">{l.label}</p>
              </a>
            ))}
          </ResultSection>
        )}
      </div>
    </div>
  );
}

function ResultSection({ icon: Icon, title, children }: { icon: typeof Newspaper; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
