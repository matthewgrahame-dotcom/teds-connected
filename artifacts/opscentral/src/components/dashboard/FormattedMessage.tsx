import { Fragment } from 'react';

// Renders the small, deliberately-limited formatting syntax produced by
// SocialTimelineCard's toolbar: **bold**, *italic*, __underline__, and
// [text](url) links. Single-pass tokenizer, no nesting, no HTML -- this
// builds React elements directly (never dangerouslySetInnerHTML), so it's
// safe against anything a message might contain, including from Phocal's
// own Ted's Talks compose box (plain text, which just renders unchanged
// here since it contains none of these markers).
const TOKEN_RE = /(\*\*.+?\*\*|__.+?__|\*.+?\*|\[.+?\]\(.+?\))/g;

export function FormattedMessage({ text }: { text: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
          return <u key={i}>{part.slice(2, -2)}</u>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        const linkMatch = /^\[(.+)\]\((.+)\)$/.exec(part);
        if (linkMatch) {
          return (
            <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="underline hover:text-accent">
              {linkMatch[1]}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
