import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';

type Slide = {
  title: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string;
};

// TODO: replace with real slide content/images (e.g. from a CMS table or
// the Announcements module) once that data source exists.
const slides: Slide[] = [
  { title: 'New release: DJI Avata 360 drone', ctaLabel: 'Read Article', ctaHref: '#' },
  { title: 'The new store operations playbook is live', ctaLabel: 'Read Article', ctaHref: '#' },
  { title: 'Retail Score dashboard now available', ctaLabel: 'Read Article', ctaHref: '#' },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const go = (delta: number) => setIndex((current) => (current + delta + slides.length) % slides.length);

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card shell-shadow">
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-foreground/80 via-foreground/60 to-muted">
        <div className="absolute inset-0 grid place-items-center text-primary-foreground/30">
          <ImageIcon className="h-10 w-10" />
        </div>
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

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/35 px-8 text-center">
          <h3 className="max-w-lg text-2xl font-extrabold uppercase leading-tight text-white sm:text-3xl">{slide.title}</h3>
          <a
            href={slide.ctaHref}
            data-testid="button-hero-cta"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
          >
            {slide.ctaLabel}
          </a>
        </div>

        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
