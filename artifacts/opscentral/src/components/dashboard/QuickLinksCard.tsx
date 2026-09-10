import { Aperture, BookOpen, Instagram, Laptop, Phone, Store } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { LinkTileGrid, type LinkTile } from './LinkTileGrid';

const tiles: LinkTile[] = [
  { label: 'Group Phone Listing', icon: Phone, href: 'tel:+61394176900' },
  { label: 'Store Contacts', icon: Store, href: '/people/store-contacts' },
  { label: "Ted's Cameras Who To Contact List", icon: BookOpen, href: '/people/contacts' },
  { label: 'DCW Who To Contact List', icon: BookOpen, href: '/people/dcw-contacts' },
  { label: 'Our Website', icon: Laptop, href: 'https://www.teds.com.au', external: true },
  { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/tedscameras', external: true },
  // Requested addition: quick link through to Phocal (SEO/content ops platform).
  // TODO: replace with the real Phocal URL for this store.
  { label: 'Phocal', icon: Aperture, href: '#', external: true },
];

export function QuickLinksCard() {
  return (
    <DashboardCard title="Quick Links">
      <LinkTileGrid tiles={tiles} />
    </DashboardCard>
  );
}
