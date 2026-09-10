import { RotateCcw } from 'lucide-react';

/**
 * Matches the "No events yet" / "No tasks" empty state pattern: a short bold
 * heading, a large gray circular-arrow icon, then a muted supporting line.
 */
export function EmptyState({ heading, copy }: { heading: string; copy: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">
      <p className="text-[15px] text-foreground/80">{heading}</p>
      <RotateCcw className="h-14 w-14 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="max-w-[220px] text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
