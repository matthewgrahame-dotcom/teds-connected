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
 * Mobile/sizing note: the plugin renders as an iframe sized once, at
 * parse() time -- data-adapt-container-width only measures the container
 * once and never re-measures, so if the card's real layout width changes
 * later (window resize, sidebar reflow, a slow initial layout settle) the
 * embed is stuck at whatever width it first measured, leaving blank space
 * in a now-wider container. Two things guard against that: a double-rAF
 * delay before the very first parse (lets initial layout settle before
 * FB measures it), and a ResizeObserver that forces a full fresh embed
 * (new DOM node, re-parsed) whenever the container's width has actually
 * changed meaningfully since the last parse -- Facebook's plugin doesn't
 * resize an existing iframe in place, so remounting the div and
 * re-parsing is the reliable way to pick up a new width.
 */
export function FacebookStreamCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageUrl, setPageUrl] = useState(DEFAULT_PAGE_URL);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [resizeKey, setResizeKey] = useState(0); // bumped on a real width change, to force a fresh embed re-parse
  const lastWidthRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = session?.level === 'full';

  useEffect(() => {
    fetch('/api/app-settings/facebook_page_url', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
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
          if (!cancelled && window.FB && containerRef.current) {
            window.FB.XFBML.parse(containerRef.current);
            lastWidthRef.current = containerRef.current.offsetWidth;
          }
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
    // pageUrl and resizeKey both change the key on the div below, forcing a
    // fresh .fb-page node -- re-run this same parse logic against it either way.
  }, [pageUrl, resizeKey]);

  // Detects a real, settled width change (debounced) and forces a fresh
  // embed so FB re-measures. Ignores the initial observe() call (which
  // always fires once immediately) and any change too small to matter.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined) return;

      if (lastWidthRef.current === null) {
        // First measurement -- just record it, nothing to compare against yet.
        lastWidthRef.current = width;
        return;
      }

      if (Math.abs(width - lastWidthRef.current) < 8) return; // ignore sub-pixel/noise-level changes

      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        lastWidthRef.current = width;
        setResizeKey((k) => k + 1);
      }, 200);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

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
      <div className="w-full max-w-full overflow-hidden px-5 pb-5" ref={containerRef} key={`${pageUrl}-${resizeKey}`}>
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
