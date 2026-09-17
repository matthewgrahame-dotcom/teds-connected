export type NewsCategory = {
  label: string;
  value: string; // tagColor value stored on the article, reused as the Tailwind class for the dot/bar
};

// Canonical set of news categories. The `value` doubles as the tagColor class
// already used for the coloured bar in the News list/card, so no schema change
// is needed -- we're just giving the existing colour picker real meaning.
export const NEWS_CATEGORIES: NewsCategory[] = [
  { label: 'Products/Manufacturer News', value: 'bg-accent' },
  { label: 'Sales Results', value: 'bg-emerald-500' },
  { label: 'Announcements', value: 'bg-destructive' },
];

export function categoryLabelFor(tagColor: string): string {
  return NEWS_CATEGORIES.find((c) => c.value === tagColor)?.label ?? 'Other';
}
