import { Link } from 'wouter';
import { workCategories } from '@/data/workCategories';
import welcomeImg from '@/assets/work-tiles/welcome.png';
import customerExperienceImg from '@/assets/work-tiles/customer-experience.png';
import operationsImg from '@/assets/work-tiles/operations.png';
import hrHandbookImg from '@/assets/work-tiles/hr-handbook.png';
import currentCampaignsImg from '@/assets/work-tiles/current-campaigns.png';
import prontoImg from '@/assets/work-tiles/pronto.png';
import productInformationImg from '@/assets/work-tiles/product-information.png';

type HubTile = {
  title: string;
  slug: string;
  image?: string; // real tile art where we have it; falls back to a gradient otherwise
};

const tiles: HubTile[] = [
  { title: "Welcome to Ted's", slug: 'welcome', image: welcomeImg },
  { title: 'Customer Experience', slug: 'customer-experience', image: customerExperienceImg },
  { title: 'Operations', slug: 'operations', image: operationsImg },
  { title: 'HR Handbook', slug: 'hr-handbook', image: hrHandbookImg },
  { title: 'Current Campaigns', slug: 'current-campaigns', image: currentCampaignsImg },
  { title: 'Connected & Phocal FAQ', slug: 'op-central-training' }, // no source image provided -- Op Central Training tile repurposed as an FAQ
  { title: 'Pronto', slug: 'pronto', image: prontoImg },
  { title: 'Product Information', slug: 'product-information', image: productInformationImg },
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
                <div className="relative aspect-[4/3] overflow-hidden bg-primary">
                  {tile.image ? (
                    <img
                      src={tile.image}
                      alt={tile.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-end justify-center bg-gradient-to-br from-slate-600 to-slate-800 p-4">
                      <span className="max-w-[85%] rounded-full bg-foreground px-4 py-2 text-center text-sm font-extrabold uppercase leading-tight text-primary">
                        {tile.title}
                      </span>
                    </div>
                  )}
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
