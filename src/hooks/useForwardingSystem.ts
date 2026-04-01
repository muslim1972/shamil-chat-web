import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Message } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * نظام موحد شامل لإعادة توجيه الرسائل
 * 🔥 يجمع جميع عمليات forwarding في مكان واحد لتجنب التعارضات
 */
export const useForwardingSystem = () => {
  const navigate = useNavigate();

  // 🔥 دالة موحدة للتعرف على رسائل الموقع
  const isLocationMessage = useCallback((msg: Message | any): boolean => {
    const messageType = msg.message_type || 'text';
    const text = msg.text || msg.content || '';
    
    // نفس regex في كل مكان - لتجنب التضارب
    return messageType === 'location' || 
           /^geo:|^https?:\/\/maps\./i.test(text) || 
           /^📍\s*موقعي\s*الحالي/i.test(text) ||
           /[📍🚩].*\d+\.\d+.*,\s*\d+\.\d+/.test(text);
  }, []);

  // 🔥 دالة موحدة لتحديد نوع إعادة التوجيه
  const determineForwardingMode = useCallback((messages: Message[]): 'block' | 'direct' => {
    if (messages.length === 0) return 'block';
    
    const messageTypes = messages.map(m => m.message_type || 'text');
    const hasMedia = messageTypes.some(type => ['image', 'video', 'audio', 'file'].includes(type));
    const hasLocation = messages.some(m => isLocationMessage(m));
    
    return (hasMedia || hasLocation) ? 'direct' : 'block';
  }, [isLocationMessage]);

  // 🔥 دالة تنفيذ إعادة التوجيه الفعلية
  const executeForwarding = useCallback(async (
    messages: Message[], 
    targetConversationId: string,
    currentUserId: string,
    forwardedMode?: 'block' | 'direct'
  ) => {
    if (messages.length === 0) return false;

    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const mode = forwardedMode || determineForwardingMode(messages);
    const singleMessage = sortedMessages[0];
    const isLocation = isLocationMessage(singleMessage);

    // تحديد ما إذا كانت رسالة واحدة غير نصية
    const isSingleNonTextMessage = sortedMessages.length === 1 &&
      !['text', 'aggregated', 'forwarded_block'].includes(singleMessage.message_type || 'text') &&
      !isLocation;

    try {
      if (isSingleNonTextMessage) {
        // إعادة توجيه رسالة واحدة (موقع، صورة، فيديو، إلخ)
        const { error } = await supabase.from('messages').insert({
          conversation_id: targetConversationId,
          sender_id: currentUserId,
          content: singleMessage.content || singleMessage.text,
          message_type: singleMessage.message_type,
          caption: singleMessage.caption,
          media_metadata: singleMessage.media_metadata,
          forwarded_from_message_id: singleMessage.id,
        });
        if (error) throw error;
      } else if (mode === 'block') {
        // إنشاء فقاعة مجمعة
        const payloadMessages = sortedMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          timestamp: m.timestamp,
          message_type: m.message_type,
          text: m.text || m.content,
          caption: m.caption || null,
          media_metadata: m.media_metadata || null,
          // حفظ محاذاة العرض وقت التوجيه
          isOwn: typeof (m as any).isOwn === 'boolean' ? (m as any).isOwn : (m.senderId === currentUserId),
          display: (m as any).display || {
            alignment: (m as any).isOwn ? 'right' : (m.senderId === currentUserId ? 'right' : 'left'),
            bgClass: (m as any).display?.bgClass || (m.senderId === currentUserId ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800 shadow-sm'),
            textClass: (m as any).display?.textClass || (m.senderId === currentUserId ? 'text-indigo-200' : 'text-gray-500'),
          }
        }));

        const { error } = await supabase.from('messages').insert({
          conversation_id: targetConversationId,
          sender_id: currentUserId,
          content: JSON.stringify(payloadMessages),
          message_type: 'forwarded_block',
          caption: null,
          media_metadata: null,
        });
        if (error) throw error;
      } else {
        // إعادة توجيه فردي للـ direct mode
        for (const message of sortedMessages) {
          const { error } = await supabase.from('messages').insert({
            conversation_id: targetConversationId,
            sender_id: currentUserId,
            content: message.text || message.content,
            message_type: message.message_type,
            caption: message.caption,
            media_metadata: message.media_metadata,
            forwarded_from_message_id: message.id,
          });
          if (error) throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('خطأ في إعادة التوجيه:', error);
      toast.error('فشل في إعادة توجيه الرسائل');
      return false;
    }
  }, [isLocationMessage, determineForwardingMode]);

  // 🔥 دالة مساعدة لبدء عملية إعادة التوجيه من UI
  const startForwarding = useCallback((messages: Message[]) => {
    if (messages.length === 0) return;
    
    const mode = determineForwardingMode(messages);
    
    // إرسال event للتوافق مع النظام الحالي
    window.dispatchEvent(new CustomEvent('forward-messages', { 
      detail: { messages, mode } 
    }));
  }, [determineForwardingMode]);

  return {
    // الدوال الأساسية
    isLocationMessage,
    determineForwardingMode,
    executeForwarding,
    startForwarding,
    
    // للـ compatibility مع النظام الحالي
    forwardMessagesToConversation: executeForwarding,
    cancelForwarding: () => { /* يمكن إضافة logic للإلغاء */ }
  };
};