import { useMemo } from 'react';
import type { Message } from '../types';

export function useDisplayedMessages(cachedMessages: Message[], optimisticMessages: Message[]) {
  return useMemo(() => {
    // ✅ لا نُزيل الرسائل المحذوفة - نُبقيها لعرض النقطة الحمراء
    const base = cachedMessages;

    const optimisticByClient = new Map<string, any>();
    for (const om of optimisticMessages as any[]) {
      const cid = (om as any)?.media_metadata?.client_id || (om as any)?.client_id;
      if (!cid) continue;
      // لا نستبعد 'sent' لتجنب فجوة قبل وصول الحقيقية
      optimisticByClient.set(cid, om);
    }

    const sentMap = new Map<string, string>();
    for (const om of optimisticMessages as any[]) {
      if ((om as any)?.status === 'sent' && (om as any)?.id) {
        const cid = (om as any)?.media_metadata?.client_id || (om as any)?.client_id;
        if (cid) sentMap.set((om as any).id, cid);
      }
    }

    const optimisticTimeByClient = new Map<string, number>();
    for (const om of optimisticMessages as any[]) {
      const cid = (om as any)?.media_metadata?.client_id || (om as any)?.client_id;
      if (cid) optimisticTimeByClient.set(cid, new Date((om as any).timestamp).getTime());
    }

    const realWithClient = base.map((msg: any) => {
      const injected = sentMap.get(msg.id);
      if (injected) {
        // Don't inject client_id if it's already in an optimistic message
        if (optimisticByClient.has(injected)) {
          return {
            ...msg,
            __display_ts: optimisticTimeByClient.get(injected) || new Date(msg.timestamp).getTime(),
          };
        }
        return {
          ...msg,
          client_id: msg.client_id || injected,
          media_metadata: { ...(msg.media_metadata || {}), client_id: (msg.media_metadata?.client_id || injected) },
          __display_ts: optimisticTimeByClient.get(injected) || new Date(msg.timestamp).getTime(),
        };
      }
      return { ...msg, __display_ts: new Date(msg.timestamp).getTime() };
    });

    const merged: any[] = [];
    const seenOptimistic = new Set<string>();
    const seenRealMessageIds = new Set<string>();

    // First, add real messages (but check for duplicates with optimistic)
    for (const rm of realWithClient as any[]) {
      const cid = rm?.media_metadata?.client_id || rm?.client_id;
      // Skip optimistic message if we have the real version with same client_id
      if (cid && optimisticByClient.has(cid) && optimisticByClient.get(cid)?.status === 'sent') {
        seenOptimistic.add(cid);
        // Keep the real message, remove the optimistic one
        merged.push(rm);
      } else {
        merged.push(rm);
      }
      if (rm.id) seenRealMessageIds.add(rm.id);
    }

    // Add optimistic messages that don't have corresponding real messages
    for (const [cid, om] of optimisticByClient) {
      if (!seenOptimistic.has(cid)) {
        // Check if this optimistic message has a corresponding real message
        if (om.id && seenRealMessageIds.has(om.id)) {
          // Skip if real message already exists
          continue;
        }
        merged.push(om);
      }
    }

    // ✅ فرز حسب created_at (server timestamp) أو __display_ts/timestamp كـ fallback
    merged.sort((a: any, b: any) => {
      const aTime = a.created_at
        ? new Date(a.created_at).getTime()
        : (a.__display_ts || new Date(a.timestamp).getTime());
      const bTime = b.created_at
        ? new Date(b.created_at).getTime()
        : (b.__display_ts || new Date(b.timestamp).getTime());
      return aTime - bTime;
    });

    return merged as Message[];
  }, [cachedMessages, optimisticMessages]);
}
