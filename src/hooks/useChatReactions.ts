import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';

export function useChatReactions() {
  const toggleReaction = useCallback(async (messageId: string, userId: string, emoji: string) => {
    try {
      // 1. تحقق أولاً بطلب بسيط (استخدام eq بدلاً من single لتجنب 406 إذا لم يوجد سجل)
      const { data: existing, error: fetchError } = await supabase
        .from('message_reactions_extra')
        .select('id, emoji')
        .eq('message_id', messageId)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const hasSameEmoji = existing && existing.length > 0 && existing[0].emoji === emoji;

      if (hasSameEmoji) {
        // حذف التفاعل إذا كان هو نفسه (Toggle Off)
        await supabase
          .from('message_reactions_extra')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId);
      } else {
        // إضافة أو تحديث (Upsert)
        // ملاحظة: نستخدم upsert مع onConflict لضمان التزامن
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
    } catch (err) {
      console.error('Reaction error:', err);
      toast.error('فشل تحديث التفاعل');
    }
  }, []);

  const removeReaction = useCallback(async (messageId: string, userId: string) => {
    try {
      await supabase
        .from('message_reactions_extra')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Remove reaction error:', err);
    }
  }, []);

  return { toggleReaction, removeReaction };
}
