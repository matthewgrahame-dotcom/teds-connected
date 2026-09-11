import { Aperture, BookOpen, Instagram, Laptop, Phone, Store } from 'lucide-react';
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
    { label: 'Group Phone Listing', icon: Phone, href: 'tel:+61394176900' },
    { label: 'Store Contacts', icon: Store, href: '/people/store-contacts' },
    { label: "Ted's Cameras Who To Contact List", icon: BookOpen, href: '/people/contacts' },
    { label: 'DCW Who To Contact List', icon: BookOpen, href: '/people/dcw-contacts' },
    { label: 'Our Website', icon: Laptop, href: 'https://www.teds.com.au', external: true },
    { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/tedscameras', external: true },
    { label: 'Phocal', icon: Aperture, href: phocalHref, external: true },
  ];

  return (
    <DashboardCard title="Quick Links">
      <LinkTileGrid tiles={tiles} />
    </DashboardCard>
  );
}
