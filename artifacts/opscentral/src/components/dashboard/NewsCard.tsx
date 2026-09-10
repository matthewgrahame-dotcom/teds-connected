import { DashboardCard } from './DashboardCard';

type NewsItem = {
  id: number;
  title: string;
  snippet: string;
  tagColor: string;
};

// TODO: replace with real announcements data once the Announcements module exists.
const newsItems: NewsItem[] = [
  {
    id: 1,
    title: 'New TRS Portal Now Live',
    snippet: "The Repair Service (TRS) Portal has launched. Head to the Work section to see what's changed.",
    tagColor: 'bg-destructive',
  },
];

export function NewsCard() {
  return (
    <DashboardCard title="News" noPadding>
      <div className="divide-y divide-border">
        {newsItems.map((item) => (
          <div key={item.id} data-testid={`news-item-${item.id}`} className="flex gap-4 px-5 py-4">
            <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${item.tagColor}`} />
            <div className="min-w-0">
              <h3 className="font-extrabold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.snippet}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
