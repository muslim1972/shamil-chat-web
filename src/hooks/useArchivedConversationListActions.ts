import { useState, useCallback } from "react";
import { supabase } from '../services/supabase';

export const useArchivedConversationListActions = (setArchivedConversations: React.Dispatch<React.SetStateAction<any[]>>, fetchArchivedConversations: () => Promise<void>) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

  const handleDbOperation = useCallback(async (operation: () => Promise<{ error: any }>, errorMessage: string, operationType: string) => {
    setIsProcessing(true);

    try {
      const { error } = await operation();
      if (error) {
        alert('خطأ: ' + errorMessage);
        console.error(errorMessage, error);
      } else {
        // تحديث الواجهة فوراً بدلاً من انتظار إعادة الجلب
        if (operationType === 'unarchive' || operationType === 'hide' || operationType === 'delete_all') {
          // دائماً قم بإعادة جلب المحادثات المؤرشفة لضمان التحديث الصحيح
          await fetchArchivedConversations();
        } else {
          await fetchArchivedConversations(); // إعادة الجلب للحالات الأخرى
        }
      }
    } catch (err: any) {
      alert('خطأ: ' + errorMessage);
      console.error(errorMessage, err);
    } finally {
      setIsProcessing(false);
      setSelectedConversation(null); // مسح المحادثة المحددة
    }
  }, [fetchArchivedConversations, selectedConversation, setArchivedConversations]);

  const handleUnarchiveConversation = useCallback(() => {
    if (!selectedConversation) return;

    handleDbOperation(
      async () => {
        const { error } = await supabase.rpc('unarchive_conversation', { p_conversation_id: selectedConversation.id });
        return { error };
      },
      'لم نتمكن من إلغاء أرشفة المحادثة.',
      'unarchive' // تحديد نوع العملية
    );
  }, [selectedConversation, handleDbOperation]);

  const handleHideConversation = useCallback(() => {
    if (!selectedConversation) return;

    handleDbOperation(
      async () => {
        const { error } = await supabase.rpc('clear_and_hide_conversation', { p_conversation_id: selectedConversation.id });
        return { error };
      },
      'حدث خطأ أثناء محاولة حذف المحادثة.',
      'hide' // تحديد نوع العملية
    );
  }, [selectedConversation, handleDbOperation]);

  const handleDeleteConversationForAll = useCallback(() => {
    if (!selectedConversation) return;

    if (confirm("هل أنت متأكد؟ سيتم حذف هذه المحادثة وكل رسائلها بشكل نهائي لك وللجميع.")) {
      handleDbOperation(
        async () => {
          const { error } = await supabase.rpc('delete_conversation_for_all', { p_conversation_id: selectedConversation.id });
          return { error };
        },
        'لم نتمكن من حذف المحادثة للجميع.',
        'delete_all' // تحديد نوع العملية
      );
    }
  }, [selectedConversation, handleDbOperation]);

  return {
    isProcessing,
    selectedConversation,
    handleUnarchiveConversation,
    handleHideConversation,
    handleDeleteConversationForAll,
  };
};
