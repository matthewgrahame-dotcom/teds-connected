import { useEffect, useState } from 'react';
import { User, Mail, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type DirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  locations: string[];
  email: string;
};

export default function MyProfilePage() {
  const { session } = useAuth();
  const [match, setMatch] = useState<DirectoryUser | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!session) return;
    fetch('/api/users?status=active', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((users: DirectoryUser[]) => {
        const found = users.find((u) => `${u.firstName} ${u.lastName}`.toLowerCase() === session.name.toLowerCase());
        setMatch(found ?? null);
      })
      .catch(() => setMatch(null));
  }, [session]);

  if (!session) return null;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-6 shell-shadow">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <User className="h-7 w-7" />
            </span>
            <div>
              <p className="text-lg font-extrabold text-foreground">{session.name}</p>
              <p className="text-sm text-muted-foreground">{match?.role ?? session.level}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Access level: <span className="font-semibold capitalize">{session.level}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Store/location: <span className="font-semibold">{match?.locations.join(', ') || session.store || '—'}</span>
            </div>
            {match?.email && (
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${match.email}`} className="font-semibold hover:text-accent">{match.email}</a>
              </div>
            )}
          </div>

          <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            This shows what's on your login record. Full HR details (address, phone, emergency contact, etc.) are managed under Admin → User Management by full-level staff.
          </p>
        </div>
      </div>
    </div>
  );
}
