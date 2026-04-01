import { useEffect } from 'react';
import type { Message } from '../types';

interface OptimisticMessagesProps {
  cachedMessages: Message[];
  setOptimisticMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useOptimisticMessages({ cachedMessages, setOptimisticMessages }: OptimisticMessagesProps) {
  // Purge optimistic messages on messages-deleted event (ids + client_ids)
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ids?: string[]; clientIds?: string[] } | undefined;
      if (!detail) return;
      const ids = new Set(detail.ids || []);
      const cids = new Set(detail.clientIds || []);
      setOptimisticMessages(prev => prev.filter((m: any) => {
        const sid = m?.server_id || m?.id;
        const cid = m?.media_metadata?.client_id || m?.client_id;
        if (sid && ids.has(sid)) return false;
        if (cid && cids.has(cid)) return false;
        return true;
      }));
    };
    window.addEventListener('messages-deleted', onDeleted as EventListener);
    return () => window.removeEventListener('messages-deleted', onDeleted as EventListener);
  }, [setOptimisticMessages]);

  // Clean up optimistic messages when real messages arrive from server
  useEffect(() => {
    if (!cachedMessages?.length) return;
    setOptimisticMessages(prev => prev.filter(m => {
      const isSent = (m as any).status === 'sent';
      if (!isSent) return true;
      // Only remove optimistic message if real message exists with same server_id
      const serverId = (m as any).server_id || m.id;
      return !cachedMessages.some(cm => cm.id === serverId);
    }));
  }, [cachedMessages, setOptimisticMessages]);
}