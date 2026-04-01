import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { CachedMessage } from '../types/cacheTypes';
import { CacheStrategy } from '../core/CacheStrategy';
import { CACHE_CONFIG } from '../core/CacheConfig';
import { useMediaQueue } from './useMediaQueue';
import { useMessagesRealtime } from './useMessagesRealtime';
import { useMessagesFetch } from './useMessagesFetch';
import { supabase } from '../../services/supabase';

/**
 * Props لـ useConversationMessagesCache
 */
interface UseConversationMessagesCacheProps {
  /** معرف المحادثة */
  conversationId: string;
  /** معرف المستخدم الحالي */
  userId: string;
}

// استخدام constants من CacheConfig
const BATCH_SIZE = CACHE_CONFIG.MESSAGES_BATCH_SIZE;


/**
 * Hook رئيسي لإدارة كاش رسائل المحادثة
 * 
 * يجمع بين جلب الرسائل، التزامن مع database، realtime updates، وتحميل الوسائط
 * تم تقسيمه إلى hooks منفصلة لتحسين قابلية الصيانة
 * 
 * @param {UseConversationMessagesCacheProps} props - conversationId و userId
 * @returns {{
 *   messages: CachedMessage[],
 *   loading: boolean,
 *   error: string | null,
 *   isComplete: boolean,
 *   refetch: Function,
 *   refreshMessages: Function,
 *   hasMore: boolean,
 *   resolveMediaNow: Function,
 *   loadOlder: Function,
 *   registerVisibleMessage: Function,
 *   removeMessages: Function
 * }}
 * 
 * @hook
 * @example
 * const { messages, loading } = useConversationMessagesCache({
 *   conversationId: 'abc123',
 *   userId: 'user456'
 * });
 */
export const useConversationMessagesCache = ({
  conversationId,
  userId
}: UseConversationMessagesCacheProps) => {


  const [messages, setMessages] = useState<CachedMessage[]>([]);
  const messagesRef = useRef<CachedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const retryTimersRef = useRef<Map<string, number>>(new Map());

  // استخدام الـ hooks المنفصلة
  const { processMediaQueue, registerVisibleMessage, addToMediaQueue } = useMediaQueue();

  const { fetchAndSyncMessages, fullCacheRef, blobUrlRefs, isSyncingRef } = useMessagesFetch({
    conversationId,
    userId
  })

  // Realtime subscription
  useMessagesRealtime({
    conversationId,
    userId,
    isComplete,
    messagesRef,
    setMessages,
    addToMediaQueue,
    processMediaQueue
  });

  // تنظيف blob URLs
  useEffect(() => {
    return () => {
      blobUrlRefs.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlRefs.current.clear();
      retryTimersRef.current.forEach(timer => clearTimeout(timer));
      retryTimersRef.current.clear();
    };
  }, [blobUrlRefs]);

  // تحميل أولي
  useEffect(() => {
    fetchAndSyncMessages(
      messagesRef,
      setMessages,
      setLoading,
      setError,
      setIsComplete,
      addToMediaQueue,
      processMediaQueue
    );
  }, [fetchAndSyncMessages, addToMediaQueue, processMediaQueue]);

  // ✅ Mark conversation as read عند دخول المستخدم للمحادثة
  useEffect(() => {
    if (!conversationId || !userId || !isComplete) return;

    const markAsRead = async () => {
      try {
        await supabase.rpc('mark_conversation_read_v3', {
          p_conversation_id: conversationId
        });
      } catch (e) {
        console.warn('[Cache] Failed to mark conversation as read:', e);
      }
    };

    markAsRead();
  }, [conversationId, userId, isComplete]);

  const refreshMessages = useCallback(async () => {
    if (isSyncingRef.current) return;
    await fetchAndSyncMessages(
      messagesRef,
      setMessages,
      setLoading,
      setError,
      setIsComplete,
      addToMediaQueue,
      processMediaQueue
    );
  }, [fetchAndSyncMessages, isSyncingRef, addToMediaQueue, processMediaQueue]);

  const resolveMediaNow = useCallback(async (msgId: string, rawPath: string) => {
    if (!rawPath) return;

    addToMediaQueue(msgId);
    await processMediaQueue(messagesRef, setMessages);
  }, [addToMediaQueue, processMediaQueue]);

  const loadOlder = useCallback(() => {
    const total = fullCacheRef.current.length;
    const loaded = messagesRef.current.length;
    if (loaded >= total) return;

    const chunk = Math.min(BATCH_SIZE, total - loaded);
    const start = total - loaded - chunk;
    const older = fullCacheRef.current.slice(start, start + chunk);

    setMessages(prev => {
      const next = [...older, ...prev];
      messagesRef.current = next;

      // إضافة الوسائط الجديدة للطابور
      older.forEach(msg => {
        if (['image', 'video'].includes((msg as any).message_type) && !(msg as any).signedUrl) {
          addToMediaQueue(msg.id);
        }
      });
      processMediaQueue(messagesRef, setMessages);

      return next;
    });
  }, [fullCacheRef, addToMediaQueue, processMediaQueue]);

  const removeMessages = useCallback((messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0) return;

    const filterFn = (m: CachedMessage) => !messageIds.includes(m.id);

    // Update the full in-memory cache immediately
    fullCacheRef.current = fullCacheRef.current.filter(filterFn);

    // Update the visible messages state immediately
    const newVisibleMessages = messagesRef.current.filter(filterFn);
    messagesRef.current = newVisibleMessages;
    setMessages(newVisibleMessages);

    // Persist the changes to IndexedDB
    CacheStrategy.saveMessages(conversationId, fullCacheRef.current).catch(err => {
      console.warn('[Cache] Failed to save messages after removal:', err);
    });
  }, [conversationId, fullCacheRef]);

  // Memoize hasMore لتجنب re-renders
  const hasMore = useMemo(
    () => fullCacheRef.current.length > messagesRef.current.length,
    [fullCacheRef.current.length, messages.length] // dependencies بناءً على messages
  );

  // Memoize refetch
  const refetch = useCallback(() => fetchAndSyncMessages(
    messagesRef,
    setMessages,
    setLoading,
    setError,
    setIsComplete,
    addToMediaQueue,
    processMediaQueue
  ), [fetchAndSyncMessages, addToMediaQueue, processMediaQueue]);

  // Memoize registerVisibleMessage wrapper
  const registerVisibleMessageWrapper = useCallback(
    (msgId: string, isVisible: boolean) => registerVisibleMessage(msgId, isVisible, messagesRef),
    [registerVisibleMessage]
  );

  const returnValue = {
    messages,
    loading,
    error,
    isComplete,
    refetch,
    refreshMessages,
    hasMore,
    resolveMediaNow,
    loadOlder,
    registerVisibleMessage: registerVisibleMessageWrapper,
    removeMessages
  };

  return returnValue;
};
