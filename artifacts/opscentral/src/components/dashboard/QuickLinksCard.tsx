import { Aperture, BookOpen, FileWarning, Instagram, Laptop, Phone, Store } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { LinkTileGrid, type LinkTile } from './LinkTileGrid';
import { useAuth } from '@/lib/auth';

// TODO: replace with the real Phocal URL for this store (currently
// seo-optimiser.vercel.app -- see the pending Vercel-project-rename
// discussion for phocal-teds.vercel.app).
const PHOCAL_BASE_URL = 'https://seo-optimiser.vercel.app';

export function QuickLinksCard() {
  const { session } = useAuth();
  // Carries the same cross-app token used for the Connected -> Phocal
  // direction, so clicking through doesn't ask to log in again.
  const phocalHref = session?.crossAppToken
    ? `${PHOCAL_BASE_URL}/?ssoToken=${encodeURIComponent(session.crossAppToken)}`
    : PHOCAL_BASE_URL;

  const tiles: LinkTile[] = [
    { label: 'Group Phone Listing', icon: Phone, href: '/documents/teds-group-phone-listing.pdf', external: true },
    { label: 'Store Contacts', icon: Store, href: '/documents/teds-store-contacts.pdf', external: true },
    { label: "Ted's Cameras Who To Contact List", icon: BookOpen, href: '/documents/teds-who-to-contact-list.pdf', external: true },
    // TODO: no DCW-specific contact list document has been supplied yet
    // (it's the one entry in Operations still missing an href) -- links to
    // the Operations page itself for now rather than a dead specific route.
    { label: 'DCW Who To Contact List', icon: BookOpen, href: '/work/operations' },
    { label: 'Our Website', icon: Laptop, href: 'https://www.teds.com.au/', external: true },
    { label: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/teds_cameras/', external: true },
    { label: 'Incident Report', icon: FileWarning, href: '/people/forms/whs-incident-report-form' },
    { label: 'Phocal', icon: Aperture, href: phocalHref, external: true },
  ];

  return (
    <DashboardCard title="Quick Links">
      <LinkTileGrid tiles={tiles} />
    </DashboardCard>
  );
}
