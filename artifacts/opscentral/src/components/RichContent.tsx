import { Fragment, type ReactNode } from 'react';

// The one shared formatting syntax used everywhere in the app that needs
// more than plain text -- News articles, Training module content, and
// Ted's Talks messages (see SocialTimelineCard.tsx) all render through
// this same parser, so the same buttons/typed syntax work identically
// no matter where you're writing.
const INLINE_RE = /(\*\*.+?\*\*|__.+?__|\*.+?\*|\[.+?\]\(.+?\))/g;

function renderInline(text: string) {
  return text.split(INLINE_RE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) return <u key={i}>{part.slice(2, -2)}</u>;
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const linkMatch = /^\[(.+)\]\((.+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="underline hover:text-accent">
          {linkMatch[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// Renders training module content (lesson text, quiz questions) with real
// visual hierarchy from a small set of line-level conventions:
//   ## Heading           -> a bold section heading
//   - item / * item      -> a bullet list item
//   1. item               -> a numbered list item
//   blank line            -> paragraph break
//   (blank otherwise)     -> a regular paragraph, with **bold**/*italic*/__underline__ inline
// Deliberately simple (no nested lists, no tables) -- this is for reading
// imported lesson/quiz text clearly, not a general rich-text editor.
export function RichContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!listBuffer) return;
    const Tag = listBuffer.type;
    blocks.push(
      <Tag key={key} className={Tag === 'ul' ? 'list-disc space-y-1 pl-5' : 'list-decimal space-y-1 pl-5'}>
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>,
    );
    listBuffer = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const key = `b-${idx}`;

    if (!line) {
      flushList(key);
      return;
    }

    if (line.startsWith('## ')) {
      flushList(key);
      blocks.push(
        <h3 key={key} className="mt-4 text-sm font-extrabold text-foreground first:mt-0">
          {renderInline(line.slice(3))}
        </h3>,
      );
      return;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList(key);
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(bulletMatch[1]);
      return;
    }

    const numberedMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (numberedMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList(key);
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(numberedMatch[1]);
      return;
    }

    flushList(key);
    blocks.push(
      <p key={key} className="leading-6">
        {renderInline(line)}
      </p>,
    );
  });
  flushList('final');

  return <div className="space-y-2 text-sm text-foreground/90">{blocks}</div>;
}
