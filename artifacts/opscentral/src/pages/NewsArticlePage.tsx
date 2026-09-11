import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { ChevronLeft } from 'lucide-react';

type NewsArticle = {
  id: number;
  title: string;
  snippet: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  tagColor: string;
  postedBy: string;
  createdAt: string;
};

export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/news/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setArticle)
      .catch(() => setArticle(null));
  }, [id]);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to News
        </Link>

        {article === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {article === null && <p className="text-sm text-muted-foreground">This article couldn't be found.</p>}

        {article && (
          <article className="overflow-hidden rounded-xl border border-card-border bg-card shell-shadow">
            {article.imageUrl && (
              article.linkUrl ? (
                <a href={article.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover transition hover:opacity-90" />
                </a>
              ) : (
                <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
              )
            )}
            <div className="p-6">
              <div className="flex gap-4">
                <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${article.tagColor}`} />
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold text-foreground">{article.title}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {article.postedBy} · {new Date(article.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{article.body || article.snippet}</div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
