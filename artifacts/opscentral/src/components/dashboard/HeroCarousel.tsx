import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

type NewsArticle = {
  id: number;
  title: string;
  imageUrl: string | null;
};

const MAX_SLIDES = 5;

export function HeroCarousel() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data: NewsArticle[]) => setArticles(data.slice(0, MAX_SLIDES)))
      .catch(() => setArticles([]));
  }, []);

  const go = (delta: number) => setIndex((current) => (current + delta + (articles?.length || 1)) % (articles?.length || 1));

  if (articles === null) {
    return <div className="aspect-[16/7] w-full animate-pulse rounded-xl border border-card-border bg-muted" />;
  }

  if (articles.length === 0) {
    return (
      <div className="grid aspect-[16/7] w-full place-items-center rounded-xl border border-card-border bg-card text-sm text-muted-foreground shell-shadow">
        No news yet.
      </div>
    );
  }

  const slide = articles[index];

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card shell-shadow">
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-foreground/80 via-foreground/60 to-muted">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-primary-foreground/30">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {articles.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white transition hover:bg-black/45"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white transition hover:bg-black/45"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/35 px-8 text-center">
          <h3 className="max-w-lg text-2xl font-extrabold uppercase leading-tight text-white sm:text-3xl">{slide.title}</h3>
          <a
            href={`/news/${slide.id}`}
            data-testid="button-hero-cta"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
          >
            Read Article
          </a>
        </div>

        {articles.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {articles.map((a, i) => (
              <button
                key={a.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
