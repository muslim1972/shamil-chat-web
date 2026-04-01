import React, { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import type { Message } from '../types';

export const useMessageEdit = (
  selectedMessage: Message | null,
  setNewMessage: (text: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  isEditingMessage: boolean,
  setIsEditingMessage: (editing: boolean) => void,
  editingMessageId: string | null,
  setEditingMessageId: (id: string | null) => void,
  onRefreshCache: () => Promise<void>
) => {
  const { user } = useAuth();

  // دالة بدء التعديل
  const handleEditMessage = useCallback(() => {
    if (isEditingMessage) {
      return;
    }
    
    if (!selectedMessage || !selectedMessage.text) {
      toast.error('لا يمكن تعديل هذه الرسالة');
      return;
    }

    if (selectedMessage.senderId !== user?.id) {
      toast.error('يمكنك تعديل رسائلك فقط');
      return;
    }
    
    setIsEditingMessage(true);
    setEditingMessageId(selectedMessage.id);
    
    // تأكد من أن النتيجة النصية صحيحة
    const messageContent = selectedMessage.text || '';
    
    if (setNewMessage && typeof setNewMessage === 'function') {
      setNewMessage(messageContent);
    }
    
    // التركيز على حقل الإدخال
    if (inputRef?.current) {
      try {
        inputRef.current.focus();
        
        // وضع المؤشر في نهاية النص
        const input = inputRef.current;
        const textLength = messageContent.length;
        input.setSelectionRange(textLength, textLength);
        
      } catch (error) {
        console.warn('Failed to focus input:', error);
      }
    }
  }, [isEditingMessage, selectedMessage, user?.id, setNewMessage, inputRef, setIsEditingMessage, setEditingMessageId]);

  // دالة إلغاء التعديل
  const handleCancelEdit = useCallback(() => {
    setIsEditingMessage(false);
    setEditingMessageId(null);
    
    if (setNewMessage && typeof setNewMessage === 'function') {
      setNewMessage('');
    }
  }, [setNewMessage, setIsEditingMessage, setEditingMessageId]);

  // دالة حفظ التعديل مع تحديث فوري
  const handleSaveEditWithOptimisticUpdate = useCallback(async (newMessageText: string, originalMessage: Message) => {
    if (!newMessageText.trim() || !originalMessage) {
      toast.error('لا يمكن إرسال رسالة فارغة');      
      handleCancelEdit();
      return;
    }

    if (newMessageText === originalMessage.text) {   
      // لم يتم تغيير النص
      handleCancelEdit();
      return;
    }

    try {
      // محاولة تحديث بسيط للتأكد من أن التحديث يعمل
      const { data, error } = await supabase
        .from('messages')
        .update({ content: newMessageText.trim() })
        .eq('id', originalMessage.id)
        .select('id, content, updated_at');
      
      // التحقق من أن التحديث نجح
      if (error) {
        throw new Error(`فشل في تحديث الرسالة: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        // جرب RPC function إذا كان التحديث المباشر فشل
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('update_message_content', {
            p_message_id: originalMessage.id,
            p_new_content: newMessageText.trim(),
            p_user_id: user?.id
          });
        
        if (rpcError) {
          throw new Error(`فشل في تحديث الرسالة: ${rpcError.message}`);
        }
        
        if (!rpcData) {
          throw new Error('فشل في تحديث الرسالة عبر RPC');
        }
      }
      
      // تحديث cache
      if (onRefreshCache) {
        await onRefreshCache();
      }
      
      toast.success('تم تحديث الرسالة بنجاح');
      handleCancelEdit();

    } catch (error) {
      toast.error('فشل في تحديث الرسالة');
      
      // في حالة الخطأ، نقوم بإعادة تحميل الرسائل
      if (onRefreshCache) {
        await onRefreshCache();
      }
    }
  }, [user?.id, onRefreshCache, handleCancelEdit]);

  return {
    isEditingMessage,
    editingMessageId,
    handleEditMessage, // تعرض رسالة للوضع التحريري
    handleCancelEdit,
    handleSaveEditWithOptimisticUpdate // حفظ التعديل
  };
};