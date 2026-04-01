import localForage from 'localforage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
}

interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

class EnhancedCacheManager {
  private messageCache: LocalForage;
  private mediaCache: LocalForage;
  private metadataCache: LocalForage;
  private config: CacheConfig;

  constructor(config: CacheConfig = { maxAge: 7, maxSize: 500 }) {
    this.config = config;

    this.messageCache = localForage.createInstance({
      name: 'shamil_app',
      storeName: 'messages',
      description: 'Message text cache'
    });

    this.mediaCache = localForage.createInstance({
      name: 'shamil_app',
      storeName: 'media',
      description: 'Media files (images, videos, audio)'
    });

    this.metadataCache = localForage.createInstance({
      name: 'shamil_app',
      storeName: 'metadata',
      description: 'Cache metadata and thumbnails'
    });
  }

  async set<T>(
    store: string,
    key: string,
    value: T,
    ttlMs?: number
  ): Promise<void> {
    const cache = this.getStore(store);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      expiresAt: now + (ttlMs ?? (this.config.maxAge * 24 * 60 * 60 * 1000)),
      size: this.estimateSize(value)
    };

    await cache.setItem(key, entry);
  }
  async get<T>(
    store: string,
    key: string
  ): Promise<T | null> {
    const cache = this.getStore(store);
    const entry = await cache.getItem<CacheEntry<T>>(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      await cache.removeItem(key);
      return null;
    }

    return entry.data;
  }
  async cleanup(): Promise<number> {
    let deletedCount = 0;
    const stores = [this.messageCache, this.mediaCache, this.metadataCache];

    for (const store of stores) {
      const keys = await store.keys();
      for (const key of keys) {
        const entry = await store.getItem<CacheEntry<any>>(key);
        if (entry && Date.now() > entry.expiresAt) {
          await store.removeItem(key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  async getTotalSize(): Promise<number> {
    let totalSize = 0;
    const stores = [this.messageCache, this.mediaCache, this.metadataCache];

    for (const store of stores) {
      const keys = await store.keys();
      for (const key of keys) {
        const entry = await store.getItem<CacheEntry<any>>(key);
        if (entry) totalSize += entry.size;
      }
    }

    return totalSize;
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.messageCache.clear(),
      this.mediaCache.clear(),
      this.metadataCache.clear()
    ]);
  }

  async clear(): Promise<void> {
    // alias used by CacheStrategy
    await this.clearAll();
  }

  async delete(
    store: string,
    key: string
  ): Promise<void> {
    const cache = this.getStore(store);
    await cache.removeItem(key);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    const stores: Array<{ name: 'messages' | 'media' | 'metadata'; ref: LocalForage }> = [
      { name: 'messages', ref: this.messageCache },
      { name: 'media', ref: this.mediaCache },
      { name: 'metadata', ref: this.metadataCache }
    ];
    for (const s of stores) {
      const keys = await s.ref.keys();
      for (const k of keys) {
        result.push(`${s.name}:${k}`);
      }
    }
    return result;
  }

  private getStore(store: string): LocalForage {
    const s = store.toLowerCase();
    if (s.includes('media')) return this.mediaCache;
    if (s.includes('metadata') || s.includes('meta')) return this.metadataCache;
    // conversations/messages/default -> messageCache
    return this.messageCache;
  } private estimateSize(data: any): number {
    try {
      const json = JSON.stringify(data);
      return json ? json.length * 2 : 0; // تقريب سريع (حرفين لكل بايت كمتوسط Unicode)
    } catch {
      return 0;
    }
  }
}

export const cacheManager = new EnhancedCacheManager();

export const saveMessagesToCache = async (conversationId: string, messages: any[]): Promise<void> => {
  try {
    await cacheManager.set('messages', conversationId, messages);
    console.log('[CacheManager] Saved', messages.length, 'messages for conversation', conversationId);
  } catch (error) {
    console.error('[CacheManager] Failed to save messages to cache:', error);
  }
};

export const getMessagesFromCache = async (conversationId: string): Promise<any[] | null> => {
  try {
    const messages = await cacheManager.get<any[]>('messages', conversationId);
    if (messages) {
      console.log('[CacheManager] Retrieved', messages.length, 'messages from cache for conversation', conversationId);
      return messages.map(msg => {
        if (msg.mediaBlob && msg.mediaBlob instanceof Blob) {
          return { ...msg, signedUrl: URL.createObjectURL(msg.mediaBlob) };
        }
        return msg;
      });
    }
    return null;
  } catch (error) {
    console.error('[CacheManager] Failed to get messages from cache:', error);
    return null;
  }
};
export const deleteConversationCache = async (conversationId: string): Promise<void> => {
  try {
    const messageCache = localForage.createInstance({
      name: 'shamil_app',
      storeName: 'messages'
    });
    await messageCache.removeItem(conversationId);
    console.log('[CacheManager] Deleted cache for conversation', conversationId);
  } catch (error) {
    console.error('[CacheManager] Failed to delete cache for conversation', conversationId, ':', error);
  }
};
export const clearConversationCache = async (conversationId: string): Promise<void> => {
  try {
    await cacheManager.set('messages', conversationId, []);
    console.log('[CacheManager] Cleared cache for conversation', conversationId);
  } catch (error) {
    console.error('[CacheManager] Failed to clear cache for conversation', conversationId, ':', error);
  }
};

export const clearAllConversationsCache = async (): Promise<void> => {
  try {
    await cacheManager.clearAll();
    console.log('[CacheManager] All conversation cache cleared.');
  } catch (error) {
    console.error('[CacheManager] Failed to clear all conversation cache:', error);
  }
};