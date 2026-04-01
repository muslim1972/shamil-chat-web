import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

export function useTyping(conversationId: string | undefined, currentUserId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`typing:${conversationId}`);
    typingChannelRef.current = channel;
    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const fromUserId = payload?.payload?.userId as string | undefined;
        if (!fromUserId || fromUserId === currentUserId) return;
        if (payload?.payload?.typing === false) {
          setTypingUsers(prev => {
            const next = { ...prev } as Record<string, number>;
            delete next[fromUserId];
            return next;
          });
          return;
        }
        setTypingUsers(prev => ({ ...prev, [fromUserId]: Date.now() }));
      })
      .subscribe();

    const interval = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next: Record<string, number> = {};
        Object.entries(prev).forEach(([uid, t]) => {
          if (now - t < 1000) next[uid] = t;
        });
        return next;
      });
    }, 1000);

    // Helper: clear typing immediately when message INSERT arrives from other user
    const insertChannel = supabase
      .channel(`typing-helper:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: any) => {
        const senderId = payload?.new?.sender_id as string | undefined;
        if (!senderId || senderId === currentUserId) return;
        setTypingUsers(prev => {
          const next = { ...prev } as Record<string, number>;
          delete next[senderId];
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(insertChannel);
      window.clearInterval(interval);
    };
  }, [conversationId, currentUserId]);

  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 400) return;
    lastTypingEmitRef.current = now;
    const channel = typingChannelRef.current;
    if (channel && channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, at: now, typing: true }
      });
    }
  }, [currentUserId]);

  const emitTypingStop = useCallback(() => {
    const now = Date.now();
    const channel = typingChannelRef.current;
    if (channel && channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, at: now, typing: false }
      });
    }
  }, [currentUserId]);

  const isTyping = Object.keys(typingUsers).length > 0;

  return { typingUsers, isTyping, emitTyping, emitTypingStop };
}
