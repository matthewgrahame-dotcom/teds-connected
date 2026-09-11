import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Send,
  Paperclip,
  Search,
  Filter,
  User,
  ExternalLink,
} from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { useAuth } from '@/lib/auth';

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

const toolbarButtons = [Bold, Italic, Underline, LinkIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo2, Redo2];

export function SocialTimelineCard() {
  const { session } = useAuth();
  const [draft, setDraft] = useState('');
  const [location, setLocation] = useState(session?.store ?? '');
  const [messages, setMessages] = useState<PhocalMessage[] | null>(null);
  const [posting, setPosting] = useState(false);

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

  return (
    <DashboardCard
      title="Ted's Talks"
      actions={
        <>
          <CardIconButton icon={Search} label="Search posts" tone="primary" />
          <CardIconButton icon={Filter} label="Filter posts" tone="primary" />
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
            {toolbarButtons.map((Icon, index) => (
              <button
                key={index}
                type="button"
                aria-label="Formatting option"
                className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <textarea
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
          <button
            type="button"
            aria-label="Attach file"
            className="grid h-11 w-11 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {messages === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {messages?.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {messages?.map((post) => (
          <div key={post.id} data-testid={`post-${post.id}`} className="rounded-lg border border-border p-4">
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
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{post.messageText}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
