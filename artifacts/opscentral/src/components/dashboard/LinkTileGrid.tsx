import type { LucideIcon } from 'lucide-react';

export type LinkTile = {
  label: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
};

/** The 2-column grid of yellow circular icon badges + bold uppercase labels. */
export function LinkTileGrid({ tiles }: { tiles: LinkTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7">
      {tiles.map(({ label, icon: Icon, href, external }) => (
        <a
          key={label}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer' : undefined}
          data-testid={`tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
          className="group flex flex-col items-center gap-3 text-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground transition group-hover:brightness-95">
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <span className="text-[13px] font-extrabold uppercase leading-tight text-foreground">{label}</span>
        </a>
      ))}
    </div>
  );
}
