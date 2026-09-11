import { Link } from 'wouter';
import { ChevronLeft, FileText } from 'lucide-react';

type PolicyDoc = {
  title: string;
  version: string;
  href: string;
};

// TODO: this is a real document (the actual Code of Conduct PDF), but the
// underlying platform has a proper "Policies" feature with per-role
// accessibility rules (Accessible / Required Reading / Notify Users, per
// the policy_permissions export) -- that permission engine isn't built
// here yet. This page is just a plain document list for now.
const docs: PolicyDoc[] = [{ title: "Code of Conduct Ted's Cameras", version: 'Version 1', href: '/documents/code-of-conduct.pdf' }];

export default function WelcomeToTedsPage() {
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/work" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Work
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">Welcome to Ted's</h1>
        <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
          {docs.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              data-testid={`link-policy-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{doc.title}</span>
                  <span className="block text-xs text-muted-foreground">{doc.version}</span>
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
