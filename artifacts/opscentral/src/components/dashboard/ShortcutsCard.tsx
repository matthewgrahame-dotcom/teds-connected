import { CalendarDays, FileWarning, MoreVertical } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { LinkTileGrid, type LinkTile } from './LinkTileGrid';

const tiles: LinkTile[] = [
  { label: 'Events Calendar', icon: CalendarDays, href: '#' },
  { label: 'Incident Report', icon: FileWarning, href: '/people/forms/stock-incident-report-form' },
];

export function ShortcutsCard() {
  return (
    <DashboardCard title="Shortcuts" actions={<CardIconButton icon={MoreVertical} label="More options" />}>
      <LinkTileGrid tiles={tiles} />
    </DashboardCard>
  );
}
