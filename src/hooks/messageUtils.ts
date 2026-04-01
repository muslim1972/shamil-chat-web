import type { Message } from '../types';

export function mergeMessages(prev: Message[] | undefined, next: Message[]): Message[] {
  const map = new Map<string, Message>();
  if (Array.isArray(prev)) {
    for (const m of prev) map.set(m.id, m);
  }
  for (const n of next) {
    const p = map.get(n.id);
    if (p) {
      const keepPrevBlob = (p as any).mediaBlob instanceof Blob;
      const keepPrevBlobUrl = typeof p.signedUrl === 'string' && p.signedUrl.startsWith('blob:');
      const keepPrevThumbnail = (p as any).thumbnailBlob instanceof Blob;

      const merged: Message = {
        ...p,
        ...n,
        mediaBlob: keepPrevBlob && !(n as any).mediaBlob ? (p as any).mediaBlob : (n as any).mediaBlob,
        signedUrl: (keepPrevBlobUrl && (!n.signedUrl || n.signedUrl.startsWith('blob:') === false)) && !(n as any).mediaBlob
          ? p.signedUrl
          : n.signedUrl,
        thumbnailBlob: keepPrevThumbnail && !(n as any).thumbnailBlob ? (p as any).thumbnailBlob : (n as any).thumbnailBlob,
        thumbnail: keepPrevThumbnail && !(n as any).thumbnail ? (p as any).thumbnail : (n as any).thumbnail,
      } as Message;
      map.set(n.id, merged);
    } else {
      map.set(n.id, n);
    }
  }
  const merged = Array.from(map.values());

  // ✅ فرز حسب created_at (server timestamp) أو timestamp كـ fallback
  merged.sort((a, b) => {
    const aTime = (a as any).created_at
      ? new Date((a as any).created_at).getTime()
      : new Date(a.timestamp).getTime();
    const bTime = (b as any).created_at
      ? new Date((b as any).created_at).getTime()
      : new Date(b.timestamp).getTime();
    return aTime - bTime;
  });

  return merged;
}