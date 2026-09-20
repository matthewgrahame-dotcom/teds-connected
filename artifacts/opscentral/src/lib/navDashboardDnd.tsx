import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  closestCorners,
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
// A THIRD destination was added later: dropping a nav item directly onto
// a sidebar GROUP HEADER (Admin, Learn, People -- any item with
// children) REPARENTS it as a child of that group, via a single PATCH
// to /api/nav-items/:id (parentId/section/sortOrder only) -- no row is
// created or deleted, unlike the two moves above. Each group header gets
// its OWN droppable id (see NAV_GROUP_DROP_PREFIX / useDroppableNavGroup
// below), distinct from SIDEBAR_DROP_ZONE_ID, so dnd-kit's collision
// detection can tell "onto this specific group" apart from "onto the
// sidebar generally" (which still falls through to the existing
// quick-link-tile move below -- nested droppables don't interfere with
// each other here since closestCorners always resolves to exactly one
// `over` id).
//
// CRITICAL: this is the ONLY DndContext for the whole app -- Dashboard.tsx's
// own widget-drag-to-reorder feature (pre-existing, unrelated to this one)
// used to have its OWN, separate <DndContext>, nested inside this one once
// this provider was lifted into App.tsx. That's a real bug, not a harmless
// duplication: React context always resolves to the NEAREST provider, so
// QuickLinksCard's useDroppable (a descendant of Dashboard.tsx) was silently
// binding to Dashboard's inner context instead of this outer one -- the
// dragged nav item would lift and follow the cursor fine (that part's
// handled by THIS context's own sensors), but dropping it over QuickLinksCard
// registered with a completely different DndContext instance, so this
// context's onDragEnd never saw it as a valid drop target at all. Confirmed
// directly: Matt reported exactly that symptom (lifts fine, drop does
// nothing) while on the dashboard page with Quick Links visible, which ruled
// out every other explanation first. Fixed by registerDragHandlers below:
// Dashboard.tsx registers its OWN onDragStart/onDragEnd here instead of
// wrapping its own DndContext, so there is exactly one DndContext, and
// every drag (nav-item, quick-link-tile, or a dashboard widget reorder) is
// dispatched through the same onDragEnd, each kind safely ignoring events
// that aren't its own (Dashboard's handler already only acts on ids that
// match one of its own widgets, so passing every event through it is safe).
// The group-reparent branch below follows the same rule: it's just another
// case inside this SAME handleDragEnd, using the SAME useDroppable hook
// pattern as useDroppableSidebar/useDroppableDashboard -- never a second
// DndContext.
//
// The two draggable "kinds" native to this file are told apart by each
// drag's own `data.kind`. Both directions follow the same safe order:
// POST the new side FIRST, and only DELETE the old side once that POST
// actually succeeded -- if the POST fails, nothing is deleted, so a
// failed move never actually loses the item. Both also show an Undo
// toast that reverses the WHOLE move (delete the new side, recreate the
// old one with its original data) rather than just one half of it. The
// reparent case doesn't need that create/delete dance at all -- it's a
// single PATCH, so its own undo is just a second PATCH back to the
// dragged item's original parentId/section/sortOrder (already captured
// in the drag data from before the drag started).
type NavItemDragData = {
  kind: 'nav-item'; id: number; label: string; iconKey: string; href: string;
  parentId: number | null; section: string; sortOrder: number; minTier: string | null;
};
type QuickLinkTileDragData = { kind: 'quick-link-tile'; id: number; label: string; iconKey: string; href: string; external: boolean };
type DragData = NavItemDragData | QuickLinkTileDragData;

const DASHBOARD_DROP_ZONE_ID = 'nav-dashboard-dnd:dashboard-drop-zone';
const SIDEBAR_DROP_ZONE_ID = 'nav-dashboard-dnd:sidebar-drop-zone';
// Prefix for each group header's own droppable id -- see the top comment
// block for why this needs to be distinct from SIDEBAR_DROP_ZONE_ID.
const NAV_GROUP_DROP_PREFIX = 'nav-group-drop:';
const UNDO_WINDOW_MS = 8000;

type ExternalDragHandlers = { onDragStart?: (event: DragStartEvent) => void; onDragEnd?: (event: DragEndEvent) => void };

type NavDashboardDndContextValue = {
  // Both increment on every successful move -- QuickLinksCard watches
  // quickLinksVersion and AppSidebar watches navItemsVersion, each
  // re-fetching whenever ITS OWN counter changes, rather than the
  // provider needing to reach into either component directly. A single
  // move increments BOTH, since it always touches both tables. A
  // reparent only ever touches nav_items, so it increments just
  // navItemsVersion.
  quickLinksVersion: number;
  navItemsVersion: number;
  // Lets another feature (currently just Dashboard.tsx's widget reorder)
  // plug its own onDragStart/onDragEnd into THIS single shared DndContext,
  // instead of wrapping its own -- see the CRITICAL note above for why
  // that's required, not optional. Returns an unregister function; call it
  // from the registering component's own useEffect cleanup.
  registerDragHandlers: (handlers: ExternalDragHandlers) => () => void;
};
const NavDashboardDndContext = createContext<NavDashboardDndContextValue | null>(null);

export function NavDashboardDndProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [quickLinksVersion, setQuickLinksVersion] = useState(0);
  const [navItemsVersion, setNavItemsVersion] = useState(0);
  // Was `{ distance: 6 }` -- on touch, any incidental finger movement
  // past 6px (which a normal scroll-start gesture blows through in a
  // couple of pixels) immediately started a drag, so scrolling the page
  // while a finger happened to land on a tile/nav row would yank it
  // instead. `delay` requires the pointer to stay down for a beat before
  // a drag is allowed to start at all, and `tolerance` still cancels
  // that pending drag if the finger moves more than a few px during the
  // delay -- exactly the "was this a scroll or a deliberate press-and-hold"
  // distinction a scroll gesture and a drag-start both need. Mouse users
  // are unaffected in practice: 200ms is well under normal click-and-drag
  // timing.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }));
  // A ref, not state -- registration happens in an effect (once, on
  // mount) and is read inside drag callbacks; neither needs a re-render
  // when the registered set changes, and a ref avoids handleDragEnd's
  // identity changing every time something (un)registers.
  const externalHandlersRef = useRef<Set<ExternalDragHandlers>>(new Set());

  const registerDragHandlers = useCallback((handlers: ExternalDragHandlers) => {
    externalHandlersRef.current.add(handlers);
    return () => {
      externalHandlersRef.current.delete(handlers);
    };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag((event.active.data.current as DragData | undefined) ?? null);
    for (const handlers of externalHandlersRef.current) handlers.onDragStart?.(event);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const data = event.active.data.current as DragData | undefined;
    const overId = event.over?.id;
    setActiveDrag(null);
    // Always give every registered external handler (Dashboard's widget
    // reorder) a chance at every event -- it safely no-ops on anything
    // that isn't one of its own widget ids, so this is safe even for a
    // nav-item/quick-link-tile drag.
    for (const handlers of externalHandlersRef.current) handlers.onDragEnd?.(event);
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
    } else if (data.kind === 'nav-item' && typeof overId === 'string' && overId.startsWith(NAV_GROUP_DROP_PREFIX)) {
      // REPARENT, not a move across tables -- dropping a nav item directly
      // onto a group header (Admin/Learn/People/any item with children)
      // makes it a child of that group via a single PATCH to the same
      // row, nothing created or deleted elsewhere. Protected (Dashboard)
      // never even starts a drag (see DraggableNavRow's `enabled` check
      // in AppSidebar.tsx), but this re-checks server-side truth anyway
      // rather than trusting the drag payload's own now-possibly-stale
      // snapshot.
      const groupId = Number(overId.slice(NAV_GROUP_DROP_PREFIX.length));
      if (!Number.isInteger(groupId) || groupId === data.id) return; // can't become its own parent

      const itemsRes = await fetch('/api/nav-items', { headers: authHeaders(session) });
      if (!itemsRes.ok) return;
      const allItems: { id: number; parentId: number | null; section: string; sortOrder: number; label: string; protected: boolean }[] = await itemsRes.json();

      const dragged = allItems.find((i) => i.id === data.id);
      const target = allItems.find((i) => i.id === groupId);
      if (!dragged || !target || dragged.protected) return;

      // Cycle guard: refuse if the drop target is the dragged item itself
      // or any descendant of it -- dropping a group into its own
      // child/grandchild would disconnect part of the tree rather than
      // just relocating one item.
      const isDescendantOf = (candidateId: number, ancestorId: number): boolean => {
        let current = allItems.find((i) => i.id === candidateId);
        while (current?.parentId != null) {
          if (current.parentId === ancestorId) return true;
          current = allItems.find((i) => i.id === current!.parentId);
        }
        return false;
      };
      if (isDescendantOf(groupId, data.id)) return;

      const appendSortOrder = allItems.filter((i) => i.parentId === groupId).reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1;

      const patchRes = await fetch(`/api/nav-items/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ parentId: groupId, section: target.section, sortOrder: appendSortOrder }),
      });
      if (!patchRes.ok) return;
      setNavItemsVersion((v) => v + 1);

      const undo = async () => {
        await fetch(`/api/nav-items/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({ parentId: data.parentId, section: data.section, sortOrder: data.sortOrder }),
        });
        setNavItemsVersion((v) => v + 1);
      };
      toast({
        title: `Moved "${data.label}" into "${target.label}"`,
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
    <NavDashboardDndContext.Provider value={{ quickLinksVersion, navItemsVersion, registerDragHandlers }}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

// Read by AppSidebar for the same reason, on the other side of a move
// (and now also after a reparent, since that touches nav_items too).
export function useNavItemsVersion(): number {
  const ctx = useContext(NavDashboardDndContext);
  if (!ctx) throw new Error('useNavItemsVersion used outside NavDashboardDndProvider');
  return ctx.navItemsVersion;
}

// Lets Dashboard.tsx's widget-reorder feature plug its own drag handlers
// into this shared DndContext instead of wrapping its own -- see the
// CRITICAL note at the top of this file for why that's required. Call
// with the same handlers object every render (or memoize it) so the
// registration doesn't churn on every re-render; the effect below
// re-registers whenever the handlers reference changes, which is
// correct but wasteful if it changes every render for no real reason.
export function useRegisterDragHandlers(handlers: ExternalDragHandlers) {
  const ctx = useContext(NavDashboardDndContext);
  if (!ctx) throw new Error('useRegisterDragHandlers used outside NavDashboardDndProvider');
  const { registerDragHandlers } = ctx;
  useEffect(() => registerDragHandlers(handlers), [registerDragHandlers, handlers]);
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

// One of these per sidebar GROUP HEADER (an item with children.length >
// 0) -- gives that specific row its OWN droppable id so a drop directly
// on it can be told apart from a drop anywhere else in the sidebar (see
// the top comment block). Must be called from a component that's a
// descendant of NavDashboardDndProvider's own DndContext -- AppSidebar
// renders this per row via its own small wrapper component, same as
// every other useDraggable/useDroppable call in this file, never from a
// component that itself returns a DndContext.
export function useDroppableNavGroup(groupId: number) {
  const { isOver, setNodeRef } = useDroppable({ id: `${NAV_GROUP_DROP_PREFIX}${groupId}` });
  return { setDropRef: setNodeRef, isOver };
}
