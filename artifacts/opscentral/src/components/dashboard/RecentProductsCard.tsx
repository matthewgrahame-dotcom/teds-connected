import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useAuth } from '@/lib/auth';

const PHOCAL_BASE_URL = 'https://seo-optimiser.vercel.app'; // TODO: update once the Vercel project rename discussion lands

// Same underlying feature as Phocal's Product Lookup > "Recent Products
// Roundup" tool -- reads through Connected's own /api/recent-roundup, which
// proxies to Phocal's cached copy (kept fresh weekly by Phocal's own cron),
// rather than generating anything here. See
// artifacts/api-server/src/routes/recent-roundup.ts. Connected has no
// Shopify/Anthropic credentials of its own, so this card is read-only --
// regenerating on demand still happens in Phocal itself (Open in Phocal).
type RoundupData = {
  available: boolean;
  roundup?: string;
  productCount?: number | null;
  dateRange?: { newest?: string; oldest?: string } | null;
  savedAt?: string | null;
  error?: string;
};

export function RecentProductsCard() {
  const { session } = useAuth();
  const [data, setData] = useState<RoundupData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/recent-roundup')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ available: false }));
  }, []);

  const phocalUrl = `${PHOCAL_BASE_URL}/?page=storelookup${session?.crossAppToken ? `&ssoToken=${encodeURIComponent(session.crossAppToken)}` : ''}`;

  return (
    <DashboardCard
      title="New on Teds.com.au"
      actions={
        <a
          href={phocalUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open Recent Products Roundup in Phocal"
          title="Open Recent Products Roundup in Phocal"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-extrabold text-primary-foreground transition hover:brightness-95"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Phocal
        </a>
      }
    >
      {data === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {data !== null && !data.available && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No roundup generated yet.{' '}
            <a href={phocalUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
              Generate one in Phocal
            </a>{' '}
            to see what's new here.
          </p>
        </div>
      )}

      {data?.available && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {typeof data.productCount === 'number' && <span>{data.productCount} new product{data.productCount === 1 ? '' : 's'}</span>}
            {data.dateRange?.oldest && data.dateRange?.newest && (
              <span>
                {new Date(data.dateRange.oldest).toLocaleDateString('en-AU')} – {new Date(data.dateRange.newest).toLocaleDateString('en-AU')}
              </span>
            )}
            {data.savedAt && <span>Last updated {new Date(data.savedAt).toLocaleDateString('en-AU')}</span>}
          </div>
          {(() => {
            const paragraphs = (data.roundup ?? '').split(/\n\s*\n/).filter((p) => p.trim());
            const hasMore = paragraphs.length > 1;
            const shown = expanded ? paragraphs : paragraphs.slice(0, 1);
            return (
              <>
                <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{shown.join('\n\n')}</div>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-accent hover:underline"
                  >
                    {expanded ? (
                      <>
                        Show less <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Read more <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </>
            );
          })()}
        </>
      )}
    </DashboardCard>
  );
}
