import { useEffect, useRef } from 'react';
import { DashboardCard } from './DashboardCard';

const PAGE_URL = 'https://www.facebook.com/TedsCameras';
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
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <DashboardCard title="Facebook Stream" noPadding>
      <div className="w-full max-w-full overflow-hidden px-5 pb-5" ref={containerRef}>
        <div
          className="fb-page w-full max-w-full"
          data-href={PAGE_URL}
          data-tabs="timeline"
          data-height="600"
          data-small-header="false"
          data-adapt-container-width="true"
          data-hide-cover="false"
          data-show-facepile="true"
        >
          <blockquote cite={PAGE_URL} className="fb-xfbml-parse-ignore">
            <a href={PAGE_URL}>Ted's Cameras</a>
          </blockquote>
        </div>
      </div>
    </DashboardCard>
  );
}
