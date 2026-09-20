import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Sparkles, Edit2, Check, X } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedRoundup, setEditedRoundup] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/recent-roundup')
      .then((r) => r.json())
      .then((result) => {
        setData(result);
        setEditedRoundup(result.roundup || '');
      })
      .catch(() => setData({ available: false }));
  }, []);

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/recent-roundup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundup: editedRoundup }),
      });
      if (response.ok) {
        setData((prev) => (prev ? { ...prev, roundup: editedRoundup } : null));
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save roundup:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedRoundup(data?.roundup || '');
    setIsEditing(false);
  };

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
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editedRoundup}
                onChange={(e) => setEditedRoundup(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-3 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={10}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-extrabold text-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const paragraphs = (data.roundup ?? '').split(/\n\s*\n/).filter((p) => p.trim());
                const hasMore = paragraphs.length > 1;
                const shown = expanded ? paragraphs : paragraphs.slice(0, 1);
                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{shown.join('\n\n')}</div>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md p-1.5 text-foreground/70 transition hover:bg-muted hover:text-foreground"
                        title="Edit this roundup"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
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
        </>
      )}
    </DashboardCard>
  );
}