import { useParams, Link } from 'wouter';
import { ChevronLeft, FileText } from 'lucide-react';
import { workCategories, type PolicyDoc } from '@/data/workCategories';

function groupBySection(docs: PolicyDoc[]) {
  const groups: { section: string | undefined; docs: PolicyDoc[] }[] = [];
  for (const doc of docs) {
    const last = groups[groups.length - 1];
    if (last && last.section === doc.section) {
      last.docs.push(doc);
    } else {
      groups.push({ section: doc.section, docs: [doc] });
    }
  }
  return groups;
}

export default function WorkCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? workCategories[slug] : undefined;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/work" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Work
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">{category?.title ?? 'Not set up yet'}</h1>

        {!category && <p className="text-sm text-muted-foreground">This category doesn't have any content yet.</p>}

        {category &&
          groupBySection(category.docs).map((group, groupIndex) => (
            <div key={group.section ?? `group-${groupIndex}`}>
              {group.section && <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{group.section}</h2>}
              <div className="divide-y divide-border rounded-xl border border-card-border bg-card shell-shadow">
                {group.docs.map((doc) => {
                  const content = (
                    <span className="flex items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{doc.title}</span>
                        {doc.version && <span className="block text-xs text-muted-foreground">{doc.version}</span>}
                      </span>
                    </span>
                  );
                  return (
                    <div key={doc.title} className="px-5 py-4" data-testid={`policy-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                      {doc.href ? (
                        <a href={doc.href} target="_blank" rel="noreferrer" className="transition hover:opacity-70">
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                      {doc.note && <p className="mt-2 text-sm leading-6 text-muted-foreground">{doc.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
