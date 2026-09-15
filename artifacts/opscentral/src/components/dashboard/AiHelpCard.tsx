import { useEffect, useState } from 'react';
import { Sparkles, Send, RotateCcw, FileText, GraduationCap, Newspaper, CalendarPlus, Check, X, Settings } from 'lucide-react';
import { Link } from 'wouter';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { AiHelpTemplatesDialog } from './AiHelpTemplatesDialog';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type FormFieldInput = { label: string; type: string; required?: boolean; options?: string[]; section?: string };
type ModuleInput = { title: string; externalUrl?: string };

type CreateFormCall = {
  name: 'create_form';
  input: {
    title: string;
    instructions?: string;
    categoryNames?: string[];
    fields: FormFieldInput[];
    isPublic?: boolean;
    groupedFields?: boolean;
    showThankYouMessage?: boolean;
    thankYouMessage?: string;
  };
};
type UpdateFormCall = {
  name: 'update_form';
  input: {
    formId: number;
    title: string;
    newTitle?: string;
    newInstructions?: string;
    newCategoryNames?: string[];
    newIsPublic?: boolean;
    newGroupedFields?: boolean;
    newShowThankYouMessage?: boolean;
    newThankYouMessage?: string;
    newStatus?: 'draft' | 'live';
  };
};
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
type UpdateNewsCall = {
  name: 'update_news_article';
  input: { articleId: number; title: string; addImage?: boolean; newTitle?: string; newSnippet?: string; newBody?: string };
  image?: UnsplashImage | null;
};
type CreateCalendarEventCall = {
  name: 'create_calendar_event';
  input: { title: string; date: string; time?: string; location?: string; requiresRsvp?: boolean };
};
type ToolCall = CreateFormCall | UpdateFormCall | CreateTrainingCall | CreateNewsCall | UpdateNewsCall | CreateCalendarEventCall;

type CreatedResult =
  | { kind: 'form'; id: number; slug: string; title: string }
  | { kind: 'form-updated'; id: number; title: string }
  | { kind: 'training'; title: string }
  | { kind: 'news'; id: number; title: string }
  | { kind: 'news-updated'; id: number; title: string }
  | { kind: 'calendar-event'; title: string };

type ChatTurn = { role: 'user' | 'assistant'; content: string };
type Template = { id: number; label: string; prompt: string };

// Turns the plain prose the model was told to write (never HTML/markdown --
// see the tool description) into simple paragraph HTML matching what the
// rich text editor itself produces, so instructions written by AI Help
// display identically to ones written by hand in the Forms editor.
function wrapAsHtml(plainText: string): string {
  return plainText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join('');
}

// The model names categories by their existing name (it's told not to
// invent new ones), but the actual API works in ids -- resolves the names
// it proposed against the real category list right before the request
// that needs them, rather than trusting a stale list from earlier in the
// conversation.
async function resolveCategoryIds(names: string[] | undefined, session: ReturnType<typeof useAuth>['session']): Promise<number[]> {
  if (!names || names.length === 0) return [];
  const res = await fetch('/api/forms/categories', { headers: authHeaders(session) });
  if (!res.ok) return [];
  const categories: { id: number; name: string }[] = await res.json();
  const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  return names.map((n) => byName.get(n.toLowerCase())).filter((id): id is number => typeof id === 'number');
}

export function AiHelpCard() {
  const { session } = useAuth();
  const canManageTemplates = session?.level === 'full';
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [toolCall, setToolCall] = useState<ToolCall | null>(null);
  const [asking, setAsking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  const loadTemplates = () => {
    fetch('/api/ai-help/templates', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => setTemplates([]));
  };

  useEffect(loadTemplates, []);

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setError(null);
    setToolCall(null);
    setCreated(null);
    setQuestion('');
    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ question: q, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      if (data.toolCall) {
        setToolCall(data.toolCall);
        setMessages([]); // a proposal is a self-contained action, not something to keep chatting about
      } else {
        setMessages((prev) => [...prev, { role: 'user', content: q }, { role: 'assistant', content: data.answer }]);
      }
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
        const categoryIds = await resolveCategoryIds(toolCall.input.categoryNames, session);
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify({
            title: toolCall.input.title,
            instructions: toolCall.input.instructions ? wrapAsHtml(toolCall.input.instructions) : undefined,
            categoryIds,
            fields: toolCall.input.fields,
            status: 'draft',
            isPublic: toolCall.input.isPublic ?? false,
            groupedFields: toolCall.input.groupedFields ?? false,
            showThankYouMessage: toolCall.input.showThankYouMessage ?? false,
            thankYouMessage: toolCall.input.thankYouMessage,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the form');
        setCreated({ kind: 'form', id: data.form.id, slug: data.form.slug, title: data.form.title });
      } else if (toolCall.name === 'update_form') {
        const patch: Record<string, unknown> = {};
        if (toolCall.input.newTitle) patch.title = toolCall.input.newTitle;
        if (toolCall.input.newInstructions !== undefined) patch.instructions = wrapAsHtml(toolCall.input.newInstructions);
        if (toolCall.input.newCategoryNames) patch.categoryIds = await resolveCategoryIds(toolCall.input.newCategoryNames, session);
        if (toolCall.input.newIsPublic !== undefined) patch.isPublic = toolCall.input.newIsPublic;
        if (toolCall.input.newGroupedFields !== undefined) patch.groupedFields = toolCall.input.newGroupedFields;
        if (toolCall.input.newShowThankYouMessage !== undefined) patch.showThankYouMessage = toolCall.input.newShowThankYouMessage;
        if (toolCall.input.newThankYouMessage !== undefined) patch.thankYouMessage = toolCall.input.newThankYouMessage;
        if (toolCall.input.newStatus) patch.status = toolCall.input.newStatus;

        const res = await fetch(`/api/forms/${toolCall.input.formId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not update the form');
        setCreated({ kind: 'form-updated', id: data.form.id, title: data.form.title });
      } else if (toolCall.name === 'create_training_program') {
        const res = await fetch('/api/training/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(toolCall.input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the training program');
        setCreated({ kind: 'training', title: data.program.title });
      } else if (toolCall.name === 'create_calendar_event') {
        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(toolCall.input),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create the event');
        setCreated({ kind: 'calendar-event', title: data.event.title });
      } else if (toolCall.name === 'create_news_article') {
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
      } else {
        // update_news_article
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
        const patch: Record<string, unknown> = {};
        if (toolCall.input.newTitle) patch.title = toolCall.input.newTitle;
        if (toolCall.input.newSnippet) patch.snippet = toolCall.input.newSnippet;
        if (toolCall.input.newBody) patch.body = toolCall.input.newBody;
        if (toolCall.image) {
          patch.imageUrl = toolCall.image.imageUrl;
          patch.imagePhotographerName = toolCall.image.photographerName;
          patch.imagePhotographerUrl = toolCall.image.photographerProfileUrl;
        }
        const res = await fetch(`/api/news/${toolCall.input.articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not update the news article');
        setCreated({ kind: 'news-updated', id: data.article.id, title: data.article.title });
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
    setMessages([]);
    setToolCall(null);
    setCreated(null);
    setError(null);
  };

  const useTemplate = (template: Template) => {
    setQuestion(template.prompt);
  };

  return (
    <DashboardCard
      title="AI Help"
      actions={canManageTemplates ? <CardIconButton icon={Settings} label="Manage AI Help quick actions" onClick={() => setTemplatesDialogOpen(true)} /> : <></>}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Ask anything about using Connected, or ask it to draft a new form, training program, calendar event, or news article.
      </p>

      {!!templates?.length && !toolCall && !created && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => useTemplate(t)}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <span
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-sm ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/90'
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder={messages.length > 0 ? 'Reply…' : 'e.g. Create a training program for the new EOS R6 launch'}
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
      {messages.length > 0 && !asking && (
        <button type="button" onClick={reset} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
          <RotateCcw className="h-3 w-3" /> Start over
        </button>
      )}

      {asking && <p className="mt-3 text-sm text-muted-foreground">Thinking…</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {toolCall && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            {(toolCall.name === 'create_form' || toolCall.name === 'update_form') && <FileText className="h-4 w-4" />}
            {toolCall.name === 'create_training_program' && <GraduationCap className="h-4 w-4" />}
            {(toolCall.name === 'create_news_article' || toolCall.name === 'update_news_article') && <Newspaper className="h-4 w-4" />}
            {toolCall.name === 'create_calendar_event' && <CalendarPlus className="h-4 w-4" />}
            Proposed:{' '}
            {toolCall.name === 'create_form'
              ? 'New Form'
              : toolCall.name === 'update_form'
                ? 'Update to Form'
                : toolCall.name === 'create_training_program'
                  ? 'New Training Program'
                  : toolCall.name === 'create_news_article'
                    ? 'New News Article'
                    : toolCall.name === 'create_calendar_event'
                      ? 'New Calendar Event'
                      : 'Update to News Article'}
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {toolCall.name === 'update_news_article' || toolCall.name === 'update_form' ? (toolCall.input as any).newTitle || toolCall.input.title : toolCall.input.title}
          </p>

          {toolCall.name === 'create_form' && (
            <>
              {toolCall.input.categoryNames?.length && <p className="mt-1 text-xs text-muted-foreground">Category: {toolCall.input.categoryNames.join(', ')}</p>}
              {toolCall.input.instructions && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground/80">{toolCall.input.instructions}</p>}
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {toolCall.input.fields.map((f, i) => (
                  <li key={i}>
                    • {f.label} <span className="text-muted-foreground/70">({f.type}{f.required ? ', required' : ''})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground/70">Saved as a draft — publish it from the Forms editor when it's ready.</p>
            </>
          )}
          {toolCall.name === 'update_form' && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {toolCall.input.newCategoryNames && <li>• New category: {toolCall.input.newCategoryNames.join(', ') || '(none)'}</li>}
              {toolCall.input.newInstructions !== undefined && <li className="line-clamp-3">• New instructions: {toolCall.input.newInstructions}</li>}
              {toolCall.input.newIsPublic !== undefined && <li>• {toolCall.input.newIsPublic ? 'Now public (no login required)' : 'Now requires login'}</li>}
              {toolCall.input.newShowThankYouMessage !== undefined && <li>• {toolCall.input.newShowThankYouMessage ? `Custom thank-you message: ${toolCall.input.newThankYouMessage ?? ''}` : 'Thank-you message turned off'}</li>}
              {toolCall.input.newStatus && <li>• Status: {toolCall.input.newStatus}</li>}
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
          {toolCall.name === 'create_calendar_event' && (
            <p className="mt-1 text-xs text-muted-foreground">
              {toolCall.input.date}
              {toolCall.input.time ? ` · ${toolCall.input.time}` : ''}
              {toolCall.input.location ? ` · ${toolCall.input.location}` : ''}
              {toolCall.input.requiresRsvp ? ' · RSVP required' : ''}
            </p>
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
          {toolCall.name === 'update_news_article' && (
            <>
              {toolCall.input.newSnippet && <p className="mt-1 text-xs text-muted-foreground">New snippet: {toolCall.input.newSnippet}</p>}
              {toolCall.input.newBody && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground/80">New body: {toolCall.input.newBody}</p>}
              {toolCall.input.addImage &&
                (toolCall.image ? (
                  <div className="mt-2">
                    <img src={toolCall.image.thumbUrl} alt="" className="h-24 w-full rounded-md object-cover" />
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      Photo by {toolCall.image.photographerName} on Unsplash
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground/70">No matching photo found.</p>
                ))}
            </>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {toolCall.name === 'update_news_article' || toolCall.name === 'update_form' ? "Nothing's been changed yet" : "Nothing's been created yet"} — this is just a proposal.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmAction}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />{' '}
              {confirming
                ? toolCall.name === 'update_news_article' || toolCall.name === 'update_form'
                  ? 'Updating…'
                  : 'Creating…'
                : toolCall.name === 'update_news_article' || toolCall.name === 'update_form'
                  ? 'Confirm & Update'
                  : 'Confirm & Create'}
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
            {created.kind === 'form'
              ? 'Form created (as a draft).'
              : created.kind === 'form-updated'
                ? 'Form updated.'
                : created.kind === 'training'
                  ? 'Training program created.'
                  : created.kind === 'news'
                    ? 'News article created.'
                    : created.kind === 'calendar-event'
                      ? 'Calendar event created.'
                      : 'News article updated.'}
          </p>
          {created.kind === 'form' && (
            <Link href={`/admin/forms/${created.id}`} className="text-accent hover:underline">
              View "{created.title}" in the Forms editor
            </Link>
          )}
          {created.kind === 'form-updated' && (
            <Link href={`/admin/forms/${created.id}`} className="text-accent hover:underline">
              View "{created.title}" in the Forms editor
            </Link>
          )}
          {created.kind === 'training' && (
            <Link href="/learn/programs" className="text-accent hover:underline">
              View in Learn → Programs
            </Link>
          )}
          {created.kind === 'calendar-event' && <span className="text-muted-foreground">"{created.title}" is on Teds Calendar.</span>}
          {(created.kind === 'news' || created.kind === 'news-updated') && (
            <Link href={`/news/${created.id}`} className="text-accent hover:underline">
              View "{created.title}"
            </Link>
          )}
          <button type="button" onClick={reset} className="mt-2 block text-xs font-bold text-accent hover:underline">
            Ask another
          </button>
        </div>
      )}

      <AiHelpTemplatesDialog open={templatesDialogOpen} onClose={() => setTemplatesDialogOpen(false)} onChanged={loadTemplates} />
    </DashboardCard>
  );
}
