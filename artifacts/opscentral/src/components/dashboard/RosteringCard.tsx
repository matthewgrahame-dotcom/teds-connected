import { ExternalLink } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useToast } from '@/hooks/use-toast';

// EmpLive is Ted's actual rostering system -- previously this button
// said "Connect To Deputy" and had no onClick/href at all, so it never
// did anything regardless of which system it named. ADP's link is real
// and provided directly; EmpLive's isn't known yet, so it says so
// honestly via a toast rather than silently doing nothing on click,
// which is exactly the "looks like a button, does nothing" trap this
// is replacing.
const ADP_URL =
  'https://my.adppayroll.com.au/siteminderagent/forms/adplogin.fcc?TYPE=33554433&REALMOID=06-00094367-e6b6-1c0a-ab4c-8b470bbc0000&GUID=&SMAUTHREASON=0&METHOD=GET&SMAGENTNAME=IrUHdTfEHiNhFdp3nikIicOhDPEmk5mOsptT83IfbK0OHHL43I5PQBqbSr3QSKkV&TARGET=-SM-HTTPS%3a%2f%2fmy%2eadppayroll%2ecom%2eau%2fmfa%2fmfalogin%2ephp%3fTYPE%3d33554432%26REALMOID%3d06--0000b210--efd4--17c4--a0bf--c2460a64d05d%26GUID%3d%26SMAUTHREASON%3d0%26METHOD%3dGET%26SMAGENTNAME%3dIrUHdTfEHiNhFdp3nikIicOhDPEmk5mOsptT83IfbK0OHHL43I5PQBqbSr3QSKkV%26TARGET%3d--SM--https-%3a-%2f-%2fmy-%2eadppayroll-%2ecom-%2eau-%2f';

export function RosteringCard() {
  const { toast } = useToast();

  return (
    <DashboardCard title="Rostering & Payroll" actions={<span />}>
      <div className="flex flex-wrap justify-center gap-3 py-2">
        <button
          type="button"
          data-testid="button-connect-emplive"
          onClick={() => toast({ title: 'EmpLive link coming soon', description: "This button isn't linked yet -- check back once it's set up." })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
        >
          EmpLive
        </button>
        <a
          href={ADP_URL}
          target="_blank"
          rel="noreferrer"
          data-testid="button-connect-adp"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-95"
        >
          ADP <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </DashboardCard>
  );
}
