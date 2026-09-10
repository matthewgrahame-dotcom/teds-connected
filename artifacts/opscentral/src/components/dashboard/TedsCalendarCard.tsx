import { ExternalLink } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { EmptyState } from './EmptyState';

export function TedsCalendarCard() {
  return (
    <DashboardCard title="Teds Calendar" actions={<CardIconButton icon={ExternalLink} label="Open calendar" tone="primary" />}>
      <EmptyState heading="No events yet" copy="There are no events scheduled yet." />
    </DashboardCard>
  );
}
