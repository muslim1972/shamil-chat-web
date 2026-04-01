import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ScheduledMessagesService } from '../services/ScheduledMessagesService';
import type {
    ScheduledMessage,
    CreateScheduledMessageParams
} from '../types/scheduledMessages.types';
import { toast } from 'react-hot-toast';

export const useScheduledMessages = (
    conversationId: string | null,
    userId: string | null
) => {
    const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // جلب الرسائل المجدولة
    const fetchScheduledMessages = useCallback(async () => {
        if (!conversationId || !userId) return;

        try {
            setLoading(true);
            const messages = await ScheduledMessagesService.getScheduledMessages(
                conversationId,
                userId
            );
            setScheduledMessages(messages);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching scheduled messages:', err);
            setError('فشل تحميل الرسائل المجدولة');
        } finally {
            setLoading(false);
        }
    }, [conversationId, userId]);

    // جدولة رسالة جديدة
    const scheduleMessage = useCallback(async (params: CreateScheduledMessageParams) => {
        if (!userId) return;
        try {
            const newMessage = await ScheduledMessagesService.scheduleMessage(params, userId);
            setScheduledMessages((prev) => [...prev, newMessage]);
            toast.success('تم جدولة الرسالة بنجاح');
            return newMessage;
        } catch (err: any) {
            console.error('Error scheduling message:', err);
            if (err.message && err.message.includes('permission denied')) {
                toast.error('ليس لديك صلاحية لجدولة رسائل');
            } else {
                toast.error('فشل جدولة الرسالة');
            }
            throw err;
        }
    }, [userId]);

    // إلغاء رسالة مجدولة
    const cancelScheduledMessage = useCallback(async (messageId: string) => {
        try {
            await ScheduledMessagesService.cancelScheduledMessage(messageId);
            setScheduledMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status: 'cancelled' } : msg
                )
            );
            toast.success('تم إلغاء الرسالة المجدولة');
        } catch (err: any) {
            console.error('Error cancelling scheduled message:', err);
            toast.error('فشل إلغاء الرسالة');
        }
    }, []);

    // تحديث رسالة مجدولة
    const updateScheduledMessage = useCallback(async (
        messageId: string,
        updates: Partial<CreateScheduledMessageParams>
    ) => {
        try {
            const updatedMessage = await ScheduledMessagesService.updateScheduledMessage(messageId, updates);
            setScheduledMessages((prev) =>
                prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
            );
            toast.success('تم تحديث الرسالة المجدولة');
            return updatedMessage;
        } catch (err: any) {
            console.error('Error updating scheduled message:', err);
            toast.error('فشل تحديث الرسالة');
            throw err;
        }
    }, []);

    // حذف رسالة مجدولة
    const deleteScheduledMessage = useCallback(async (messageId: string) => {
        try {
            await ScheduledMessagesService.deleteScheduledMessage(messageId);
            setScheduledMessages((prev) => prev.filter((msg) => msg.id !== messageId));
            toast.success('تم حذف الرسالة المجدولة');
        } catch (err: any) {
            console.error('Error deleting scheduled message:', err);
            toast.error('فشل حذف الرسالة');
        }
    }, []);

    // جلب الرسائل عند التحميل
    useEffect(() => {
        fetchScheduledMessages();
    }, [fetchScheduledMessages]);

    // الاشتراك في التحديثات الفورية
    useEffect(() => {
        if (!conversationId) return;

        // قناة للاستماع لتغيرات الرسائل المجدولة مباشرة
        const scheduledChannel = supabase
            .channel(`scheduled_messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scheduled_messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    // تحديث الحالة فوراً عند وصول حدث
                    if (payload.new && 'id' in payload.new) {
                        setScheduledMessages((prev) => {
                            const newMessage = payload.new as ScheduledMessage;
                            // إذا كانت الرسالة موجودة، نحدثها
                            const exists = prev.find((m) => m.id === newMessage.id);
                            if (exists) {
                                return prev.map((m) => (m.id === newMessage.id ? newMessage : m));
                            }
                            // إذا كانت رسالة جديدة لنفس المحادثة
                            else if (newMessage.conversation_id === conversationId) {
                                return [...prev, newMessage];
                            }
                            return prev;
                        });
                    }
                    // في حالة الحذف أو أحداث أخرى، نعيد الجلب للضمان
                    if (payload.eventType === 'DELETE') {
                        fetchScheduledMessages();
                    }
                }
            )
            .subscribe();

        // ✅ قناة إضافية للاستماع لتحديث المحادثة نفسها
        // لأن النظام يقوم بتحديث conversations.updated_at عند إرسال الرسالة المجدولة
        // هذا يضمن وصول التحديث حتى لو لم يصل حدث scheduled_messages لسبب ما
        const conversationChannel = supabase
            .channel(`conversation_update:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations',
                    filter: `id=eq.${conversationId}`,
                },
                () => {
                    // عند تحديث المحادثة، نعيد جلب الرسائل المجدولة للتأكد
                    fetchScheduledMessages();
                }
            )
            .subscribe();

        return () => {
            if (scheduledChannel) supabase.removeChannel(scheduledChannel);
            if (conversationChannel) supabase.removeChannel(conversationChannel);
        };
    }, [conversationId, fetchScheduledMessages]);

    // الرسائل المجدولة القادمة فقط (pending)
    const pendingMessages = scheduledMessages.filter((msg) => msg.status === 'pending');

    return {
        scheduledMessages,
        pendingMessages,
        loading,
        error,
        scheduleMessage,
        cancelScheduledMessage,
        updateScheduledMessage,
        deleteScheduledMessage,
        refresh: fetchScheduledMessages,
    };
};
