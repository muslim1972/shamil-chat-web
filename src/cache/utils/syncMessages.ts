import type { Message } from '../../types';
import type { CachedMessage } from '../types/cacheTypes';

export interface MessageSyncResult {
  added: Message[];
  updated: Message[];
  removed: string[];
}

export function syncMessages(
  cachedMessages: CachedMessage[],
  freshMessages: Message[]
): { synced: CachedMessage[]; result: MessageSyncResult } {

  const cachedMap = new Map(cachedMessages.map(m => [m.id, m]));
  const freshMap = new Map(freshMessages.map(m => [m.id, m]));

  const result: MessageSyncResult = {
    added: [],
    updated: [],
    removed: []
  };

  // إيجاد الرسائل الجديدة والمحدثة
  const synced: CachedMessage[] = freshMessages.map(fresh => {
    const cached = cachedMap.get(fresh.id);

    if (!cached) {
      // رسالة جديدة
      result.added.push(fresh);
      return { ...fresh };
    }

    // رسالة موجودة - فحص التحديثات
    const hasUpdates =
      cached.text !== fresh.text ||
      cached.status !== fresh.status;

    // عرض لوجات التحديث فقط عند وجود تغييرات
    if (hasUpdates) {
      // تم حذف رسالة الكونسول لتحسين الأداء
    }

    if (hasUpdates) {
      result.updated.push(fresh);
      // دمج: البيانات الجديدة + الـ blobs القديمة
      return {
        ...fresh,
        mediaBlob: cached.mediaBlob,
        thumbnailBlob: cached.thumbnailBlob
      };
    }

    // ✅ لا تحديثات - دمج البيانات الجديدة (sender, isGroupChat) مع الـ blobs القديمة
    return {
      ...fresh, // البيانات الجديدة من DB (تحتوي على sender و isGroupChat)
      mediaBlob: cached.mediaBlob, // الـ blobs المحفوظة محلياً
      thumbnailBlob: cached.thumbnailBlob
    };
  });

  // ✅ إيجاد الرسائل المحذوفة (موجودة في الكاش ولكن ليست في DB)
  // والإبقاء عليها مع isDeleted=true لعرض النقطة الحمراء
  cachedMessages.forEach(cached => {
    if (!freshMap.has(cached.id)) {
      result.removed.push(cached.id);
      // ✅ إضافة الرسالة المحذوفة إلى synced مع isDeleted=true
      // فقط إذا لم تكن محذوفة مسبقاً في الكاش
      synced.push({
        ...cached,
        isDeleted: true
      } as CachedMessage);
    }
  });

  // ترتيب الرسائل حسب الوقت
  synced.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { synced, result };
}