import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Briefcase,
  GraduationCap,
  IdCard,
  LayoutGrid,
  Newspaper,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import connectedLogo from '@/assets/connected-logo.png';

type NavChild = { label: string; href?: string };

type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: NavChild[];
};

const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutGrid },
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Admin', icon: IdCard, children: [{ label: 'Portal settings' }, { label: 'Access' }] },
  { label: 'Reporting', href: '/reporting', icon: FileText },
];

const secondaryNav: NavItem[] = [
  { label: 'Work', href: '/work', icon: Briefcase },
  {
    label: 'Learn',
    icon: GraduationCap,
    children: [
      { label: 'My Training' },
      { label: 'Manual Assessments' },
      { label: 'Observations' },
      { label: 'Workshops' },
      { label: 'Programs', href: '/learn/programs' },
    ],
  },
  {
    label: 'People',
    icon: UsersRound,
    children: [
      { label: 'Performance Review' },
      { label: 'Discussion Forums' },
      { label: 'Staff Surveys' },
      { label: 'Recruiting' },
      { label: 'Onboarding' },
      { label: 'Contracts' },
      { label: 'Forms', href: '/people/forms' },
      { label: 'Custom Report Builder' },
    ],
  },
];

export function AppSidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const renderItem = (item: NavItem) => {
    const active = item.href ? location === item.href || (item.href !== '/' && location.startsWith(item.href)) : false;
    const isExpanded = Boolean(expanded[item.label]);
    const Icon = item.icon;
    const rowClasses = `group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-[15px] font-bold transition ${
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
          <Link href={item.href} onClick={onNavigate} data-testid={`link-nav-${item.label.toLowerCase()}`} className={rowClasses}>
            {content}
          </Link>
        ) : (
          <button
            type="button"
            data-testid={`button-nav-${item.label.toLowerCase()}`}
            onClick={() => setExpanded((current) => ({ ...current, [item.label]: !current[item.label] }))}
            className={rowClasses}
          >
            {content}
          </button>
        )}
        {item.children && isExpanded && (
          <div className="ml-9 mt-1 space-y-1 border-l border-border pl-3">
            {item.children.map((child) =>
              child.href ? (
                <Link
                  key={child.label}
                  href={child.href}
                  onClick={onNavigate}
                  data-testid={`link-nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm font-semibold transition hover:bg-sidebar-accent/60 hover:text-foreground ${
                    location === child.href ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {child.label}
                </Link>
              ) : (
                <button
                  key={child.label}
                  type="button"
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm font-semibold text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
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
      className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-sidebar-border bg-sidebar pt-[170px] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:pt-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo panel -- the logo image intentionally overflows upward past
            this panel's own top edge to sit on top of the header's black
            utility bar above it. Needs the aside's z-40 (higher than
            AppHeader's z-30) to actually paint on top rather than behind it. */}
        <div className="relative hidden border-b border-sidebar-border pb-6 pt-8 md:block">
          <Link href="/" className="relative -mt-16 flex items-center justify-center">
            <img src={connectedLogo} alt="Connected" className="h-24 w-auto drop-shadow-md" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Portal navigation">
          {primaryNav.map(renderItem)}
          <div className="my-3 border-t border-sidebar-border" />
          {secondaryNav.map(renderItem)}
        </nav>
      </div>
    </aside>
  );
}
