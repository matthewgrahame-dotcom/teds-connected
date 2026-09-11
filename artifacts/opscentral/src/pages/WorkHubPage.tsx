import { Link } from 'wouter';
import { workCategories } from '@/data/workCategories';

type HubTile = {
  title: string;
  slug: string;
  gradient: string;
};

// TODO: replace placeholder gradients with real photography per category.
const tiles: HubTile[] = [
  { title: "Welcome to Ted's", slug: 'welcome', gradient: 'from-amber-500 to-amber-700' },
  { title: 'Customer Experience', slug: 'customer-experience', gradient: 'from-sky-600 to-sky-800' },
  { title: 'Operations', slug: 'operations', gradient: 'from-stone-600 to-stone-800' },
  { title: 'HR Handbook', slug: 'hr-handbook', gradient: 'from-rose-600 to-rose-800' },
  { title: 'Current Campaigns', slug: 'current-campaigns', gradient: 'from-yellow-500 to-yellow-700' },
  { title: 'Op Central Training', slug: 'op-central-training', gradient: 'from-emerald-600 to-emerald-800' },
  { title: 'Pronto', slug: 'pronto', gradient: 'from-indigo-600 to-indigo-800' },
  { title: 'Product Information', slug: 'product-information', gradient: 'from-slate-600 to-slate-800' },
];

export default function WorkHubPage() {
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-extrabold text-foreground">Work</h1>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const hasContent = Boolean(workCategories[tile.slug]);
            return (
              <Link
                key={tile.title}
                href={hasContent ? `/work/${tile.slug}` : '#'}
                data-testid={`tile-work-${tile.slug}`}
                className="group overflow-hidden rounded-xl border border-card-border shell-shadow"
              >
                <div className={`relative flex aspect-[4/3] items-end justify-center bg-gradient-to-br p-4 ${tile.gradient}`}>
                  <span className="max-w-[85%] rounded-full bg-foreground px-4 py-2 text-center text-sm font-extrabold uppercase leading-tight text-primary transition group-hover:brightness-110">
                    {tile.title}
                  </span>
                </div>
                <div className="bg-card px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                  {tile.title}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
