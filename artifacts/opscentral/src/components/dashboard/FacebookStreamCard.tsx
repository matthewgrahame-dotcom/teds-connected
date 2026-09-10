import { Facebook } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

/**
 * Structural placeholder for the embedded Facebook Page Plugin.
 * TODO: swap the placeholder panel for the real embed, e.g.
 * <div className="fb-page" data-href="https://www.facebook.com/tedscameras" ... />
 * once a Facebook App ID is available (needs the FB JS SDK loaded).
 */
export function FacebookStreamCard() {
  return (
    <DashboardCard title="Facebook Stream" noPadding>
      <div className="px-5 pb-5">
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted text-center text-muted-foreground">
          <Facebook className="h-8 w-8" />
          <p className="max-w-[200px] text-xs leading-5">Facebook Page Plugin embed goes here</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <Facebook className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">Ted's Cameras</p>
            <p className="text-xs text-muted-foreground">Live feed</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
