import { User } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

export type KeyContact = {
  name: string;
  role: string;
  photoUrl?: string;
};

// Seeded with the contacts visible on the current live site. Swap for a real
// data source (API/DB table) once the People module is wired up.
const contacts: KeyContact[] = [
  { name: 'Alex Meara', role: 'General Manager at Head Office' },
  { name: 'Rory Moore', role: 'Chief Operating Officer at Head Office' },
  { name: 'Jason Hocking', role: 'Head of Retail Sales & Consumer Growth at Head Office' },
  { name: 'Mark Allister', role: 'National Product Manager at Head Office' },
];

export function KeyContactsCard() {
  return (
    <DashboardCard title="Key Contacts" noPadding>
      <div className="divide-y divide-border">
        {contacts.map((contact) => (
          <div key={contact.name} data-testid={`contact-${contact.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
              {contact.photoUrl ? (
                <img src={contact.photoUrl} alt={contact.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-extrabold text-foreground">{contact.name}</p>
              <p className="truncate text-sm text-muted-foreground">{contact.role}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
