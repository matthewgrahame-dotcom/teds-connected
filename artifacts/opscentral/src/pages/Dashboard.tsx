import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Check, RotateCcw, Scale, Maximize2, Minimize2 } from 'lucide-react';
import {
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { usePublishAccess } from '@/lib/publishAccess';
import { DASHBOARD_WIDGET_REGISTRY, DEFAULT_DASHBOARD_LAYOUT, type DashboardColumn } from '@/components/dashboard/registry';
import { useRegisterDragHandlers } from '@/lib/navDashboardDnd';

type LayoutItem = { widgetKey: string; column: DashboardColumn };

function SortableWidget({
  item,
  editing,
  registerRef,
  onToggleWide,
}: {
  item: LayoutItem;
  editing: boolean;
  registerRef: (key: string, node: HTMLDivElement | null) => void;
  onToggleWide: (widgetKey: string) => void;
}) {
  const entry = DASHBOARD_WIDGET_REGISTRY[item.widgetKey];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.widgetKey, disabled: !editing });

  if (!entry) return null;
  const Widget = entry.component;

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        registerRef(item.widgetKey, node);
      }}
      style={style}
      className="relative"
    >
      {editing && (
        <button
          type="button"
          aria-label={`Drag to reorder ${entry.label}`}
          {...attributes}
          {...listeners}
          className="absolute -left-3 top-4 z-10 grid h-8 w-8 cursor-grab place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {editing && (
        <button
          type="button"
          onClick={() => onToggleWide(item.widgetKey)}
          aria-label={item.column === 'wide' ? `Shrink ${entry.label} back to column width` : `Widen ${entry.label} to full width`}
          title={item.column === 'wide' ? 'Shrink to column width' : 'Widen to full width'}
          className="absolute -right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground"
        >
          {item.column === 'wide' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
      <div className={editing ? 'pointer-events-none rounded-xl ring-2 ring-primary/40' : ''}>
        <Widget />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session, effectiveConnectedTier } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const widgetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const canEdit = meetsConnectedTier(effectiveConnectedTier, 'admin');

  const load = () => {
    fetch('/api/dashboard-widgets', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: { widgetKey: string; column: DashboardColumn }[]) => {
        if (rows.length === 0) return;
        const saved = rows.map((r) => ({ widgetKey: r.widgetKey, column: r.column }));
        // A saved layout is a point-in-time snapshot, not a diff -- it
        // wholesale-replaces DEFAULT_DASHBOARD_LAYOUT (see PUT
        // /dashboard-widgets), so any widget added to the registry AFTER
        // someone last saved a custom layout would otherwise never appear
        // for them, silently, forever. Append any such newcomers (in their
        // default column) so new dashboard cards show up for everyone on
        // next load without requiring a manual re-drag.
        const savedKeys = new Set(saved.map((s) => s.widgetKey));
        const missing = DEFAULT_DASHBOARD_LAYOUT.filter((d) => !savedKeys.has(d.widgetKey));
        setLayout([...saved, ...missing]);
      })
      .catch(() => {});
  };

  useEffect(load, []);

  // Lets the header's "Edit Layout" trigger (lives in the profile menu, not
  // on this page -- see AppHeader) work from anywhere. Two paths: arriving
  // fresh via ?editLayout=1 (handled here on mount), or already being on
  // this page, in which case AppHeader dispatches this event directly
  // since navigate()-ing to the same pathname wouldn't otherwise re-fire
  // this effect.
  useEffect(() => {
    if (!canEdit) return;
    const trigger = () => requirePublishAccess(() => setEditing(true));

    const url = new URL(window.location.href);
    if (url.searchParams.get('editLayout') === '1') {
      url.searchParams.delete('editLayout');
      window.history.replaceState({}, '', url.toString());
      trigger();
    }

    window.addEventListener('connected:edit-layout', trigger);
    return () => window.removeEventListener('connected:edit-layout', trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const registerRef = (key: string, node: HTMLDivElement | null) => {
    widgetRefs.current[key] = node;
  };

  const mainItems = useMemo(() => layout.filter((i) => i.column === 'main'), [layout]);
  const sidebarItems = useMemo(() => layout.filter((i) => i.column === 'sidebar'), [layout]);
  const wideItems = useMemo(() => layout.filter((i) => i.column === 'wide'), [layout]);

  // Toggle-only, not drag-based -- moving into/out of the full-width
  // section happens by clicking the expand/shrink button, not by dragging
  // across from the main/sidebar columns. Simpler and more predictable
  // than teaching handleDragEnd's cross-column logic a three-way version;
  // reordering *within* each of the three lists (and between main/sidebar)
  // still works exactly as before via drag.
  const toggleWide = (widgetKey: string) => {
    setLayout((prev) => prev.map((i) => (i.widgetKey === widgetKey ? { ...i, column: i.column === 'wide' ? 'main' : 'wide' } : i)));
  };

  const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(String(event.active.id)), []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLayout((prev) => {
      const activeItem = prev.find((i) => i.widgetKey === active.id);
      const overItem = prev.find((i) => i.widgetKey === over.id);
      if (!activeItem || !overItem) return prev;

      // The wide section is toggle-only (see toggleWide above) -- a drag
      // that crosses into or out of it is ignored rather than moving the
      // widget, since only main<->sidebar cross-column dragging is wired
      // up below.
      if ((activeItem.column === 'wide') !== (overItem.column === 'wide')) return prev;

      // Moving within the same column: simple reorder.
      if (activeItem.column === overItem.column) {
        const columnItems = prev.filter((i) => i.column === activeItem.column);
        const otherItems = prev.filter((i) => i.column !== activeItem.column);
        const oldIndex = columnItems.findIndex((i) => i.widgetKey === active.id);
        const newIndex = columnItems.findIndex((i) => i.widgetKey === over.id);
        const reordered = arrayMove(columnItems, oldIndex, newIndex);
        return activeItem.column === 'main' ? [...reordered, ...otherItems] : [...otherItems, ...reordered];
      }

      // Moving to a different column: drop it at the target's position there.
      const withoutActive = prev.filter((i) => i.widgetKey !== active.id);
      const targetColumnItems = withoutActive.filter((i) => i.column === overItem.column);
      const otherColumnItems = withoutActive.filter((i) => i.column !== overItem.column);
      const insertAt = targetColumnItems.findIndex((i) => i.widgetKey === over.id);
      const moved = { ...activeItem, column: overItem.column };
      targetColumnItems.splice(insertAt, 0, moved);
      return overItem.column === 'main' ? [...targetColumnItems, ...otherColumnItems] : [...otherColumnItems, ...targetColumnItems];
    });
  }, []);

  // Plugs into the app's ONE shared DndContext (lifted in App.tsx) rather
  // than wrapping a separate one here -- see the CRITICAL note in
  // navDashboardDnd.tsx for exactly why a second, nested DndContext here
  // silently broke the nav<->dashboard drag feature. useMemo keeps this
  // object identity-stable across renders (both handlers are already
  // useCallback-stable), so the registration effect doesn't re-fire on
  // every render for no reason.
  useRegisterDragHandlers(useMemo(() => ({ onDragStart: handleDragStart, onDragEnd: handleDragEnd }), [handleDragStart, handleDragEnd]));

  // Measures each widget's actual rendered height and redistributes them
  // across the two columns with a greedy bin-pack (largest first, always
  // added to the currently-shorter column) -- gets both columns as close to
  // equal total height as possible given the discrete set of widget sizes
  // in play, which is what actually determines whether the bottoms line up
  // (dragging alone can't fix that -- it's a height-sum problem, not an
  // ordering problem).
  const balanceColumns = () => {
    // Wide items sit outside the main/sidebar height-balancing entirely --
    // this used to iterate over ALL layout items regardless of column,
    // which would have silently shrunk any wide widget back to a normal
    // column on every click.
    const balanceable = layout.filter((item) => item.column !== 'wide');
    const wide = layout.filter((item) => item.column === 'wide');
    const heights = balanceable.map((item) => ({ item, height: widgetRefs.current[item.widgetKey]?.offsetHeight ?? 0 }));
    heights.sort((a, b) => b.height - a.height);

    let mainHeight = 0;
    let sidebarHeight = 0;
    const mainOut: LayoutItem[] = [];
    const sidebarOut: LayoutItem[] = [];
    for (const { item, height } of heights) {
      if (mainHeight <= sidebarHeight) {
        mainOut.push({ ...item, column: 'main' });
        mainHeight += height;
      } else {
        sidebarOut.push({ ...item, column: 'sidebar' });
        sidebarHeight += height;
      }
    }
    setLayout([...wide, ...mainOut, ...sidebarOut]);
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard-widgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ widgets: layout }),
      });
      if (res.ok) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    load();
  };

  const resetToDefault = () => setLayout(DEFAULT_DASHBOARD_LAYOUT);

  const activeKeys = new Set(layout.map((i) => i.widgetKey));
  const toggleWidget = (widgetKey: string) => {
    setLayout((prev) => {
      if (activeKeys.has(widgetKey)) return prev.filter((i) => i.widgetKey !== widgetKey);
      return [...prev, { widgetKey, column: 'sidebar' as DashboardColumn }];
    });
  };

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        {editing && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={balanceColumns}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
              title="Redistribute widgets across both columns to even out their heights"
            >
              <Scale className="h-3.5 w-3.5" /> Balance Columns
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </button>
            <button type="button" onClick={cancelEditing} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={saveLayout}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Layout'}
            </button>
          </div>
        )}

        {editing && (
          <div className="mb-4 rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Widgets shown on the dashboard</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(DASHBOARD_WIDGET_REGISTRY).map(([key, entry]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={activeKeys.has(key)} onChange={() => toggleWidget(key)} />
                  {entry.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {wideItems.length > 0 && (
          <SortableContext items={wideItems.map((i) => i.widgetKey)} strategy={verticalListSortingStrategy}>
            <div className="mb-6 space-y-6">
              {wideItems.map((item) => (
                <SortableWidget key={item.widgetKey} item={item} editing={editing} registerRef={registerRef} onToggleWide={toggleWide} />
              ))}
            </div>
          </SortableContext>
        )}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.9fr)]">
          <SortableContext items={mainItems.map((i) => i.widgetKey)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {mainItems.map((item) => (
                <SortableWidget key={item.widgetKey} item={item} editing={editing} registerRef={registerRef} onToggleWide={toggleWide} />
              ))}
            </div>
          </SortableContext>
          <SortableContext items={sidebarItems.map((i) => i.widgetKey)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {sidebarItems.map((item) => (
                <SortableWidget key={item.widgetKey} item={item} editing={editing} registerRef={registerRef} onToggleWide={toggleWide} />
              ))}
            </div>
          </SortableContext>
        </div>
        <DragOverlay>
          {activeId && DASHBOARD_WIDGET_REGISTRY[activeId] ? (
            <div className="rounded-xl border-2 border-primary bg-card px-4 py-3 text-sm font-bold text-foreground shadow-lg">
              {DASHBOARD_WIDGET_REGISTRY[activeId].label}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </div>
  );
}
