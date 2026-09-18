import type { LucideIcon } from 'lucide-react';
import { useDraggableQuickLinkTile } from '@/lib/navDashboardDnd';

export type LinkTile = {
  // Present only for a REAL quick_links row (omitted for anything that
  // can't be dragged back off, e.g. if this component were ever reused
  // for a fixed, non-editable tile set) -- draggable is gated on this
  // being present, not just the draggable prop below.
  id?: number;
  label: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  // The raw string key (quick_links.icon) behind the LucideIcon component
  // above -- carried alongside it, not derived by reverse-looking-up the
  // component, so recreating this exact row after an undo never risks
  // picking a different key that happens to map to the same icon.
  iconKey?: string;
  // The TRUE, stored href -- distinct from href above for the one tile
  // where they differ (the Phocal shortcut, whose display href gets a
  // live, session-specific SSO token spliced in). Recreating a tile
  // after undo must use this, or an undo of that specific tile would
  // permanently store today's one-time SSO token as its real link.
  rawHref?: string;
};

/** One tile -- its own component (not inlined in the .map() below) because
 * useDraggableQuickLinkTile is a hook, and hooks can't be called from
 * inside a loop directly. */
function LinkTileItem({ tile, draggable }: { tile: LinkTile; draggable: boolean }) {
  const { label, icon: Icon, href, external, id, iconKey, rawHref } = tile;
  const canDragThis = draggable && id != null;
  // Admin-only, drag this tile back onto the sidebar to remove it (see
  // navDashboardDnd.tsx) -- disabled entirely, not just visually, for
  // anyone else or for a tile with no real id to remove. Carries the
  // tile's full real data (not just id/label) so an undo toast can
  // recreate an equivalent row without a second fetch -- rawHref (the
  // TRUE stored href), never the possibly-substituted display href.
  const { dragHandleProps, setDragRef, isDragging } = useDraggableQuickLinkTile({
    enabled: canDragThis,
    id: id ?? -1,
    label,
    iconKey: iconKey ?? 'Link',
    href: rawHref ?? href,
    external: !!external,
  });

  return (
    <a
      ref={setDragRef}
      {...dragHandleProps}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      data-testid={`tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`group flex flex-col items-center gap-3 text-center ${canDragThis ? 'touch-none cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground transition group-hover:brightness-95">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <span className="text-[13px] font-extrabold uppercase leading-tight text-foreground">{label}</span>
    </a>
  );
}

/** The 2-column grid of yellow circular icon badges + bold uppercase labels.
 * `draggable` (admin-only, set by the caller) lets a tile be dragged back
 * onto the sidebar to remove it -- see QuickLinksCard, the only current
 * caller of this component. */
export function LinkTileGrid({ tiles, draggable = false }: { tiles: LinkTile[]; draggable?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7">
      {tiles.map((tile) => (
        <LinkTileItem key={tile.id ?? tile.label} tile={tile} draggable={draggable} />
      ))}
    </div>
  );
}
