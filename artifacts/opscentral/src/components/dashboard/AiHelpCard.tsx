import { useState } from 'react';
import { Sparkles, Send, RotateCcw } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

export function AiHelpCard() {
  const { session } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAsking(false);
    }
  };

  const reset = () => {
    setQuestion('');
    setAnswer(null);
    setError(null);
  };

  return (
    <DashboardCard title="AI Help">
      <p className="mb-3 text-sm text-muted-foreground">Ask anything about using Connected, or where to find something.</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="e.g. Where do I submit an incident report?"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          aria-label="Ask"
          onClick={ask}
          disabled={asking || !question.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {asking && <p className="mt-3 text-sm text-muted-foreground">Thinking…</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {answer && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{answer}</p>
          <button type="button" onClick={reset} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
            <RotateCcw className="h-3 w-3" /> Ask another
          </button>
        </div>
      )}
    </DashboardCard>
  );
}
