import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { ExternalLink } from 'lucide-react';

type NewsItem = {
  id: number;
  title: string;
  snippet: string;
  tagColor: string;
};

export function NewsCard() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data: NewsItem[]) => setItems(data.slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  return (
    <DashboardCard
      title="News"
      noPadding
      actions={
        <Link href="/news" data-testid="link-news-view-all">
          <CardIconButton icon={ExternalLink} label="View all news" tone="primary" />
        </Link>
      }
    >
      {items === null && <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>}
      {items?.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No news yet.</p>}
      <div className="divide-y divide-border">
        {items?.map((item) => (
          <Link key={item.id} href={`/news/${item.id}`} data-testid={`news-item-${item.id}`} className="flex gap-4 px-5 py-4 transition hover:bg-muted/50">
            <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${item.tagColor}`} />
            <div className="min-w-0">
              <h3 className="font-extrabold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.snippet}</p>
            </div>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
