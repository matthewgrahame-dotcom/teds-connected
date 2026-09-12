import { useEffect, useState } from 'react';
import { Link } from 'wouter';
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
        <h1 className="text-2xl font-extrabold text-foreground">News</h1>

        {articles === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {articles?.length === 0 && <p className="text-sm text-muted-foreground">No news yet.</p>}

        <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
          {articles?.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.id}`}
              data-testid={`link-news-${article.id}`}
              className="flex gap-4 px-5 py-4 transition hover:bg-muted/50"
            >
              <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${article.tagColor}`} />
              <div className="min-w-0">
                <h3 className="font-extrabold text-foreground">{article.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{article.snippet}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {article.postedBy} · {new Date(article.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
