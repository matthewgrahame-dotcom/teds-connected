import { DashboardCard } from './DashboardCard';

export function RosteringCard() {
  return (
    <DashboardCard title="Rostering" actions={<span />}>
      <div className="flex justify-center py-2">
        <button
          type="button"
          data-testid="button-connect-deputy"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
        >
          Connect To Deputy
        </button>
      </div>
    </DashboardCard>
  );
}
