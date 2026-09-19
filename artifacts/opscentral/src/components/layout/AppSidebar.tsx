import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronRight } from 'lucide-react';
import connectedLogo from '@/assets/connected-logo.png';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { iconForKey } from '@/components/dashboard/iconRegistry';
import { useDraggableNavItem, useDroppableSidebar, useNavItemsVersion } from '@/lib/navDashboardDnd';

// The real shape returned by GET /api/nav-items -- see nav_items in
// lib/db/src/schema/dashboard-config.ts for what each field means.
// Building the parent/children tree from this flat list, and the
// minTier filtering, both happen here client-side rather than on the
// server, exactly as they always did when this was a hardcoded array.
type FetchedNavItem = {
  id: number;
  label: string;
  icon: string | null;
  href: string | null;
  parentId: number | null;
  section: string;
  sortOrder: number;
  minTier: string | null;
  protected: boolean;
};

// Narrows the API's generic `string | null` minTier down to the literal
// union meetsConnectedTier actually expects -- the backend already only
// ever stores 'manager'/'admin'/NULL (validated on write), so this is a
// real narrowing of already-trustworthy data, not a blind cast papering
// over a genuinely unknown value.
function isRealMinTier(value: string | null): value is 'manager' | 'admin' {
  return value === 'manager' || value === 'admin';
}

export function AppSidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const [location] = useLocation();
  const { session, effectiveConnectedTier } = useAuth();
  // 'full' specifically, not 'admin' -- Matt's own call: an ordinary
  // admin doesn't need to be able to drag nav items around/into Quick
  // Links, only the one person this tier is scoped to.
  const canDrag = meetsConnectedTier(effectiveConnectedTier, 'full');
  const [items, setItems] = useState<FetchedNavItem[] | null>(null);
  // Accordion: only one section open at a time across the whole sidebar --
  // opening one collapses whatever else was open. A previous attempt at
  // this (via AI Studio) didn't actually land; this replaces the old
  // independent-per-section Record<string, boolean> that let every section
  // stay open simultaneously.
  const [openSection, setOpenSection] = useState<string | null>(null);
  // Admin-only drag-and-drop, onto the dashboard's Quick Links widget:
  // drop this whole sidebar to MOVE a Quick Links tile someone dragged
  // back onto it -- see navDashboardDnd.tsx for the other half (the
  // dashboard's own drop zone, for moving a nav item the other way).
  const { setDropRef, isOver } = useDroppableSidebar();
  const navItemsVersion = useNavItemsVersion();

  useEffect(() => {
    fetch('/api/nav-items', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setItems)
      .catch(() => setItems([]));
  }, [navItemsVersion]);

  const visibleItems = (items ?? []).filter((item) => !isRealMinTier(item.minTier) || meetsConnectedTier(effectiveConnectedTier, item.minTier));
  const topLevel = (section: string) =>
    visibleItems.filter((item) => item.parentId === null && item.section === section).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (parentId: number) => visibleItems.filter((item) => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  const renderItem = (item: FetchedNavItem) => {
    const active = item.href ? location === item.href || (item.href !== '/' && location.startsWith(item.href)) : false;
    const isExpanded = openSection === item.label;
    const children = childrenOf(item.id);
    const Icon = iconForKey(item.icon ?? 'Link');
    const rowClasses = `group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] font-bold transition ${
      active ? 'bg-sidebar-accent text-foreground' : 'text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground'
    }`;

    const content = (
      <>
        <span className="flex items-center gap-3">
          <Icon className="h-[19px] w-[19px]" strokeWidth={1.75} />
          {item.label}
        </span>
        {children.length > 0 && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
      </>
    );

    return (
      <div key={item.id}>
        {item.href ? (
          <DraggableNavRow canDrag={canDrag} item={item}>
            <Link href={item.href} onClick={onNavigate} data-testid={`link-nav-${item.label.toLowerCase()}`} className={rowClasses}>
              {content}
            </Link>
          </DraggableNavRow>
        ) : (
          <button
            type="button"
            data-testid={`button-nav-${item.label.toLowerCase()}`}
            onClick={() => setOpenSection((current) => (current === item.label ? null : item.label))}
            className={rowClasses}
          >
            {content}
          </button>
        )}
        {children.length > 0 && isExpanded && (
          <div className="ml-9 mt-1 space-y-1 border-l border-border pl-3">
            {children.map((child) =>
              child.href ? (
                <DraggableNavRow key={child.id} canDrag={canDrag} item={child}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    data-testid={`link-nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`block w-full rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition hover:bg-sidebar-accent/60 hover:text-foreground ${
                      location === child.href ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {child.label}
                  </Link>
                </DraggableNavRow>
              ) : (
                <button
                  key={child.id}
                  type="button"
                  className="block w-full rounded-xl px-3 py-1.5 text-left text-sm font-semibold text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
                >
                  {child.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      ref={setDropRef}
      className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-sidebar-border bg-sidebar pt-[170px] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:pt-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isOver ? 'ring-2 ring-inset ring-primary' : ''}`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-sidebar-border py-5 md:hidden">
          <Link href="/" onClick={onNavigate} className="flex items-center justify-center">
            <img src={connectedLogo} alt="Connected" className="h-24 w-auto drop-shadow-md" />
          </Link>
        </div>

        <div className="relative hidden border-b border-sidebar-border pb-6 pt-8 md:block">
          <Link href="/" className="relative -mt-16 flex items-center justify-center">
            <img src={connectedLogo} alt="Connected" className="h-24 w-auto drop-shadow-md" />
          </Link>
        </div>

        {canDrag && (
          <p className="border-b border-sidebar-border px-4 py-2 text-[11px] font-semibold text-muted-foreground">
            Drag a link to/from the dashboard to move it
          </p>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Portal navigation">
          {topLevel('primary').map(renderItem)}
          <div className="my-3 border-t border-sidebar-border" />
          {topLevel('secondary').map(renderItem)}
        </nav>
      </div>
    </aside>
  );
}

// Wraps a nav row so it can be dragged onto the dashboard's Quick Links
// drop zone -- a no-op passthrough when canDrag is false OR the item is
// protected (Dashboard), so the non-admin experience is completely
// unchanged, and Dashboard specifically can never be dragged away
// regardless of tier -- the one thing this whole feature is meant to
// guarantee (the sidebar can't be dragged into a genuinely empty,
// navigation-less state). Attaches the drag listeners to this whole
// wrapper rather than a separate grip handle: dnd-kit's PointerSensor
// activationConstraint (6px of movement) already tells a click from a
// drag apart, so the Link inside still navigates normally on a plain click.
function DraggableNavRow({ canDrag, item, children }: { canDrag: boolean; item: FetchedNavItem; children: ReactNode }) {
  const enabled = canDrag && !item.protected;
  const { dragHandleProps, setDragRef, isDragging } = useDraggableNavItem({
    enabled,
    id: item.id,
    label: item.label,
    iconKey: item.icon ?? 'Link',
    href: item.href ?? '',
    parentId: item.parentId,
    section: item.section,
    sortOrder: item.sortOrder,
    minTier: item.minTier,
  });
  if (!enabled) return <>{children}</>;
  return (
    <div ref={setDragRef} {...dragHandleProps} className={`touch-none transition ${isDragging ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'}`}>
      {children}
    </div>
  );
}
