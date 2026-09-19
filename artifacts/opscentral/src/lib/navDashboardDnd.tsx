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
import { GripVertical } from 'lucide-react';
import { useAuth } from './auth';
import { authHeaders } from './sessionAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Admin-only feature: drag a sidebar nav item onto the dashboard to MOVE
// it there as a Quick Links tile, or drag a Quick Links tile back onto
// the sidebar to MOVE it back into the nav. A real move, not a copy in
// either direction -- the item genuinely leaves one place and appears in
// the other, matching Matt's actual request ("the phone list belongs on
// the taskbar"), not a shortcut/duplicate left behind. Reuses the
// existing quick_links AND nav_items tables/routes untouched; this file
// is purely the glue between them.
//
// The two draggable "kinds" share one DndContext (lifted up here, above
// both the sidebar and the dashboard page, since they're siblings in
// App.tsx rather than one containing the other) and are told apart by
// each drag's own `data.kind`. Both directions follow the same safe
// order: POST the new side FIRST, and only DELETE the old side once that
// POST actually succeeded -- if the POST fails, nothing is deleted, so a
// failed move never actually loses the item. Both also show an Undo
// toast that reverses the WHOLE move (delete the new side, recreate the
// old one with its original data) rather than just one half of it.
type NavItemDragData = {
  kind: 'nav-item'; id: number; label: string; iconKey: string; href: string;
  parentId: number | null; section: string; sortOrder: number; minTier: string | null;
};
type QuickLinkTileDragData = { kind: 'quick-link-tile'; id: number; label: string; iconKey: string; href: string; external: boolean };
type DragData = NavItemDragData | QuickLinkTileDragData;

const DASHBOARD_DROP_ZONE_ID = 'nav-dashboard-dnd:dashboard-drop-zone';
const SIDEBAR_DROP_ZONE_ID = 'nav-dashboard-dnd:sidebar-drop-zone';
const UNDO_WINDOW_MS = 8000;

type NavDashboardDndContextValue = {
  // Both increment on every successful move -- QuickLinksCard watches
  // quickLinksVersion and AppSidebar watches navItemsVersion, each
  // re-fetching whenever ITS OWN counter changes, rather than the
  // provider needing to reach into either component directly. A single
  // move increments BOTH, since it always touches both tables.
  quickLinksVersion: number;
  navItemsVersion: number;
};
const NavDashboardDndContext = createContext<NavDashboardDndContextValue | null>(null);

export function NavDashboardDndProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [quickLinksVersion, setQuickLinksVersion] = useState(0);
  const [navItemsVersion, setNavItemsVersion] = useState(0);
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
      const createRes = await fetch('/api/quick-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ label: data.label, icon: data.iconKey, href: data.href, external: false, sortOrder: 9999 }),
      });
      if (!createRes.ok) return; // nothing deleted -- the nav item is untouched
      const created = await createRes.json();
      const newQuickLinkId: number | undefined = created?.link?.id;

      await fetch(`/api/nav-items/${data.id}`, { method: 'DELETE', headers: authHeaders(session) });
      setQuickLinksVersion((v) => v + 1);
      setNavItemsVersion((v) => v + 1);

      const undo = async () => {
        if (newQuickLinkId != null) await fetch(`/api/quick-links/${newQuickLinkId}`, { method: 'DELETE', headers: authHeaders(session) });
        await fetch('/api/nav-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({ label: data.label, icon: data.iconKey, href: data.href, parentId: data.parentId, section: data.section, sortOrder: data.sortOrder, minTier: data.minTier }),
        });
        setQuickLinksVersion((v) => v + 1);
        setNavItemsVersion((v) => v + 1);
      };
      toast({
        title: `Moved "${data.label}" to Quick Links`,
        description: `This closes in ${UNDO_WINDOW_MS / 1000}s.`,
        duration: UNDO_WINDOW_MS,
        action: <ToastAction altText="Undo" onClick={undo}>Undo</ToastAction>,
      });
    } else if (data.kind === 'quick-link-tile' && overId === SIDEBAR_DROP_ZONE_ID) {
      // No group/section info to go on for a drop onto the sidebar as a
      // whole (not a specific group) -- a new top-level item in the
      // primary section, appended at the end, is the same sensible
      // default a manually-added nav item would need anyway.
      const createRes = await fetch('/api/nav-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ label: data.label, icon: data.iconKey, href: data.href, parentId: null, section: 'primary', sortOrder: 9999 }),
      });
      if (!createRes.ok) return; // nothing deleted -- the Quick Links tile is untouched
      const created = await createRes.json();
      const newNavItemId: number | undefined = created?.item?.id;

      await fetch(`/api/quick-links/${data.id}`, { method: 'DELETE', headers: authHeaders(session) });
      setQuickLinksVersion((v) => v + 1);
      setNavItemsVersion((v) => v + 1);

      const undo = async () => {
        if (newNavItemId != null) await fetch(`/api/nav-items/${newNavItemId}`, { method: 'DELETE', headers: authHeaders(session) });
        await fetch('/api/quick-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({ label: data.label, icon: data.iconKey, href: data.href, external: data.external, sortOrder: 9999 }),
        });
        setQuickLinksVersion((v) => v + 1);
        setNavItemsVersion((v) => v + 1);
      };
      toast({
        title: `Moved "${data.label}" to the nav bar`,
        description: `This closes in ${UNDO_WINDOW_MS / 1000}s.`,
        duration: UNDO_WINDOW_MS,
        action: <ToastAction altText="Undo" onClick={undo}>Undo</ToastAction>,
      });
    }
  }, [session, toast]);

  return (
    <NavDashboardDndContext.Provider value={{ quickLinksVersion, navItemsVersion }}>
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
// move -- every consumer of this is only ever rendered inside AppShell,
// which always wraps in the provider, so a missing provider here means
// a real wiring mistake, not a case worth silently tolerating.
export function useQuickLinksVersion(): number {
  const ctx = useContext(NavDashboardDndContext);
  if (!ctx) throw new Error('useQuickLinksVersion used outside NavDashboardDndProvider');
  return ctx.quickLinksVersion;
}

// Read by AppSidebar for the same reason, on the other side of a move.
export function useNavItemsVersion(): number {
  const ctx = useContext(NavDashboardDndContext);
  if (!ctx) throw new Error('useNavItemsVersion used outside NavDashboardDndProvider');
  return ctx.navItemsVersion;
}

export function useDraggableNavItem({ enabled, id, label, iconKey, href, parentId, section, sortOrder, minTier }: {
  enabled: boolean; id: number; label: string; iconKey: string; href: string;
  parentId: number | null; section: string; sortOrder: number; minTier: string | null;
}) {
  const data: NavItemDragData = { kind: 'nav-item', id, label, iconKey, href, parentId, section, sortOrder, minTier };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `nav-item:${id}`, data, disabled: !enabled });
  return { dragHandleProps: enabled ? { ...attributes, ...listeners } : {}, setDragRef: enabled ? setNodeRef : undefined, isDragging };
}

export function useDroppableDashboard() {
  const { isOver, setNodeRef } = useDroppable({ id: DASHBOARD_DROP_ZONE_ID });
  return { setDropRef: setNodeRef, isOver };
}

export function useDraggableQuickLinkTile({ enabled, id, label, iconKey, href, external }: { enabled: boolean; id: number; label: string; iconKey: string; href: string; external: boolean }) {
  const data: QuickLinkTileDragData = { kind: 'quick-link-tile', id, label, iconKey, href, external };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `quick-link-tile:${id}`, data, disabled: !enabled });
  return { dragHandleProps: enabled ? { ...attributes, ...listeners } : {}, setDragRef: enabled ? setNodeRef : undefined, isDragging };
}

export function useDroppableSidebar() {
  const { isOver, setNodeRef } = useDroppable({ id: SIDEBAR_DROP_ZONE_ID });
  return { setDropRef: setNodeRef, isOver };
}
