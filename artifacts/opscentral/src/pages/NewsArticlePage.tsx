import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { RichContent } from '@/components/RichContent';

type NewsArticle = {
  id: number;
  title: string;
  snippet: string;
  body: string | null;
  imageUrl: string | null;
  imagePhotographerName: string | null;
  imagePhotographerUrl: string | null;
  linkUrl: string | null;
  tagColor: string;
  postedBy: string;
  createdAt: string;
};

export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [article, setArticle] = useState<NewsArticle | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/news/${id}`, { headers: authHeaders(session) })
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
            {article.imageUrl ? (
              article.linkUrl ? (
                <a href={article.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover transition hover:opacity-90" />
                </a>
              ) : (
                <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
              )
            ) : (
              <div className="grid aspect-[16/9] w-full place-items-center bg-gradient-to-br from-foreground/80 via-foreground/60 to-muted">
                <ImageIcon className="h-10 w-10 text-primary-foreground/30" />
              </div>
            )}
            {article.imageUrl && article.imagePhotographerName && (
              <p className="bg-muted/30 px-6 py-1.5 text-[11px] text-muted-foreground">
                Photo by{' '}
                {article.imagePhotographerUrl ? (
                  <a href={`${article.imagePhotographerUrl}?utm_source=connected&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {article.imagePhotographerName}
                  </a>
                ) : (
                  article.imagePhotographerName
                )}{' '}
                on{' '}
                <a href="https://unsplash.com/?utm_source=connected&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Unsplash
                </a>
              </p>
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
              <div className="mt-5 text-sm leading-7 text-foreground/90">
                <RichContent text={article.body || article.snippet} />
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
