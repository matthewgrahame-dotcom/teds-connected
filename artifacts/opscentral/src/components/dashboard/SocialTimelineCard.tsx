import { useState } from 'react';
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
} from 'lucide-react';
import { DashboardCard, CardIconButton } from './DashboardCard';

type Post = {
  id: number;
  author: string;
  timestamp: string;
  body: string;
};

// TODO: replace this local state with the mirrored Phocal chat feed once
// Phocal's chat API/schema has been shared (see project notes) — this is a
// structural placeholder only, not wired to any backend yet.
const seedPosts: Post[] = [
  {
    id: 1,
    author: 'Erin Graham',
    timestamp: '26/08/2026 11:22 am',
    body: 'Love seeing our team getting some well-deserved recognition! ❤️ We were tagged in this great video, and it\u2019s such a nice reminder of the amazing work our staff are doing.',
  },
];

const toolbarButtons = [Bold, Italic, Underline, LinkIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo2, Redo2];

export function SocialTimelineCard() {
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState(seedPosts);

  const handlePost = () => {
    if (!draft.trim()) return;
    setPosts((current) => [
      { id: Date.now(), author: 'You', timestamp: new Date().toLocaleString('en-AU'), body: draft.trim() },
      ...current,
    ]);
    setDraft('');
  };

  return (
    <DashboardCard
      title="Social Timeline"
      actions={
        <>
          <CardIconButton icon={Search} label="Search posts" tone="primary" />
          <CardIconButton icon={Filter} label="Filter posts" tone="primary" />
        </>
      }
    >
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
            className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-95"
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
        {posts.map((post) => (
          <div key={post.id} data-testid={`post-${post.id}`} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">{post.author}</p>
                <p className="text-xs text-muted-foreground">{post.timestamp}</p>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{post.body}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
