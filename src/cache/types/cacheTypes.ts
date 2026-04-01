import type { Conversation, Message } from '../../types';

export interface CachedConversation extends Conversation {
  cachedAt: string;
  version: number;
}

export interface CachedMessage extends Message {
  mediaBlob?: Blob;
  thumbnailBlob?: Blob;
  thumbnail?: string;
}

export interface CacheMetadata {
  conversationId: string;
  lastSync: string;
  version: number;
  isComplete: boolean;
}

export interface SyncResult {
  added: Conversation[];
  updated: Conversation[];
  removed: string[];
}