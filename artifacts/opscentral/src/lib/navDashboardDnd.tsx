import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical, type LucideIcon } from 'lucide-react';
import { useAuth } from './auth';
import { authHeaders } from './sessionAuth';
import { keyForIcon } from '@/components/dashboard/iconRegistry';

// Admin-only feature: drag a sidebar nav item onto the dashboard to add
// it as a Quick Links tile, or drag a Quick Links tile back onto the
// sidebar to remove it. Reuses the EXISTING quick_links table/routes
// (POST/DELETE /api/quick-links) rather than inventing a new widget
// type per nav item -- a dragged nav item becomes an ordinary Quick
// Links tile, indistinguishable from one added the normal way, and
// removing it is the exact same DELETE the Quick Links edit dialog's
// own trash icon already calls.
//
// The two draggable "kinds" share one DndContext (lifted up here, above
// both the sidebar and the dashboard page, since they're siblings in
// App.tsx rather than one containing the other) and are told apart by
// each drag's own `data.kind`:
// - 'nav-item': dragged FROM the sidebar, dropped on the dashboard's
//   drop zone -> POST a new quick_links row.
// - 'quick-link-tile': dragged FROM a Quick Links tile, dropped on the
//   sidebar's drop zone -> DELETE that row.
type NavItemDragData = { kind: 'nav-item'; label: string; icon: LucideIcon; href: string };
type QuickLinkTileDragData = { kind: 'quick-link-tile'; id: number; label: string };
type DragData = NavItemDragData | QuickLinkTileDragData;

const DASHBOARD_DROP_ZONE_ID = 'nav-dashboard-dnd:dashboard-drop-zone';
const SIDEBAR_DROP_ZONE_ID = 'nav-dashboard-dnd:sidebar-drop-zone';

type NavDashboardDndContextValue = {
  // Increments on every successful add/remove -- QuickLinksCard reads
  // this and re-fetches whenever it changes, rather than the provider
  // needing to know how to reach into that specific component directly.
  quickLinksVersion: number;
};
const NavDashboardDndContext = createContext<NavDashboardDndContextValue | null>(null);

export function NavDashboardDndProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [quickLinksVersion, setQuickLinksVersion] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag((event.active.data.current as DragData | undefined) ?? null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const data = event.active.data.current as DragData | undefined;
    const overId = event.over?.id;
    setActiveDrag(null);
    if (!data) return;

    if (data.kind === 'nav-item' && overId === DASHBOARD_DROP_ZONE_ID) {
      await fetch('/api/quick-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ label: data.label, icon: keyForIcon(data.icon), href: data.href, external: false, sortOrder: 9999 }),
      });
      setQuickLinksVersion((v) => v + 1);
    } else if (data.kind === 'quick-link-tile' && overId === SIDEBAR_DROP_ZONE_ID) {
      await fetch(`/api/quick-links/${data.id}`, { method: 'DELETE', headers: authHeaders(session) });
      setQuickLinksVersion((v) => v + 1);
    }
  }, [session]);

  return (
    <NavDashboardDndContext.Provider value={{ quickLinksVersion }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {children}
        <DragOverlay>
          {activeDrag && (
            <div className="flex items-center gap-2 rounded-xl border border-primary bg-card px-4 py-3 text-sm font-bold text-foreground shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {activeDrag.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </NavDashboardDndContext.Provider>
  );
}

// Read by QuickLinksCard to know when to re-fetch after a drag-driven
// add/remove -- every consumer of this is only ever rendered inside
// AppShell, which always wraps in the provider, so a missing provider
// here means a real wiring mistake, not a case worth silently tolerating.
export function useQuickLinksVersion(): number {
  const ctx = useContext(NavDashboardDndContext);
  if (!ctx) throw new Error('useQuickLinksVersion used outside NavDashboardDndProvider');
  return ctx.quickLinksVersion;
}

export function useDraggableNavItem({ enabled, label, icon, href }: { enabled: boolean; label: string; icon: LucideIcon; href: string }) {
  const data: NavItemDragData = { kind: 'nav-item', label, icon, href };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `nav-item:${href}`, data, disabled: !enabled });
  return { dragHandleProps: enabled ? { ...attributes, ...listeners } : {}, setDragRef: enabled ? setNodeRef : undefined, isDragging };
}

export function useDroppableDashboard() {
  const { isOver, setNodeRef } = useDroppable({ id: DASHBOARD_DROP_ZONE_ID });
  return { setDropRef: setNodeRef, isOver };
}

export function useDraggableQuickLinkTile({ enabled, id, label }: { enabled: boolean; id: number; label: string }) {
  const data: QuickLinkTileDragData = { kind: 'quick-link-tile', id, label };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `quick-link-tile:${id}`, data, disabled: !enabled });
  return { dragHandleProps: enabled ? { ...attributes, ...listeners } : {}, setDragRef: enabled ? setNodeRef : undefined, isDragging };
}

export function useDroppableSidebar() {
  const { isOver, setNodeRef } = useDroppable({ id: SIDEBAR_DROP_ZONE_ID });
  return { setDropRef: setNodeRef, isOver };
}
