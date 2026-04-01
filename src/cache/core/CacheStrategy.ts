import { cacheManager } from '../../services/CacheManager';
import { CACHE_CONFIG, getOptimalCacheSettings } from './CacheConfig';
import type { CachedMessage } from '../types/cacheTypes';
import type { CachedConversation, CacheMetadata } from '../types/cacheTypes';

export class CacheStrategy {
  
  // تخزين محسّن للمحادثات
  static async getConversations(userId: string): Promise<CachedConversation[]> {
    try {
      const cached = await cacheManager.get<CachedConversation[]>(
        CACHE_CONFIG.CONVERSATIONS_KEY,
        userId
      );
      
      if (cached && Array.isArray(cached)) {
        // التحقق من صحة البيانات المخزنة
        const valid = cached.filter(conv => 
          conv.id && typeof conv.id === 'string'
        );
        
        // تم حذف رسالة الكونسول لتحسين الأداء
        
        return valid;
      }
      
      return [];
    } catch (error) {
      console.error('[Cache] Error getting conversations:', error);
      // محاولة مسح الكاش التالف
      try {
        await cacheManager.delete(CACHE_CONFIG.CONVERSATIONS_KEY, userId);
      } catch {}
      return [];
    }
  }

  static async saveConversations(
    userId: string,
    conversations: CachedConversation[]
  ): Promise<void> {
    try {
      // تنظيف البيانات قبل الحفظ
      const toSave = conversations.map(conv => ({
        ...conv,
        cachedAt: new Date().toISOString(),
        version: CACHE_CONFIG.VERSION
      }));
      
      await cacheManager.set(
        CACHE_CONFIG.CONVERSATIONS_KEY,
        userId,
        toSave,
        CACHE_CONFIG.CACHE_LIFETIME
      );
      
      // تم حذف رسالة الكونسول لتحسين الأداء
    } catch (error) {
      console.error('[Cache] Error saving conversations:', error);
    }
  }

  // تخزين محسّن للرسائل
  static async getMessages(conversationId: string): Promise<CachedMessage[]> {
    try {
      const cached = await cacheManager.get<CachedMessage[]>(
        CACHE_CONFIG.MESSAGES_PREFIX,
        conversationId
      );
      
      if (!cached || !Array.isArray(cached)) {
        return [];
      }
      
      // التحقق من إصدار الكاش
      const metadata = await this.getMetadata(conversationId);
      if (metadata && metadata.version !== CACHE_CONFIG.VERSION) {
        // تم حذف رسالة الكونسول لتحسين الأداء
        
        await this.clearMessages(conversationId);
        return [];
      }
      
      // تنظيف الرسائل القديمة جداً
      const settings = getOptimalCacheSettings();
      const maxMessages = settings.messagesLimit * 2; // ضعف الحد للكاش
      
      if (cached.length > maxMessages) {
        const sorted = [...cached].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const trimmed = sorted.slice(0, maxMessages);
        // تم حذف رسالة الكونسول لتحسين الأداء
        
        return trimmed;
      }
      
      // تم حذف رسالة الكونسول لتحسين الأداء
      
      return cached;
    } catch (error) {
      console.error('[Cache] Error getting messages:', error);
      // محاولة مسح الكاش التالف
      try {
        await this.clearMessages(conversationId);
      } catch {}
      return [];
    }
  }

  static async saveMessages(
    conversationId: string,
    messages: CachedMessage[]
  ): Promise<void> {
    try {
      const settings = getOptimalCacheSettings();
      const maxToCache = settings.messagesLimit * 2;
      
      // ترتيب وتحديد الرسائل للحفظ
      const sorted = [...messages].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const toCache = sorted.slice(-maxToCache);
      
      // تنظيف البيانات الثقيلة قبل الحفظ
      const cleaned = toCache.map(msg => {
        const cleaned: any = { ...msg };
        
        // لا نحفظ Blobs في الكاش (ثقيلة جداً)
        delete cleaned.mediaBlob;
        delete cleaned.thumbnailBlob;
        
        // لا نحفظ URLs المؤقتة
        delete cleaned.signedUrl;
        delete cleaned.thumbnail;
        
        return cleaned;
      });
      
      await cacheManager.set(
        CACHE_CONFIG.MESSAGES_PREFIX,
        conversationId,
        cleaned,
        CACHE_CONFIG.CACHE_LIFETIME
      );
      
      // حفظ metadata
      await this.saveMetadata({
        conversationId,
        lastSync: new Date().toISOString(),
        version: CACHE_CONFIG.VERSION,
        isComplete: messages.length === cleaned.length,
        messageCount: cleaned.length
      } as any);
      
      // تم حذف رسالة الكونسول لتحسين الأداء
    } catch (error) {
      console.error('[Cache] Error saving messages:', error);
    }
  }

  // إدارة Metadata
  static async getMetadata(conversationId: string): Promise<CacheMetadata | null> {
    try {
      return await cacheManager.get<CacheMetadata>(
        CACHE_CONFIG.METADATA_PREFIX,
        conversationId
      );
    } catch (error) {
      console.error('[Cache] Error getting metadata:', error);
      return null;
    }
  }

  static async saveMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await cacheManager.set(
        CACHE_CONFIG.METADATA_PREFIX,
        metadata.conversationId,
        metadata,
        CACHE_CONFIG.CACHE_LIFETIME
      );
    } catch (error) {
      console.error('[Cache] Error saving metadata:', error);
    }
  }

  // مسح الكاش
  static async clearMessages(conversationId: string): Promise<void> {
    try {
      await Promise.all([
        cacheManager.delete(CACHE_CONFIG.MESSAGES_PREFIX, conversationId),
        cacheManager.delete(CACHE_CONFIG.METADATA_PREFIX, conversationId),
        cacheManager.delete(CACHE_CONFIG.MEDIA_PREFIX, conversationId),
        cacheManager.delete(CACHE_CONFIG.THUMBNAIL_PREFIX, conversationId)
      ]);
      // تم حذف رسالة الكونسول لتحسين الأداء
    } catch (error) {
      console.error('[Cache] Error clearing messages:', error);
    }
  }

  static async clearAllCache(): Promise<void> {
    try {
      await cacheManager.clear();
      // تم حذف رسالة الكونسول لتحسين الأداء
      
      // إشعار Service Worker لمسح كاشه أيضاً
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE'
        });
      }
    } catch (error) {
      console.error('[Cache] Error clearing all cache:', error);
    }
  }

  // إزالة رسائل محددة من كاش المحادثة
  static async removeMessages(conversationId: string, messageIds: string[]): Promise<void> {
    try {
      if (!conversationId || !Array.isArray(messageIds) || messageIds.length === 0) return;
      const cached = await this.getMessages(conversationId);
      const filtered = cached.filter(msg => !messageIds.includes((msg as any).id));
      // حفظ القائمة المصفّاة مرة أخرى
      await this.saveMessages(conversationId, filtered as any);

      // حذف أي ملحقات وسائط مرتبطة بهذه الرسائل من الكاش
      for (const id of messageIds) {
        try {
          await cacheManager.delete(CACHE_CONFIG.MEDIA_PREFIX, id);
          await cacheManager.delete(CACHE_CONFIG.THUMBNAIL_PREFIX, id);
        } catch (e) {
          // تجاهل أخطاء حذف الوسائط المفردة
        }
      }

      // تم حذف رسالة الكونسول لتحسين الأداء
    } catch (error) {
      console.error('[Cache] Error removing messages:', error);
    }
  }

  // كاش الوسائط (منفصل عن الرسائل)
  static async saveMediaUrl(
    messageId: string,
    url: string,
    type: 'media' | 'thumbnail' = 'media'
  ): Promise<void> {
    try {
      const prefix = type === 'thumbnail' ? CACHE_CONFIG.THUMBNAIL_PREFIX : CACHE_CONFIG.MEDIA_PREFIX;
      await cacheManager.set(
        prefix,
        messageId,
        url,
        CACHE_CONFIG.MEDIA_CACHE_LIFETIME
      );
    } catch (error) {
      console.error(`[Cache] Error saving ${type} URL:`, error);
    }
  }

  static async getMediaUrl(
    messageId: string,
    type: 'media' | 'thumbnail' = 'media'
  ): Promise<string | null> {
    try {
      const prefix = type === 'thumbnail' ? CACHE_CONFIG.THUMBNAIL_PREFIX : CACHE_CONFIG.MEDIA_PREFIX;
      return await cacheManager.get<string>(prefix, messageId);
    } catch (error) {
      console.error(`[Cache] Error getting ${type} URL:`, error);
      return null;
    }
  }

  // تحسين حجم الكاش
  static async getCacheSize(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;
        
        // تم حذف رسالة الكونسول لتحسين الأداء
        
        // تنظيف تلقائي إذا تجاوز 80%
        if (percentage > 80) {
          console.warn('[Cache] Storage usage high, cleaning old data...');
          await this.cleanupOldCache();
        }
        
        return usage;
      }
      return 0;
    } catch (error) {
      console.error('[Cache] Error getting cache size:', error);
      return 0;
    }
  }

  // تنظيف الكاش القديم
  static async cleanupOldCache(): Promise<void> {
    try {
      // مسح الوسائط القديمة أولاً (الأكثر استهلاكاً)
      const allKeys = await cacheManager.keys();
      const mediaKeys = allKeys.filter(key => 
        key.includes(CACHE_CONFIG.MEDIA_PREFIX) || 
        key.includes(CACHE_CONFIG.THUMBNAIL_PREFIX)
      );
      
      // حذف أقدم 50% من الوسائط
      const toDelete = Math.floor(mediaKeys.length * 0.5);
      for (let i = 0; i < toDelete; i++) {
        const parts = mediaKeys[i].split(':');
        if (parts.length >= 2) {
          await cacheManager.delete(parts[0], parts[1]);
        }
      }
      
      // تم حذف رسالة الكونسول لتحسين الأداء
    } catch (error) {
      console.error('[Cache] Error cleaning up old cache:', error);
    }
  }
}