import { ExternalLink } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { EmptyState } from './EmptyState';

export function OutstandingTasksCard() {
  return (
    <DashboardCard title="Outstanding Tasks" actions={<CardIconButton icon={ExternalLink} label="Open tasks" tone="primary" />}>
      <EmptyState heading="No tasks" copy="There is currently no tasks." />
    </DashboardCard>
  );
}
