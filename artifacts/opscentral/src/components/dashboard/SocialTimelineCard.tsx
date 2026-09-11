import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Send,
  Search,
  User,
  ExternalLink,
  X,
} from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { useAuth } from '@/lib/auth';
import { usePublishAccess } from '@/lib/publishAccess';
import { FormattedMessage } from './FormattedMessage';

const PHOCAL_BASE_URL = 'https://seo-optimiser.vercel.app'; // TODO: update once the Vercel project rename discussion lands

// This is the SAME feed as Phocal's "Ted's Talks" -- reads/writes go through
// Connected's own /api/social-timeline, which proxies to Phocal's storage,
// rather than keeping a separate copy. See artifacts/api-server/src/routes/social-timeline.ts.
type PhocalMessage = {
  id: string;
  fromLocation: string;
  toLocation: string | null;
  messageText: string;
  isAnnouncement: boolean;
  postedAt: string;
};

// Wraps (or unwraps, if already wrapped) the current textarea selection with
// a marker pair -- the same lightweight **bold** / *italic* / __underline__
// syntax FormattedMessage knows how to render, kept deliberately simple
// (single-pass, no nesting) since this is a team chat box, not a full editor.
function toggleWrap(el: HTMLTextAreaElement, marker: string, setValue: (v: string) => void) {
  const { selectionStart, selectionEnd, value } = el;
  const selected = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const alreadyWrapped = selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;
  const next = alreadyWrapped
    ? selected.slice(marker.length, selected.length - marker.length)
    : `${marker}${selected || 'text'}${marker}`;
  const updated = `${before}${next}${after}`;
  setValue(updated);
  requestAnimationFrame(() => {
    el.focus();
    const cursor = alreadyWrapped ? before.length + next.length : before.length + marker.length;
    const cursorEnd = alreadyWrapped ? cursor : cursor + (selected || 'text').length;
    el.setSelectionRange(cursor, cursorEnd);
  });
}

export function SocialTimelineCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [draft, setDraft] = useState('');
  const [location, setLocation] = useState(session?.store ?? '');
  const [messages, setMessages] = useState<PhocalMessage[] | null>(null);
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcementsOnly, setAnnouncementsOnly] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Same rule as Phocal's own Ted's Talks page (canPostAnnouncements): only
  // full-level staff can delete. No staffSession at all isn't possible here
  // (Connected requires login), unlike Phocal where that also means "Matt
  // himself, outside the staff-login layer".
  const canDelete = session?.level === 'full';

  const loadMessages = async () => {
    try {
      const resp = await fetch('/api/social-timeline');
      const data = await resp.json();
      setMessages(data.chatMessages ?? []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const visibleMessages = useMemo(() => {
    if (!messages) return [];
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (announcementsOnly && !m.isAnnouncement) return false;
      if (!q) return true;
      return `${m.fromLocation} ${m.messageText}`.toLowerCase().includes(q);
    });
  }, [messages, search, announcementsOnly]);

  const handlePost = async () => {
    if (!draft.trim() || !location.trim() || posting) return;
    setPosting(true);
    try {
      await fetch('/api/social-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromLocation: location.trim(), toLocation: null, messageText: draft.trim(), isAnnouncement: false }),
      });
      setDraft('');
      await loadMessages();
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this message?')) return;
    requirePublishAccess(async () => {
      await fetch(`/api/social-timeline/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadMessages();
    });
  };

  const applyFormat = (marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    toggleWrap(el, marker, setDraft);
  };

  const applyLink = () => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || 'link text';
    const url = window.prompt('Link URL:', 'https://');
    if (!url) return;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    setDraft(`${before}[${selected}](${url})${after}`);
    requestAnimationFrame(() => el.focus());
  };

  return (
    <DashboardCard
      title="Ted's Talks"
      actions={
        <>
          <CardIconButton icon={Search} label="Search posts" tone="primary" onClick={() => setSearchOpen((v) => !v)} />
          <button
            type="button"
            aria-label="Announcements only"
            aria-pressed={announcementsOnly}
            onClick={() => setAnnouncementsOnly((v) => !v)}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md transition ${
              announcementsOnly ? 'bg-foreground text-primary' : 'bg-primary text-primary-foreground hover:brightness-95'
            }`}
            title="Show announcements only"
          >
            📣
          </button>
          <a
            href={`${PHOCAL_BASE_URL}/?page=tedstalks${session?.crossAppToken ? `&ssoToken=${encodeURIComponent(session.crossAppToken)}` : ''}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in Phocal"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition hover:brightness-95"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </>
      }
    >
      {searchOpen && (
        <div className="mb-3">
          <input
            data-testid="input-social-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            autoFocus
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
        </div>
      )}
      {!location && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Posting as:</span>
          <input
            data-testid="input-social-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Your store/location"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      )}
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <User className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 rounded-lg border border-border">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            <button type="button" aria-label="Bold" onClick={() => applyFormat('**')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Italic" onClick={() => applyFormat('*')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Underline" onClick={() => applyFormat('__')} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Link" onClick={applyLink} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            data-testid="input-social-post"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write something here…"
            rows={2}
            className="w-full resize-none px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            data-testid="button-post-social"
            aria-label="Post"
            onClick={handlePost}
            disabled={posting}
            className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {messages === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {messages !== null && visibleMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">{messages.length === 0 ? 'No messages yet.' : 'No posts match your search.'}</p>
        )}
        {visibleMessages.map((post) => (
          <div key={post.id} data-testid={`post-${post.id}`} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">
                    {post.fromLocation}
                    {post.isAnnouncement ? ' 📣' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(post.postedAt).toLocaleString('en-AU')}</p>
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  data-testid={`button-delete-post-${post.id}`}
                  aria-label="Remove post"
                  onClick={() => handleDelete(post.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              <FormattedMessage text={post.messageText} />
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

