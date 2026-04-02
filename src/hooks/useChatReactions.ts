import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';

export function useChatReactions() {
  const toggleReaction = useCallback(async (messageId: string, userId: string, emoji: string, conversationId?: string) => {
    try {
      // 1. تحقق أولاً بطلب بسيط
      const { data: existing, error: fetchError } = await supabase
        .from('message_reactions_extra')
        .select('id, emoji')
        .eq('message_id', messageId)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const hasSameEmoji = existing && existing.length > 0 && existing[0].emoji === emoji;
      let action: 'add' | 'remove' = 'add';

      if (hasSameEmoji) {
        action = 'remove';
        await supabase
          .from('message_reactions_extra')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId);
      } else {
        action = 'add';
        const { error: upsertError } = await supabase
          .from('message_reactions_extra')
          .upsert({
            message_id: messageId,
            user_id: userId,
            emoji: emoji,
            created_at: new Date().toISOString()
          }, { onConflict: 'message_id,user_id' });
        
        if (upsertError) throw upsertError;
      }

      // 🚀 إرسال Broadcast للسرعة إذا توفر معرف المحادثة
      if (conversationId) {
        const channel = supabase.channel(`chat_extras:${conversationId}`, {
          config: { broadcast: { self: true } }
        });
        await channel.send({
          type: 'broadcast',
          event: 'reaction_update',
          payload: { message_id: messageId, user_id: userId, emoji, action }
        });
        console.log('🚀 [useChatReactions] Broadcast sent for message:', messageId);
      }
    } catch (err) {
      console.error('Reaction error:', err);
      toast.error('فشل تحديث التفاعل');
    }
  }, []);

  const removeReaction = useCallback(async (messageId: string, userId: string, conversationId?: string) => {
    try {
      await supabase
        .from('message_reactions_extra')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);

      // 🚀 إرسال Broadcast
      if (conversationId) {
        const channel = supabase.channel(`chat_extras:${conversationId}`);
        await channel.send({
          type: 'broadcast',
          event: 'reaction_update',
          payload: { message_id: messageId, user_id: userId, action: 'remove' }
        });
      }
    } catch (err) {
      console.error('Remove reaction error:', err);
    }
  }, []);

  return { toggleReaction, removeReaction };
}
