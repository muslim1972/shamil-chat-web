import type { Conversation } from '../../types';
import type { CachedConversation, SyncResult } from '../types/cacheTypes';

export function syncConversations(
  cachedConversations: CachedConversation[],
  freshConversations: Conversation[]
): { synced: CachedConversation[]; result: SyncResult } {

  const cachedMap = new Map(cachedConversations.map(c => [c.id, c]));
  const freshMap = new Map(freshConversations.map(c => [c.id, c]));

  const result: SyncResult = {
    added: [],
    updated: [],
    removed: []
  };

  // إيجاد المحادثات الجديدة والمحدثة
  const synced: CachedConversation[] = freshConversations.map(fresh => {
    const cached = cachedMap.get(fresh.id);

    if (!cached) {
      // محادثة جديدة
      result.added.push(fresh);
      return {
        ...fresh,
        cachedAt: new Date().toISOString(),
        version: 1
      };
    }

    // محادثة موجودة - فحص التحديثات
    const hasUpdates =
      cached.lastMessage !== fresh.lastMessage ||
      cached.timestamp !== fresh.timestamp ||
      cached.unread !== fresh.unread ||
      cached.name !== fresh.name ||             // ✅ فحص تغيير الاسم
      cached.avatar_url !== fresh.avatar_url;   // ✅ فحص تغيير الصورة

    if (hasUpdates) {
      result.updated.push(fresh);
      return {
        ...fresh,
        cachedAt: new Date().toISOString(),
        version: (cached.version || 0) + 1
      };
    }

    // لا تحديثات - الاحتفاظ بالكاش القديم
    return cached;
  });

  // إيجاد المحادثات المحذوفة
  cachedConversations.forEach(cached => {
    if (!freshMap.has(cached.id)) {
      result.removed.push(cached.id);
    }
  });

  // تم حذف رسالة الكونسول لتحسين الأداء

  return { synced, result };
}