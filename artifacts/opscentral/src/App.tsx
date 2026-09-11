import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, ChevronRight, ClipboardList, Filter, Menu, Plus, Search, Trash2, X, type LucideIcon } from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetWorkItemQueryKey,
  getListWorkItemsQueryKey,
  useCreateWorkItem,
  useDeleteWorkItem,
  useGetWorkItem,
  useListWorkItems,
  useUpdateWorkItem,
} from '@workspace/api-client-react';
import type { ListWorkItemsParams, WorkItem, WorkItemInput, WorkItemUpdate } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { HeroCarousel } from '@/components/dashboard/HeroCarousel';
import { NewsCard } from '@/components/dashboard/NewsCard';
import { TedsCalendarCard } from '@/components/dashboard/TedsCalendarCard';
import { OutstandingTasksCard } from '@/components/dashboard/OutstandingTasksCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { ShortcutsCard } from '@/components/dashboard/ShortcutsCard';
import { KeyContactsCard } from '@/components/dashboard/KeyContactsCard';
import { RosteringCard } from '@/components/dashboard/RosteringCard';
import { FacebookStreamCard } from '@/components/dashboard/FacebookStreamCard';
import { SocialTimelineCard } from '@/components/dashboard/SocialTimelineCard';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LoginPage } from '@/components/LoginPage';
import ProgramsPage from '@/pages/ProgramsPage';
import FormsListPage from '@/pages/FormsListPage';
import FormPage from '@/pages/FormPage';
import WorkHubPage from '@/pages/WorkHubPage';
import WelcomeToTedsPage from '@/pages/WelcomeToTedsPage';

const queryClient = new QueryClient();

const statusMeta = {
  backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  in_progress: { label: 'In progress', color: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  blocked: { label: 'Blocked', color: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  done: { label: 'Done', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
} as const;

const priorityMeta = {
  low: { label: 'Low', color: 'text-slate-500 bg-slate-100' },
  medium: { label: 'Medium', color: 'text-amber-700 bg-amber-50' },
  high: { label: 'High', color: 'text-orange-700 bg-orange-50' },
  urgent: { label: 'Urgent', color: 'text-rose-700 bg-rose-50' },
} as const;

function formatDate(value?: string | null) {
  if (!value) return 'No date set';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatRelative(value: string) {
  const delta = Date.now() - new Date(value).valueOf();
  const hours = Math.max(0, Math.round(delta / 3600000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: WorkItem['status'] }) {
  const meta = statusMeta[status];
  return (
    <span data-testid={`status-badge-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WorkItem['priority'] }) {
  const meta = priorityMeta[priority];
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${meta.color}`}>{meta.label}</span>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, ready } = useAuth();

  if (!ready) return null;
  if (!session) return <LoginPage />;

  return (
    <div className="min-h-[100dvh] bg-background">
      <AppHeader userName={session.name} />
      <div className="flex">
        <AppSidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        {mobileOpen && (
          <button
            data-testid="button-close-sidebar"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-10 bg-foreground/30 md:hidden"
          />
        )}
        <div className="min-w-0 flex-1">
          <button
            data-testid="button-mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs font-bold text-muted-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} Menu
          </button>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
      <div>
        <div className="mono-label mb-2 flex items-center gap-2 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> {eyebrow}</div>
        <h1 data-testid={`heading-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-balance text-3xl font-extrabold tracking-[-0.05em] text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.9fr)]">
        <div className="space-y-6">
          <HeroCarousel />
          <NewsCard />
          <SocialTimelineCard />
          <FacebookStreamCard />
        </div>
        <div className="space-y-6">
          <TedsCalendarCard />
          <QuickLinksCard />
          <OutstandingTasksCard />
          <KeyContactsCard />
          <RosteringCard />
          <ShortcutsCard />
        </div>
      </div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, copy, compact = false }: { icon: LucideIcon; title: string; copy: string; compact?: boolean }) {
  return <div data-testid={`empty-state-${title.toLowerCase().replace(/\s+/g, '-')}`} className={`flex flex-col items-center justify-center text-center ${compact ? 'px-5 py-10' : 'min-h-[350px] p-8'}`}><div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{copy}</p></div>;
}

function WorkItemsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListWorkItemsParams['status'] | ''>('');
  const [priority, setPriority] = useState<ListWorkItemsParams['priority'] | ''>('');
  const params = useMemo<ListWorkItemsParams>(() => ({ search: search || undefined, status: status || undefined, priority: priority || undefined }), [search, status, priority]);
  const query = useListWorkItems(params, { query: { queryKey: getListWorkItemsQueryKey(params) } });
  const items = query.data ?? [];
  return <div className="px-5 py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[1180px]"><PageIntro eyebrow="Operations register" title="Work queue" description="A single place to see what needs doing, who owns it, and what is at risk." action={<Link href="/work-items/new" data-testid="button-create-work-item" className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-extrabold text-primary transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--primary))]"><Plus className="h-4 w-4" /> New work item</Link>} />
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-card-border bg-card p-3 shell-shadow sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-search-work-items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, owner or category…" className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/15" /></div><div className="flex gap-2"><select data-testid="select-status-filter" value={status} onChange={(event) => setStatus(event.target.value as ListWorkItemsParams['status'] | '')} className="h-10 min-w-[130px] rounded-lg border border-input bg-background px-3 text-xs font-bold outline-none focus:border-accent"><option value="">All statuses</option><option value="backlog">Backlog</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select><select data-testid="select-priority-filter" value={priority} onChange={(event) => setPriority(event.target.value as ListWorkItemsParams['priority'] | '')} className="h-10 min-w-[120px] rounded-lg border border-input bg-background px-3 text-xs font-bold outline-none focus:border-accent"><option value="">All priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select><button data-testid="button-filter-work-items" onClick={() => { setSearch(''); setStatus(''); setPriority(''); }} className="grid h-10 w-10 place-items-center rounded-lg border border-input text-muted-foreground transition hover:bg-muted hover:text-foreground"><Filter className="h-4 w-4" /></button></div></div>
      <div className="mb-4 flex items-center justify-between"><div className="text-xs text-muted-foreground"><strong className="text-foreground">{query.isLoading ? '…' : items.length}</strong> records shown</div><div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Last synced just now</div></div>
      <section className="overflow-hidden rounded-xl border border-card-border bg-card shell-shadow">{query.isLoading ? <TableSkeleton /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : items.length === 0 ? <EmptyState icon={ClipboardList} title="The queue is clear" copy="No records match those filters. Create a new work item to get the team moving." /> : <div className="divide-y divide-card-border">{items.map((item) => <WorkItemRow key={item.id} item={item} />)}</div>}</section>
    </div></div>;
}

function TableSkeleton() {
  return <div className="space-y-2 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-[72px] rounded-lg" />)}</div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5" /></div><h3 className="text-sm font-extrabold">Couldn’t load the queue</h3><p className="mt-1 text-xs text-muted-foreground">Something interrupted the connection.</p><button data-testid="button-retry-work-items" onClick={retry} className="mt-4 rounded-md bg-foreground px-4 py-2 text-xs font-extrabold text-primary transition hover:opacity-85">Try again</button></div>;
}

function WorkItemRow({ item }: { item: WorkItem }) {
  return <Link href={`/work-items/${item.id}`} data-testid={`row-work-item-${item.id}`} className="group grid gap-3 px-5 py-4 transition hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_140px_110px_130px] sm:items-center"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="font-mono text-[10px] text-muted-foreground">#{String(item.id).padStart(4, '0')}</span><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{item.category}</span></div><h3 className="truncate text-sm font-extrabold transition group-hover:text-accent">{item.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{item.owner || 'Unassigned'} {item.description ? `· ${item.description}` : ''}</p></div><div><StatusBadge status={item.status} /></div><div><PriorityBadge priority={item.priority} /></div><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'No due date'}</span><ChevronRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-accent" /></div></Link>;
}

function WorkItemForm({ initial, submitLabel, pending, onSubmit, onCancel }: { initial?: Partial<WorkItem>; submitLabel: string; pending?: boolean; onSubmit: (data: WorkItemInput | WorkItemUpdate) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<WorkItem['status']>(initial?.status ?? 'backlog');
  const [priority, setPriority] = useState<WorkItem['priority']>(initial?.priority ?? 'medium');
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const valid = title.trim().length > 0 && category.trim().length > 0;
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSubmit({ title: title.trim(), description: description.trim() || null, status, priority, owner: owner.trim() || null, dueDate: dueDate || null, category: category.trim() });
  };
  return <form data-testid="form-work-item" onSubmit={handleSubmit} className="space-y-5"><div><label className="mono-label mb-2 block text-muted-foreground" htmlFor="work-title">Title <span className="text-rose-500">*</span></label><input id="work-title" data-testid="input-work-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Replace demo stock in Richmond" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></div><div><label className="mono-label mb-2 block text-muted-foreground" htmlFor="work-description">Description</label><textarea id="work-description" data-testid="input-work-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add enough context for the next person…" rows={4} className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></div><div className="grid gap-4 sm:grid-cols-2"><FieldSelect label="Status" value={status} onChange={(value) => setStatus(value as WorkItem['status'])} options={[['backlog', 'Backlog'], ['in_progress', 'In progress'], ['blocked', 'Blocked'], ['done', 'Done']]} testId="select-work-status" /><FieldSelect label="Priority" value={priority} onChange={(value) => setPriority(value as WorkItem['priority'])} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['urgent', 'Urgent']]} testId="select-work-priority" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mono-label mb-2 block text-muted-foreground" htmlFor="work-owner">Owner</label><input id="work-owner" data-testid="input-work-owner" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name or team" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" /></div><div><label className="mono-label mb-2 block text-muted-foreground" htmlFor="work-due-date">Due date</label><input id="work-due-date" data-testid="input-work-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" /></div></div><div><label className="mono-label mb-2 block text-muted-foreground" htmlFor="work-category">Category <span className="text-rose-500">*</span></label><input id="work-category" data-testid="input-work-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Store operations, People, Systems" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" /></div><div className="flex justify-end gap-2 border-t border-border pt-5">{onCancel && <button type="button" data-testid="button-cancel-work-item" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Cancel</button>}<button type="submit" data-testid="button-submit-work-item" disabled={!valid || pending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:shadow-[3px_3px_0_hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-40">{pending ? 'Saving…' : submitLabel}<ArrowRight className="h-4 w-4" /></button></div></form>;
}

function FieldSelect({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; testId: string }) {
  return <div><label className="mono-label mb-2 block text-muted-foreground">{label}</label><select data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-accent">{options.map(([option, labelText]) => <option key={option} value={option}>{labelText}</option>)}</select></div>;
}

function NewWorkItemPage() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateWorkItem();
  const handleSubmit = (data: WorkItemInput | WorkItemUpdate) => createMutation.mutate({ data: data as WorkItemInput }, { onSuccess: (item) => { queryClient.invalidateQueries({ queryKey: getListWorkItemsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setLocation(`/work-items/${item.id}`); } });
  return <div className="px-5 py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[840px]"><PageIntro eyebrow="Create record" title="Raise a work item" description="Capture the context now. The right person can pick it up later." /><div className="rounded-xl border border-card-border bg-card p-5 shell-shadow sm:p-8"><WorkItemForm submitLabel="Create work item" pending={createMutation.isPending} onSubmit={handleSubmit} onCancel={() => setLocation('/work-items')} /></div></div></div>;
}

function WorkItemDetail() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const id = Number(params.id);
  const query = useGetWorkItem(id, { query: { enabled: Number.isFinite(id), queryKey: getGetWorkItemQueryKey(id) } });
  const updateMutation = useUpdateWorkItem();
  const deleteMutation = useDeleteWorkItem();
  const item = query.data;
  const handleUpdate = (data: WorkItemInput | WorkItemUpdate) => updateMutation.mutate({ id, data: data as WorkItemUpdate }, { onSuccess: (updated) => { queryClient.setQueryData(getGetWorkItemQueryKey(id), updated); queryClient.invalidateQueries({ queryKey: getListWorkItemsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  const handleDelete = () => { if (window.confirm('Delete this work item? This cannot be undone.')) deleteMutation.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListWorkItemsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setLocation('/work-items'); } }); };
  if (query.isLoading) return <div className="px-5 py-8 lg:px-10"><div className="mx-auto max-w-[840px] space-y-4"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-96 rounded-xl" /></div></div>;
  if (query.isError || !item) return <div className="px-5 py-8 lg:px-10"><div className="mx-auto max-w-[840px]"><ErrorState retry={() => query.refetch()} /></div></div>;
  return <div className="px-5 py-8 lg:px-10 lg:py-10"><div className="mx-auto max-w-[840px]"><div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"><Link href="/work-items" data-testid="link-back-work-items" className="font-bold transition hover:text-accent">Work queue</Link><ChevronRight className="h-3.5 w-3.5" /><span className="font-mono">#{String(item.id).padStart(4, '0')}</span></div><PageIntro eyebrow={`${item.category} · Updated ${formatRelative(item.updatedAt)}`} title="Edit work item" description="Keep the record current so the team always has the right signal." action={<div className="flex gap-2"><button data-testid="button-delete-work-item" onClick={handleDelete} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Delete</button></div>} /><div className="mb-5 flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /><span className="text-xs text-muted-foreground">Created {formatDate(item.createdAt)}</span></div><div className="rounded-xl border border-card-border bg-card p-5 shell-shadow sm:p-8"><WorkItemForm initial={item} submitLabel="Save changes" pending={updateMutation.isPending} onSubmit={handleUpdate} onCancel={() => setLocation('/work-items')} /></div></div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Dashboard} /><Route path="/work/welcome" component={WelcomeToTedsPage} /><Route path="/work" component={WorkHubPage} /><Route path="/learn/programs" component={ProgramsPage} /><Route path="/people/forms/:slug" component={FormPage} /><Route path="/people/forms" component={FormsListPage} /><Route path="/work-items/new" component={NewWorkItemPage} /><Route path="/work-items/:id" component={WorkItemDetail} /><Route path="/work-items" component={WorkItemsPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell><Router /></AppShell></WouterRouter><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>;
}

export default App;