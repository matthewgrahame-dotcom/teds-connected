import type { ComponentType } from 'react';
import { HeroCarousel } from './HeroCarousel';
import { NewsCard } from './NewsCard';
import { SocialTimelineCard } from './SocialTimelineCard';
import { FacebookStreamCard } from './FacebookStreamCard';
import { TedsCalendarCard } from './TedsCalendarCard';
import { QuickLinksCard } from './QuickLinksCard';
import { OutstandingTasksCard } from './OutstandingTasksCard';
import { KeyContactsCard } from './KeyContactsCard';
import { RosteringCard } from './RosteringCard';
import { AiHelpCard } from './AiHelpCard';

export type DashboardColumn = 'main' | 'sidebar';

// Maps a plain string key (what's actually stored in dashboard_widgets, and
// what drag-and-drop reordering sends back) to the real component -- keeps
// the DB/API layer as plain data rather than trying to serialize components.
export const DASHBOARD_WIDGET_REGISTRY: Record<string, { label: string; component: ComponentType }> = {
  hero: { label: 'Hero Carousel', component: HeroCarousel },
  news: { label: 'News', component: NewsCard },
  tedsTalks: { label: "Ted's Talks", component: SocialTimelineCard },
  facebook: { label: 'Facebook Stream', component: FacebookStreamCard },
  calendar: { label: "Teds Calendar", component: TedsCalendarCard },
  quickLinks: { label: 'Quick Links', component: QuickLinksCard },
  outstandingTasks: { label: 'Outstanding Tasks', component: OutstandingTasksCard },
  keyContacts: { label: 'Key Contacts', component: KeyContactsCard },
  rostering: { label: 'Rostering', component: RosteringCard },
  aiHelp: { label: 'AI Help', component: AiHelpCard },
};

// Falls back to this when nothing's been saved yet (first load, or nobody's
// customized the layout) -- matches the original hardcoded order exactly,
// so turning this feature on doesn't visibly change anything until an
// admin actually drags something.
export const DEFAULT_DASHBOARD_LAYOUT: { widgetKey: string; column: DashboardColumn }[] = [
  { widgetKey: 'hero', column: 'main' },
  { widgetKey: 'news', column: 'main' },
  { widgetKey: 'tedsTalks', column: 'main' },
  { widgetKey: 'facebook', column: 'main' },
  { widgetKey: 'calendar', column: 'sidebar' },
  { widgetKey: 'quickLinks', column: 'sidebar' },
  { widgetKey: 'aiHelp', column: 'sidebar' },
  { widgetKey: 'outstandingTasks', column: 'sidebar' },
  { widgetKey: 'keyContacts', column: 'sidebar' },
  { widgetKey: 'rostering', column: 'sidebar' },
];
