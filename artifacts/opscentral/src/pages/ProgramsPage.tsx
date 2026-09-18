import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { GraduationCap, ChevronRight, ChevronDown, GripVertical, ListOrdered, Check, X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

type Module = {
  id: number;
  status: ModuleStatus;
};

type Program = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  modules: Module[];
};

type TrainingCategory = { id: number; name: string; color: string; sortOrder: number };
const UNCATEGORISED_COLOR = 'bg-muted-foreground/40';

function ProgramCardInner({ program, categoryColor }: { program: Program; categoryColor: string }) {
  const total = program.modules.length;
  const completed = program.modules.filter((m) => m.status === 'completed').length;

  return (
    <>
      <div className="aspect-video w-full shrink-0 overflow-hidden bg-muted">
        {program.thumbnailUrl ? (
          <img src={program.thumbnailUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-extrabold leading-snug text-foreground">{program.title}</h2>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>

        {program.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{program.description}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {program.category && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              <span className={`h-2 w-2 shrink-0 rounded-full ${categoryColor}`} />
              {program.category}
            </span>
          )}
          {total > 0 && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
              {completed}/{total} modules complete
            </span>
          )}
          {(program.startDate || program.endDate) && (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {program.startDate}
              {program.endDate ? `–${program.endDate}` : ''}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function SortableProgramCard({ program, editing, categoryColor }: { program: Program; editing: boolean; categoryColor: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: program.id, disabled: !editing });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  if (!editing) {
    return (
      <Link
        href={`/learn/programs/${program.id}`}
        data-testid={`link-program-${program.id}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card shell-shadow transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <ProgramCardInner program={program} categoryColor={categoryColor} />
      </Link>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`sortable-program-${program.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-card-border bg-card shell-shadow"
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${program.title}`}
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 cursor-grab place-items-center rounded-md border border-border bg-card/95 text-muted-foreground shadow-sm transition hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="pointer-events-none">
        <ProgramCardInner program={program} categoryColor={categoryColor} />
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  const { session, effectiveConnectedTier } = useAuth();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('programsCollapsedCategories') ?? '{}');
    } catch {
      return {};
    }
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const canReorder = meetsConnectedTier(effectiveConnectedTier, 'admin');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = () => {
    const params = session?.name ? `?staffName=${encodeURIComponent(session.name)}` : '';
    fetch(`/api/training/programs${params}`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setPrograms)
      .catch(() => setPrograms([]));
  };

  useEffect(load, [session?.name]);
  useEffect(() => {
    fetch('/api/training/categories', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const colorForCategory = (name: string | null) => {
    if (!name) return UNCATEGORISED_COLOR;
    const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return match?.color ?? UNCATEGORISED_COLOR;
  };

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('programsCollapsedCategories', JSON.stringify(next));
      return next;
    });
  };

  // Groups by category for the default browsing view, in registry
  // sortOrder, with any category not in the registry (or no category at
  // all) trailing in a catch-all group -- non-fatal for programs whose
  // category doesn't match anything, they just aren't color-grouped yet.
  // Order WITHIN each group follows the same sortOrder-driven order the
  // flat list already uses. Reorder mode (below) intentionally stays flat
  // and ungrouped so the existing drag-and-drop logic doesn't need to
  // understand groups at all -- dragging cards of the same category next
  // to each other in that flat order is what naturally clusters them here.
  const groupedPrograms = useMemo(() => {
    if (!programs) return [];
    const byName = new Map<string, Program[]>();
    const uncategorised: Program[] = [];
    for (const program of programs) {
      const match = program.category && categories.find((c) => c.name.toLowerCase() === program.category!.toLowerCase());
      if (match) {
        if (!byName.has(match.name)) byName.set(match.name, []);
        byName.get(match.name)!.push(program);
      } else {
        uncategorised.push(program);
      }
    }
    const groups = categories
      .filter((c) => byName.has(c.name))
      .map((c) => ({ key: c.name, label: c.name, color: c.color, programs: byName.get(c.name)! }));
    if (uncategorised.length > 0) groups.push({ key: '__uncategorised', label: 'Uncategorised', color: UNCATEGORISED_COLOR, programs: uncategorised });
    return groups;
  }, [programs, categories]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(Number(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPrograms((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveOrder = async () => {
    if (!programs) return;
    setSaving(true);
    try {
      const res = await fetch('/api/training/programs/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ programIds: programs.map((p) => p.id) }),
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

  const activeProgram = useMemo(() => programs?.find((p) => p.id === activeId) ?? null, [programs, activeId]);

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold text-foreground">Training and Programs</h1>
          {canReorder && !editing && programs && programs.length > 1 && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
            >
              <ListOrdered className="h-3.5 w-3.5" /> Reorder
            </button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={saveOrder}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          )}
        </div>

        {editing && <p className="-mt-2 text-xs text-muted-foreground">Drag a card by its handle to reorder. This is the order everyone sees on Learn &gt; Programs.</p>}

        {programs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {programs?.length === 0 && <p className="text-sm text-muted-foreground">No active programs right now.</p>}

        {!editing && programs && programs.length > 0 && (
          <div className="space-y-6">
            {groupedPrograms.map((group) => {
              const isCollapsed = collapsed[group.key];
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(group.key)}
                    className="mb-3 flex w-full items-center gap-2 text-left"
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-full ${group.color}`} />
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{group.label}</h2>
                    <span className="text-xs font-semibold text-muted-foreground">({group.programs.length})</span>
                    <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.programs.map((program) => (
                        <SortableProgramCard key={program.id} program={program} editing={false} categoryColor={group.color} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {editing && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={programs?.map((p) => p.id) ?? []} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {programs?.map((program) => (
                  <SortableProgramCard key={program.id} program={program} editing={editing} categoryColor={colorForCategory(program.category)} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeProgram ? (
                <div className="flex flex-col overflow-hidden rounded-xl border-2 border-primary bg-card shadow-lg">
                  <ProgramCardInner program={activeProgram} categoryColor={colorForCategory(activeProgram.category)} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
