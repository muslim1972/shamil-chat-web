import { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import type { Message } from '../types';
import { supabase } from '../services/supabase';
import { useDeleteForEveryone } from './useDeleteForEveryone';
import { useForwardingSystem } from './useForwardingSystem';

interface UseMessageActionsArgs {
  conversationId: string;
  userId?: string;
  selectedMessages: Message[];
  clearSelection: () => void;
  removeMessages: (ids: string[]) => void;
  setOptimisticMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setPinnedMessage: (m: Message | null) => void;
}

export function useMessageActions({
  conversationId,
  userId,
  selectedMessages,
  clearSelection,
  removeMessages,
  setOptimisticMessages,
  setPinnedMessage,
}: UseMessageActionsArgs) {
  const { deleteInIndividual, deleteInGroup } = useDeleteForEveryone();
  const { startForwarding } = useForwardingSystem();
  const canPin = useMemo(() => userId && selectedMessages.length === 1 && selectedMessages[0].senderId === userId, [selectedMessages, userId]);

  const handleForwardMessages = useCallback(() => {
    if (selectedMessages.length === 0) return;

    // 🔥 استخدام النظام الموحد الجديد - لا حاجة لـ regex مكرر
    startForwarding(selectedMessages);
    clearSelection();
  }, [selectedMessages, clearSelection, startForwarding]);

  const handlePinMessage = useCallback(async () => {
    if (!canPin) return;
    const messageToPin = selectedMessages[0];
    setPinnedMessage(messageToPin);
    const { error } = await supabase.rpc('pin_message', { p_conversation_id: conversationId, p_message_id: messageToPin.id });
    if (!error) {
      toast.success('تم تثبيت الرسالة');
    } else {
      toast.error('فشل تثبيت الرسالة');
      setPinnedMessage(null);
    }
    clearSelection();
  }, [canPin, selectedMessages, clearSelection, conversationId, setPinnedMessage]);

  const handleUnpinMessage = useCallback(async () => {
    const { data, error } = await supabase.rpc('unpin_message', { p_conversation_id: conversationId });
    if (!error && data === true) {
      setPinnedMessage(null);
      toast.success('تم إلغاء التثبيت');
    } else {
      toast.error('لا يمكنك إلغاء تثبيت رسالة لم تثبتها أنت');
    }
  }, [conversationId, setPinnedMessage]);

  const handleDeleteForMe = useCallback(async () => {
    const messageIds = selectedMessages.map(m => m.id);
    try {
      removeMessages(messageIds);
      setOptimisticMessages(prev => prev.filter((m: any) => {
        const sid = m?.server_id || m?.id;
        return !messageIds.includes(sid);
      }));
      await supabase.rpc('hide_messages_for_user', { p_message_ids: messageIds });
      toast.success(`تم حذف ${messageIds.length} رسالة.`);
    } catch {
      toast.error('فشل حذف الرسائل.');
    }
    clearSelection();
  }, [selectedMessages, removeMessages, clearSelection, setOptimisticMessages]);

  const handleDeleteForEveryone = useCallback(async () => {
    if (!userId || !conversationId) return;
    const { data: convData } = await supabase
      .from('conversations')
      .select('is_group')
      .eq('id', conversationId)
      .single();

    const allIds = selectedMessages.map(m => m.id);
    const selectedClientIds = new Set(
      (selectedMessages as any[])
        .map((m: any) => m?.media_metadata?.client_id || m?.client_id)
        .filter(Boolean)
    );
    try {
      // optimistic removal always removes all selected locally
      removeMessages(allIds);
      setOptimisticMessages(prev => prev.filter((m: any) => {
        const sid = m?.server_id || m?.id;
        const cid = m?.media_metadata?.client_id || m?.client_id;
        if (allIds.includes(sid)) return false;
        if (cid && selectedClientIds.has(cid)) return false;
        return true;
      }));

      if (convData?.is_group) {
        await deleteInGroup(selectedMessages, userId);
        toast.success(`تمت معالجة حذف ${allIds.length} رسالة (محادثة مجموعة).`);
      } else {
        await deleteInIndividual(selectedMessages);
        toast.success(`تم حذف ${allIds.length} رسالة للجميع.`);
      }
    } catch (e) {
      toast.error('فشل حذف الرسائل.');
    }
    clearSelection();
  }, [userId, conversationId, selectedMessages, removeMessages, clearSelection, setOptimisticMessages]);

  return {
    canPin,
    handleForwardMessages,
    handlePinMessage,
    handleUnpinMessage,
    handleDeleteForMe,
    handleDeleteForEveryone,
  };
}
