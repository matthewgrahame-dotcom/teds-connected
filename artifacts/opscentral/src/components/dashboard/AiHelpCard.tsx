import { useState } from 'react';
import { Sparkles, Send, RotateCcw, FileText, GraduationCap, Newspaper, Check, X } from 'lucide-react';
import { Link } from 'wouter';
import { DashboardCard } from './DashboardCard';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type FormFieldInput = { label: string; type: string; required?: boolean; options?: string[] };
type ModuleInput = { title: string; externalUrl?: string };

type CreateFormCall = { name: 'create_form'; input: { title: string; fields: FormFieldInput[] } };
type CreateTrainingCall = {
  name: 'create_training_program';
  input: { title: string; description?: string; startDate?: string; endDate?: string; modules: ModuleInput[] };
};
type UnsplashImage = {
  imageUrl: string;
  thumbUrl: string;
  photographerName: string;
  photographerProfileUrl: string;
  downloadLocationUrl: string;
};
type CreateNewsCall = { name: 'create_news_article'; input: { title: string; snippet: string; body?: string }; image?: UnsplashImage | null };
type ToolCall = CreateFormCall | CreateTrainingCall | CreateNewsCall;

type CreatedResult = { kind: 'form'; slug: string; title: string } | { kind: 'training'; title: string } | { kind: 'news'; id: number; title: string };

export function AiHelpCard() {
  const { session } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [toolCall, setToolCall] = useState<ToolCall | null>(null);
  const [asking, setAsking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedResult | null>(null);

  const ask = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    setToolCall(null);
    setCreated(null);
    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      if (data.toolCall) setToolCall(data.toolCall);
      else setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAsking(false);
    }
  };

  const confirmAction = async () => {
    if (!toolCall) return;
    setConfirming(true);
    setError(null);
    try {
      if (toolCall.name === 'create_form') {
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(toolCall.input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the form');
        setCreated({ kind: 'form', slug: data.form.slug, title: data.form.title });
      } else if (toolCall.name === 'create_training_program') {
        const res = await fetch('/api/training/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(toolCall.input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the training program');
        setCreated({ kind: 'training', title: data.program.title });
      } else {
        // If a photo came with the proposal, fire Unsplash's required
        // download-tracking ping now (the moment it's actually used, not
        // when it was merely shown in the proposal) before creating the
        // article -- courtesy step, so its failure shouldn't block the
        // actual create either.
        if (toolCall.image) {
          try {
            await fetch('/api/ai-help/confirm-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
              body: JSON.stringify({ downloadLocationUrl: toolCall.image.downloadLocationUrl }),
            });
          } catch {
            // non-fatal
          }
        }
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({
            ...toolCall.input,
            imageUrl: toolCall.image?.imageUrl,
            imagePhotographerName: toolCall.image?.photographerName,
            imagePhotographerUrl: toolCall.image?.photographerProfileUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the news article');
        setCreated({ kind: 'news', id: data.article.id, title: data.article.title });
      }
      setToolCall(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setQuestion('');
    setAnswer(null);
    setToolCall(null);
    setCreated(null);
    setError(null);
  };

  return (
    <DashboardCard title="AI Help">
      <p className="mb-3 text-sm text-muted-foreground">
        Ask anything about using Connected, or ask it to draft a new form, training program, or news article.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="e.g. Create a training program for the new EOS R6 launch"
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

      {toolCall && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            {toolCall.name === 'create_form' && <FileText className="h-4 w-4" />}
            {toolCall.name === 'create_training_program' && <GraduationCap className="h-4 w-4" />}
            {toolCall.name === 'create_news_article' && <Newspaper className="h-4 w-4" />}
            Proposed:{' '}
            {toolCall.name === 'create_form' ? 'New Form' : toolCall.name === 'create_training_program' ? 'New Training Program' : 'New News Article'}
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">{toolCall.input.title}</p>

          {toolCall.name === 'create_form' && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {toolCall.input.fields.map((f, i) => (
                <li key={i}>
                  • {f.label} <span className="text-muted-foreground/70">({f.type}{f.required ? ', required' : ''})</span>
                </li>
              ))}
            </ul>
          )}
          {toolCall.name === 'create_training_program' && (
            <>
              {toolCall.input.description && <p className="mt-1 text-xs text-muted-foreground">{toolCall.input.description}</p>}
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {toolCall.input.modules.map((m, i) => (
                  <li key={i}>• {m.title}</li>
                ))}
              </ul>
            </>
          )}
          {toolCall.name === 'create_news_article' && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{toolCall.input.snippet}</p>
              {toolCall.input.body && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground/80">{toolCall.input.body}</p>}
              {toolCall.image ? (
                <div className="mt-2">
                  <img src={toolCall.image.thumbUrl} alt="" className="h-24 w-full rounded-md object-cover" />
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Photo by {toolCall.image.photographerName} on Unsplash
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground/70">No matching photo found — will use the generic placeholder.</p>
              )}
            </>
          )}

          <p className="mt-2 text-xs text-muted-foreground">Nothing's been created yet — this is just a proposal.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmAction}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {confirming ? 'Creating…' : 'Confirm & Create'}
            </button>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Discard
            </button>
          </div>
        </div>
      )}

      {created && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p className="font-semibold text-foreground">
            {created.kind === 'form' ? 'Form created.' : created.kind === 'training' ? 'Training program created.' : 'News article created.'}
          </p>
          {created.kind === 'form' && (
            <Link href={`/people/forms/${created.slug}`} className="text-accent hover:underline">
              View "{created.title}"
            </Link>
          )}
          {created.kind === 'training' && (
            <Link href="/learn/programs" className="text-accent hover:underline">
              View in Learn → Programs
            </Link>
          )}
          {created.kind === 'news' && (
            <Link href={`/news/${created.id}`} className="text-accent hover:underline">
              View "{created.title}"
            </Link>
          )}
          <button type="button" onClick={reset} className="mt-2 block text-xs font-bold text-accent hover:underline">
            Ask another
          </button>
        </div>
      )}
    </DashboardCard>
  );
}
