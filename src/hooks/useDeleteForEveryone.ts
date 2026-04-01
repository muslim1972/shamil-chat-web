import { useCallback } from 'react';
import type { Message } from '../types';
import { supabase } from '../services/supabase';

export function useDeleteForEveryone() {
  const deleteInIndividual = useCallback(async (messages: Message[]) => {
    const allIds = messages.map(m => m.id);
    const { error } = await supabase.rpc('delete_messages_for_all', { p_message_ids: allIds });
    if (error) throw error;
    return allIds;
  }, []);

  const deleteInGroup = useCallback(async (messages: Message[], userId: string) => {
    const own = messages.filter(m => m.senderId === userId);
    const others = messages.filter(m => m.senderId !== userId);
    // own -> delete for all, others -> hide for me (as per current app policy)
    if (own.length > 0) {
      const ids = own.map(m => m.id);
      const { error } = await supabase.rpc('delete_messages_for_all', { p_message_ids: ids });
      if (error) throw error;
    }
    if (others.length > 0) {
      const ids = others.map(m => m.id);
      const { error } = await supabase.rpc('hide_messages_for_user', { p_message_ids: ids });
      if (error) throw error;
    }
    return { ownIds: own.map(m => m.id), otherIds: others.map(m => m.id) };
  }, []);

  return { deleteInIndividual, deleteInGroup };
}
