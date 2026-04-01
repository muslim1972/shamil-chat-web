import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Message } from '../types';

export function usePinnedMessage(conversationId?: string) {
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    if (!conversationId) return;

    const fetchPinnedMessage = async () => {
      if (!isSubscribed) return;
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('pinned_message_id')
          .eq('id', conversationId)
          .single();
        if (!isSubscribed || error) return;

        if (data?.pinned_message_id) {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', data.pinned_message_id)
            .single();
          if (messageData && !messageError && isSubscribed) {
            setPinnedMessage({
              id: messageData.id,
              text: messageData.content || messageData.text,
              senderId: messageData.sender_id,
              timestamp: messageData.created_at,
              message_type: messageData.message_type,
              conversationId: conversationId,
              status: 'sent',
              sender: messageData.sender,
            } as Message);
          }
        } else {
          setPinnedMessage(null);
        }
      } catch (e) {
        // swallow
      }
    };

    fetchPinnedMessage();

    const channelName = `pinned-${conversationId}-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
        async (payload: any) => {
          if (!isSubscribed) return;
          const newPinnedId = payload.new?.pinned_message_id;
          const oldPinnedId = payload.old?.pinned_message_id;
          const isPinnedRemoved = newPinnedId === null && ('pinned_message_id' in payload.new || 'pinned_by' in payload.new);
          const isNewPinned = !!newPinnedId;
          const isNewMessage = newPinnedId === null && oldPinnedId === undefined && !payload.old?.pinned_message_id && !payload.new?.pinned_message_id && !isPinnedRemoved;
          if (isNewMessage) return;
          if (isPinnedRemoved) {
            setPinnedMessage(null);
            return;
          }
          if (isNewPinned) {
            try {
              const { data: messageData, error } = await supabase
                .from('messages')
                .select('*')
                .eq('id', newPinnedId)
                .single();
              if (messageData && !error && isSubscribed) {
                setPinnedMessage({
                  id: messageData.id,
                  text: messageData.content || messageData.text,
                  senderId: messageData.sender_id,
                  timestamp: messageData.created_at,
                  message_type: messageData.message_type,
                  conversationId: conversationId,
                  status: 'sent',
                  sender: messageData.sender,
                } as Message);
              }
            } catch {}
          } else {
            setPinnedMessage(null);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(subscription);
    };
  }, [conversationId]);

  return { pinnedMessage, setPinnedMessage };
}
