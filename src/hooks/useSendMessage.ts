import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type { Message } from '../types';
import { useShamliInteraction } from './useShamliInteraction';

interface UseSendMessageArgs {
    conversationId: string;
    isOnline: boolean;
    userId?: string;
    newMessage: string;
    editingMessageId: string | null;
    displayedMessages: Message[];
    handleSaveEditWithOptimisticUpdate: (content: string, originalMessage: Message) => Promise<void>;
    handleCancelEdit: () => void;
    clearMessage: () => void;
    focusInput: () => void;
    emitTypingStop: () => void;
    sendText: (text: string, replyTo?: Message) => Promise<void>;
    replyingToMessage?: Message | null;
    onReplySent?: () => void;
}

/**
 * Hook لإدارة إرسال الرسائل
 * 
 * يتعامل مع:
 * - إرسال رسائل جديدة
 * - تعديل رسائل موجودة
 * - التحقق من الاتصال
 * - إدارة حالة الإدخال
 */
export function useSendMessage({
    conversationId,
    isOnline,
    userId,
    newMessage,
    editingMessageId,
    displayedMessages,
    handleSaveEditWithOptimisticUpdate,
    handleCancelEdit,
    clearMessage,
    focusInput,
    emitTypingStop,
    sendText,
    replyingToMessage,
    onReplySent
}: UseSendMessageArgs) {

    // ✨ Shamli: تسجيل التفاعلات
    const { logInteraction } = useShamliInteraction('conversations');

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const messageContent = newMessage.trim();

        // التحقق من الشروط الأساسية
        if (messageContent === '' || !conversationId || !isOnline || !userId) {
            return;
        }

        // إذا كان في وضع التعديل
        if (editingMessageId) {
            const originalMessage = displayedMessages.find(m => m.id === editingMessageId);
            if (originalMessage) {
                await handleSaveEditWithOptimisticUpdate(messageContent, originalMessage);
            } else {
                handleCancelEdit();
            }
            return;
        }

        // مسح الرسالة وإعادة التركيز
        clearMessage();
        focusInput();

        // إرسال الرسالة
        try {
            emitTypingStop();
            // ✅ تمرير رسالة الرد إذا وجدت
            await sendText(messageContent, replyingToMessage || undefined);

            // ✨ Shamli: تسجيل تفاعل ناجح (وزن 2 لإرسال رسالة)
            // TODO: نحتاج طريقة للحصول على otherUserId هنا 
            //logInteraction(otherUserId, 'message', 2);

            if (onReplySent) {
                onReplySent();
            }
        } catch (error) {
            toast.error('فشل إرسال الرسالة');
        }
    }, [
        newMessage,
        conversationId,
        isOnline,
        userId,
        editingMessageId,
        displayedMessages,
        handleSaveEditWithOptimisticUpdate,
        handleCancelEdit,
        clearMessage,
        focusInput,
        emitTypingStop,
        sendText,
        replyingToMessage,
        onReplySent
    ]);

    return { handleSendMessage };
}
