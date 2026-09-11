import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { authHeaders } from '@/lib/sessionAuth';

const DEFAULT_PAGE_URL = 'https://www.facebook.com/TedsCameras';
const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0';

declare global {
  interface Window {
    FB?: { XFBML: { parse: (node?: Element) => void } };
  }
}

/**
 * Real Facebook Page Plugin embed -- no app credentials needed, works for
 * any public Facebook Page. Loads the FB JS SDK once (shared across the
 * app if this card mounts more than once) and asks it to parse the
 * fb-page div. Unlike Instagram, this doesn't need OAuth/Business account
 * setup, which is why it was quick to add while Instagram wasn't.
 *
 * Mobile note: the plugin renders as an iframe sized by data-width, and
 * data-adapt-container-width doesn't reliably kick in if FB.XFBML.parse()
 * runs before the container's real (CSS-computed, mobile) width has
 * settled -- easy to hit on initial load/hydration. Two things guard
 * against that here: a double-rAF delay before parsing (lets layout
 * settle first) and a wrapper that's explicitly full-width so FB reads an
 * accurate value when it does measure.
 */
export function FacebookStreamCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageUrl, setPageUrl] = useState(DEFAULT_PAGE_URL);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = session?.level === 'full';

  useEffect(() => {
    fetch('/api/app-settings/facebook_page_url', { headers: authHeaders(session) })
      .then((r) => r.json())
      .then((data) => {
        if (data.value) setPageUrl(data.value);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const parse = () => {
      // Wait two animation frames so the container has its final layout
      // width before FB measures it, rather than whatever it was mid-render.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled && window.FB && containerRef.current) window.FB.XFBML.parse(containerRef.current);
        });
      });
    };

    if (window.FB) {
      parse();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', parse);
      return () => {
        cancelled = true;
        existing.removeEventListener('load', parse);
      };
    }

    if (!document.getElementById('fb-root')) {
      const fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.prepend(fbRoot);
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', parse);
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [pageUrl]); // re-parse (new fb-page div, since it's keyed by pageUrl below) whenever the configured page changes

  const openSettings = () => {
    setDraftUrl(pageUrl);
    requirePublishAccess(() => setEditing(true));
  };

  const saveUrl = async () => {
    if (!draftUrl.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/app-settings/facebook_page_url', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ value: draftUrl.trim() }),
      });
      setPageUrl(draftUrl.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardCard title="Facebook Stream" noPadding actions={canEdit ? <CardIconButton icon={Settings} label="Change Facebook page" onClick={openSettings} /> : <></>}>
      <div className="w-full max-w-full overflow-hidden px-5 pb-5" ref={containerRef} key={pageUrl}>
        <div
          className="fb-page w-full max-w-full"
          data-href={pageUrl}
          data-tabs="timeline"
          data-height="600"
          data-small-header="false"
          data-adapt-container-width="true"
          data-hide-cover="false"
          data-show-facepile="true"
        >
          <blockquote cite={pageUrl} className="fb-xfbml-parse-ignore">
            <a href={pageUrl}>Facebook Page</a>
          </blockquote>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Facebook Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://www.facebook.com/YourPage"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-muted-foreground">Must be a public Facebook Page URL (works the same way the current Ted's Cameras page does).</p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveUrl}
                disabled={saving || !draftUrl.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:brightness-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
}
