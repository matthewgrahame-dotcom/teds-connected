import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type NewsArticle = {
  id: number;
  title: string;
  snippet: string;
  tagColor: string;
  postedBy: string;
  createdAt: string;
};

export default function NewsPage() {
  const { session } = useAuth();
  const canEdit = session?.level === 'full';
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);

  useEffect(() => {
    fetch('/api/news', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setArticles)
      .catch(() => setArticles([]));
  }, []);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">News</h1>
          {canEdit && (
            <Link
              href="/news/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95"
            >
              <Plus className="h-3.5 w-3.5" /> New Article
            </Link>
          )}
        </div>

        {articles === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {articles?.length === 0 && <p className="text-sm text-muted-foreground">No news yet.</p>}

        <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
          {articles?.map((article) => (
            <div key={article.id} className="flex items-center gap-2 px-5 py-4">
              <Link href={`/news/${article.id}`} data-testid={`link-news-${article.id}`} className="flex min-w-0 flex-1 gap-4 transition hover:opacity-80">
                <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${article.tagColor}`} />
                <div className="min-w-0">
                  <h3 className="font-extrabold text-foreground">{article.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{article.snippet}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {article.postedBy} · {new Date(article.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </Link>
              {canEdit && (
                <Link
                  href={`/news/${article.id}/edit`}
                  aria-label="Edit article"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
