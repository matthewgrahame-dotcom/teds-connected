// Extracts a YouTube video id from the various URL shapes seen in these
// training exports (youtube.com/watch?v=ID, youtu.be/ID, with or without
// https://, with or without a &feature= suffix). Returns null for anything
// else, including studio.youtube.com/video/ID links -- those are Canon's
// own private editor URLs (they require the uploader's own Google login),
// not a public watch page, so they can't be embedded; those modules just
// keep the "open link" fallback instead.
export function getYouTubeEmbedId(url: string | null): string | null {
  if (!url) return null;
  const patterns = [/(?:youtube\.com\/watch\?v=)([\w-]{11})/, /(?:youtu\.be\/)([\w-]{11})/];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }
  return null;
}
