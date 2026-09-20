import { type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

/**
 * Shared shell for every dashboard widget: bold uppercase title, a divider,
 * and an optional row of square bordered action buttons (⋮ menu, search,
 * filter, external-link, etc). Matches the pattern seen across Quick Links,
 * News, Key Contacts, Rostering, Shortcuts, Outstanding Tasks, etc.
 */
export function DashboardCard({
  title,
  actions,
  children,
  noPadding = false,
  className = '',
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-card-border bg-card shell-shadow ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pt-5">
        <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-foreground">{title}</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">{actions ?? <CardMenuButton />}</div>
      </div>
      <div className="mx-5 mt-3 border-t border-border" />
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/** The small bordered square button used for ⋮ / search / filter / external-link actions.
 * h-10 w-10 (was h-9 w-9) -- 36px was just under the ~40px tap-target
 * minimum flagged on mobile; icon size is unchanged so this is a 2px
 * halo on each side, not a visual redesign. */
export function CardIconButton({
  icon: Icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: typeof MoreVertical;
  label: string;
  tone?: 'default' | 'primary';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-md transition ${
        tone === 'primary'
          ? 'bg-primary text-primary-foreground hover:brightness-95'
          : 'border border-border text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CardMenuButton() {
  return <CardIconButton icon={MoreVertical} label="More options" />;
}
