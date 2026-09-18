import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Briefcase,
  GraduationCap,
  GripVertical,
  IdCard,
  LayoutGrid,
  Newspaper,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import connectedLogo from '@/assets/connected-logo.png';
import { useAuth, meetsConnectedTier } from '@/lib/auth';
import { useDraggableNavItem, useDroppableSidebar } from '@/lib/navDashboardDnd';

type NavChild = { label: string; href?: string };

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: NavChild[];
  // Omitted entirely (not just disabled) for anyone below this tier --
  // matches Matt's actual reason for wanting this: previewing a lower
  // tier should show what that tier really sees, not the same nav with
  // buttons that then fail. Exiting a preview (including one that hides
  // this sidebar's own way back to Roles & Access) happens via the
  // "Preview Connected tier" dropdown in the header, not from here.
  minTier?: 'manager' | 'admin';
};

const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutGrid },
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Admin', icon: IdCard, minTier: 'admin', children: [{ label: 'Portal settings', href: '/admin/portal-settings' }, { label: 'User Management', href: '/admin/users' }, { label: 'Manage Locations', href: '/admin/locations' }, { label: 'Manage Programs', href: '/admin/programs' }, { label: 'Manage Onboarding', href: '/admin/onboarding' }, { label: 'Manage Job Postings', href: '/admin/job-postings' }] },
  { label: 'Reporting', href: '/reporting', icon: FileText, minTier: 'manager' },
];


const secondaryNav: NavItem[] = [
  { label: 'Work', href: '/work', icon: Briefcase },
  {
    label: 'Learn',
    icon: GraduationCap,
    children: [
      { label: 'Training and Programs', href: '/learn/programs' },
    ],
  },
  {
    label: 'People',
    icon: UsersRound,
    children: [
      { label: 'Performance Review' },
      { label: 'Recruiting', href: '/people/recruiting' },
      { label: 'Onboarding', href: '/people/onboarding' },
      { label: 'All Forms', href: '/people/forms' },
    ],
  },
];

export function AppSidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const [location] = useLocation();
  const { effectiveConnectedTier } = useAuth();
  const canDrag = meetsConnectedTier(effectiveConnectedTier, 'admin');
  const visiblePrimaryNav = primaryNav.filter((item) => !item.minTier || meetsConnectedTier(effectiveConnectedTier, item.minTier));
  const visibleSecondaryNav = secondaryNav.filter((item) => !item.minTier || meetsConnectedTier(effectiveConnectedTier, item.minTier));
  // Accordion: only one section open at a time across the whole sidebar --
  // opening one collapses whatever else was open. A previous attempt at
  // this (via AI Studio) didn't actually land; this replaces the old
  // independent-per-section Record<string, boolean> that let every section
  // stay open simultaneously.
  const [openSection, setOpenSection] = useState<string | null>(null);
  // Admin-only drag-and-drop, onto the dashboard's Quick Links widget:
  // drop this whole sidebar to REMOVE a Quick Links tile someone
  // dragged back onto it -- see navDashboardDnd.tsx for the other half
  // (the dashboard's own drop zone, for adding a tile).
  const { setDropRef, isOver } = useDroppableSidebar();

  const renderItem = (item: NavItem) => {
    const active = item.href ? location === item.href || (item.href !== '/' && location.startsWith(item.href)) : false;
    const isExpanded = openSection === item.label;
    const Icon = item.icon;
    const rowClasses = `group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] font-bold transition ${
      active ? 'bg-sidebar-accent text-foreground' : 'text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground'
    }`;

    const content = (
      <>
        <span className="flex items-center gap-3">
          <Icon className="h-[19px] w-[19px]" strokeWidth={1.75} />
          {item.label}
        </span>
        {item.children && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
      </>
    );

    return (
      <div key={item.label}>
        {item.href ? (
          <DraggableNavRow canDrag={canDrag} label={item.label} icon={Icon} href={item.href}>
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
        {item.children && isExpanded && (
          <div className="ml-9 mt-1 space-y-1 border-l border-border pl-3">
            {item.children.map((child) =>
              child.href ? (
                <DraggableNavRow key={child.label} canDrag={canDrag} label={child.label} icon={Icon} href={child.href}>
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
                  key={child.label}
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
            Drag a link onto the dashboard to pin it to Quick Links
          </p>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Portal navigation">
          {visiblePrimaryNav.map(renderItem)}
          <div className="my-3 border-t border-sidebar-border" />
          {visibleSecondaryNav.map(renderItem)}
        </nav>
      </div>
    </aside>
  );
}

// Wraps a nav row so it can be dragged onto the dashboard's Quick Links
// drop zone -- a no-op passthrough when canDrag is false, so the
// non-admin experience is completely unchanged (same DOM shape as
// before this feature existed, not just visually hidden drag affordance).
// Attaches the drag listeners to this whole wrapper rather than a
// separate grip handle: dnd-kit's PointerSensor activationConstraint
// (6px of movement) already tells a click from a drag apart, so the
// Link inside still navigates normally on a plain click.
function DraggableNavRow({ canDrag, label, icon, href, children }: { canDrag: boolean; label: string; icon: LucideIcon; href: string; children: ReactNode }) {
  const { dragHandleProps, setDragRef, isDragging } = useDraggableNavItem({ enabled: canDrag, label, icon, href });
  if (!canDrag) return <>{children}</>;
  return (
    <div ref={setDragRef} {...dragHandleProps} className={`touch-none transition ${isDragging ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'}`}>
      {children}
    </div>
  );
}
