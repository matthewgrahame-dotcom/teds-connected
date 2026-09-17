import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Search, User, ExternalLink, X, Flag, Check } from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';
import { usePublishAccess } from '@/lib/publishAccess';
import { RichContent } from '@/components/RichContent';
import { FormattingToolbar } from '@/components/FormattingToolbar';

const PHOCAL_BASE_URL = 'https://seo-optimiser.vercel.app'; // TODO: update once the Vercel project rename discussion lands

// This is the SAME feed as Phocal's "Ted's Talks" -- reads/writes go through
// Connected's own /api/social-timeline, which proxies to Phocal's storage,
// rather than keeping a separate copy. See artifacts/api-server/src/routes/social-timeline.ts.
type PhocalMessage = {
  id: string;
  fromLocation: string;
  toLocation: string | null;
  toUserName?: string | null;
  messageText: string;
  isAnnouncement: boolean;
  postedAt: string;
};

export function SocialTimelineCard() {
  const { session } = useAuth();
  const { requirePublishAccess } = usePublishAccess();
  const [draft, setDraft] = useState('');
  const [location, setLocation] = useState(session?.store ?? '');
  const [toUserName, setToUserName] = useState('');
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string }[] | null>(null);
  const [messages, setMessages] = useState<PhocalMessage[] | null>(null);
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcementsOnly, setAnnouncementsOnly] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<'issue' | 'suggestion'>('issue');
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
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
    fetch('/api/users', { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const visibleMessages = useMemo(() => {
    if (!messages) return [];
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (announcementsOnly && !m.isAnnouncement) return false;
      if (!q) return true;
      return `${m.fromLocation} ${m.toUserName ?? ''} ${m.messageText}`.toLowerCase().includes(q);
    });
  }, [messages, search, announcementsOnly]);

  const handlePost = async () => {
    if (!draft.trim() || !location.trim() || posting) return;
    setPosting(true);
    try {
      await fetch('/api/social-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromLocation: location.trim(), toLocation: null, toUserName: toUserName || null, messageText: draft.trim(), isAnnouncement: false }),
      });
      setDraft('');
      setToUserName('');
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

  // Goes to Matt directly via Phocal's Staff Reports -- a separate, private
  // channel from the public Ted's Talks feed above, not a post anyone else
  // sees. See artifacts/api-server/src/routes/staff-reports.ts.
  const submitReport = async () => {
    if (!reportText.trim() || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/staff-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ issueText: reportText.trim(), reportType }),
      });
      if (!res.ok) throw new Error();
      setReportText('');
      setReportSent(true);
      setTimeout(() => {
        setReportSent(false);
        setReportOpen(false);
      }, 2000);
    } catch {
      // Left the draft text in place so nothing's lost -- silent failure
      // here would just look like the button did nothing, which is worse.
      alert("Couldn't send that -- try again in a moment.");
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <DashboardCard
      title="Ted's Talks"
      actions={
        <>
          <CardIconButton icon={Search} label="Search posts" tone="primary" onClick={() => setSearchOpen((v) => !v)} />
          <CardIconButton icon={Flag} label="Report an issue or make a suggestion" tone="primary" onClick={() => setReportOpen((v) => !v)} />
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
            aria-label="Open the full Ted's Talks feed in Phocal"
            title="Open the full Ted's Talks feed in Phocal"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-extrabold text-primary-foreground transition hover:brightness-95"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Phocal
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
      {reportOpen && (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          {reportSent ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Check className="h-4 w-4" /> Sent — thanks for flagging this.
            </p>
          ) : (
            <>
              <div className="mb-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportType('issue')}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${reportType === 'issue' ? 'bg-foreground text-primary' : 'border border-border bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  🚩 Report an issue
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('suggestion')}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${reportType === 'suggestion' ? 'bg-foreground text-primary' : 'border border-border bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  💡 Make a suggestion
                </button>
              </div>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={reportType === 'issue' ? "What's the issue?" : "What's your suggestion?"}
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-accent"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Goes directly to Matt via Phocal's Staff Reports — not posted to the feed below.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={!reportText.trim() || reportSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {reportSubmitting ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
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
          <FormattingToolbar textareaRef={textareaRef} value={draft} onChange={setDraft} />
          <textarea
            ref={textareaRef}
            data-testid="input-social-post"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write something here…"
            rows={2}
            className="w-full resize-none px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <div className="flex items-center gap-1.5 border-t border-border px-2 py-1.5">
            <span className="text-xs text-muted-foreground">To:</span>
            <select
              value={toUserName}
              onChange={(e) => setToUserName(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none"
            >
              <option value="">Everyone</option>
              {users?.map((u) => (
                <option key={u.id} value={`${u.firstName} ${u.lastName}`}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
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
                    {post.toUserName && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">To: {post.toUserName}</span>}
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
            <div className="mt-3 text-sm leading-6 text-foreground/90">
              <RichContent text={post.messageText} />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
