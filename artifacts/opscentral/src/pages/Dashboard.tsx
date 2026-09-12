import { useEffect, useMemo, useState } from 'react';
import { GripVertical, LayoutGrid, Check, RotateCcw } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { usePublishAccess } from '@/lib/publishAccess';
import { DASHBOARD_WIDGET_REGISTRY, DEFAULT_DASHBOARD_LAYOUT, type DashboardColumn } from '@/components/dashboard/registry';

type LayoutItem = { widgetKey: string; column: DashboardColumn };

function SortableWidget({ item, editing }: { item: LayoutItem; editing: boolean }) {
  const entry = DASHBOARD_WIDGET_REGISTRY[item.widgetKey];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.widgetKey, disabled: !editing });

  if (!entry) return null;
  const Widget = entry.component;

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative">
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
      <div className={editing ? 'pointer-events-none rounded-xl ring-2 ring-primary/40' : ''}>
        <Widget />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const canEdit = session?.level === 'full';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = () => {
    fetch('/api/dashboard-widgets', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: { widgetKey: string; column: DashboardColumn }[]) => {
        if (rows.length > 0) setLayout(rows.map((r) => ({ widgetKey: r.widgetKey, column: r.column })));
      })
      .catch(() => {});
  };

  useEffect(load, []);

  const mainItems = useMemo(() => layout.filter((i) => i.column === 'main'), [layout]);
  const sidebarItems = useMemo(() => layout.filter((i) => i.column === 'sidebar'), [layout]);

  const startEditing = () => requirePublishAccess(() => setEditing(true));

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLayout((prev) => {
      const activeItem = prev.find((i) => i.widgetKey === active.id);
      const overItem = prev.find((i) => i.widgetKey === over.id);
      if (!activeItem || !overItem) return prev;

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

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1400px]">
        {canEdit && (
          <div className="mb-4 flex items-center justify-end gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Edit Layout
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.9fr)]">
            <SortableContext items={mainItems.map((i) => i.widgetKey)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {mainItems.map((item) => (
                  <SortableWidget key={item.widgetKey} item={item} editing={editing} />
                ))}
              </div>
            </SortableContext>
            <SortableContext items={sidebarItems.map((i) => i.widgetKey)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {sidebarItems.map((item) => (
                  <SortableWidget key={item.widgetKey} item={item} editing={editing} />
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
        </DndContext>
      </div>
    </div>
  );
}
