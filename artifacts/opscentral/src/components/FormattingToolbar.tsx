import { RefObject } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Heading } from 'lucide-react';

// Operates on a plain textarea ref -- wraps the current selection for
// inline styles (bold/italic/underline/link), or prefixes the current line
// for block-level ones (heading/bullet/numbered). Shared by anywhere in the
// app that writes content read through RichContent.tsx (News body, Ted's
// Talks messages) so the same buttons produce the same result everywhere.
export function FormattingToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'text';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const applyLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const url = window.prompt('Link URL:', 'https://');
    if (!url) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const label = value.slice(start, end) || 'link text';
    const next = value.slice(0, start) + `[${label}](${url})` + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => el.focus());
  };

  return (
    <div className="flex items-center gap-0.5 rounded-t-md border border-b-0 border-input bg-muted/40 px-1.5 py-1">
      <button type="button" aria-label="Bold" onClick={() => wrapSelection('**')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Italic" onClick={() => wrapSelection('*')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Underline" onClick={() => wrapSelection('__')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Link" onClick={applyLink} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button type="button" aria-label="Heading" onClick={() => prefixLine('## ')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <Heading className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Bullet list" onClick={() => prefixLine('- ')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Numbered list" onClick={() => prefixLine('1. ')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
