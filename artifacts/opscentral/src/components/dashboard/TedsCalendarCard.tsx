import { useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { Clock, ExternalLink, MapPin } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { Calendar } from '@/components/ui/calendar';

type CalendarEvent = {
  id: string;
  date: string; // 'yyyy-MM-dd', local date -- see toDateKey below for why not an ISO/UTC string
  title: string;
  time?: string;
  location?: string;
};

/** 'yyyy-MM-dd' from LOCAL date parts, not Date#toISOString(). toISOString
 * converts to UTC first, which silently shifts the date for anyone east of
 * UTC (all of Australia) -- e.g. a local midnight in Melbourne becomes the
 * previous day once converted to UTC, so a day's events would look like
 * they belong to the day before. date-fns' format() uses local time, so
 * this stays correct in AEST/AEDT (and everywhere else). */
function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// TODO: replace with a real events source once a Calendar/Events module +
// API exists (see lib/db, lib/api-spec -- no such table/endpoint yet).
// Seeded relative to "today" so the widget always has something real to
// show and interact with in the meantime, same posture as News/KeyContacts'
// placeholder data elsewhere in this dashboard.
function buildSampleEvents(): CalendarEvent[] {
  const today = new Date();
  const relativeDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return toDateKey(d);
  };
  return [
    { id: '1', date: relativeDate(0), title: 'Store Managers Weekly Call', time: '9:00 AM', location: 'Teams' },
    { id: '2', date: relativeDate(0), title: 'New Stock Delivery', time: '1:00 PM', location: 'Teds Melbourne' },
    { id: '3', date: relativeDate(2), title: 'Q3 Sales Review', time: '11:00 AM', location: 'Head Office' },
    { id: '4', date: relativeDate(5), title: 'Camera Hire Fleet Stocktake', time: 'All day', location: 'All stores' },
    { id: '5', date: relativeDate(9), title: 'Public Holiday — Stores Closed Early' },
    { id: '6', date: relativeDate(14), title: 'National Product Meeting', time: '10:00 AM', location: 'Head Office' },
  ];
}

export function TedsCalendarCard() {
  const events = useMemo(buildSampleEvents, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedEvents = eventsByDate.get(toDateKey(selectedDate)) ?? [];

  return (
    <DashboardCard title="Teds Calendar" actions={<CardIconButton icon={ExternalLink} label="Open calendar" tone="primary" />}>
      <Calendar
        mode="single"
        required
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ hasEvent: (date) => eventsByDate.has(toDateKey(date)) }}
        // Small dot under any day that has an event, without touching the
        // shared ui/calendar.tsx primitive (also used elsewhere, e.g. the
        // mockup sandbox) -- react-day-picker applies this className to the
        // day cell itself, which the shared component already marks
        // `relative`, so an absolutely-positioned pseudo-element dot lines
        // up under the day number correctly.
        modifiersClassNames={{
          hasEvent: "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-['']",
        }}
        classNames={{ root: 'w-full' }}
        className="mx-auto"
        data-testid="calendar-teds"
      />

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, d MMMM')}
        </p>

        {selectedEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="text-no-events-selected-day">
            No events on this day.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {selectedEvents.map((event) => (
              <div key={event.id} data-testid={`event-${event.id}`} className="py-3 first:pt-2">
                <p className="font-extrabold text-foreground">{event.title}</p>
                {(event.time || event.location) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {event.time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {event.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
