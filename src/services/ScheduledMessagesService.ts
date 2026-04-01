import { supabase } from './supabase';
import type {
    ScheduledMessage,
    CreateScheduledMessageParams,
    ScheduledMessageStatus
} from '../types/scheduledMessages.types';

export class ScheduledMessagesService {
    /**
     * جدولة رسالة جديدة
     */
    static async scheduleMessage(
        params: CreateScheduledMessageParams,
        senderId: string
    ): Promise<ScheduledMessage> {
        const { data, error } = await supabase
            .from('scheduled_messages')
            .insert({
                conversation_id: params.conversation_id,
                sender_id: senderId,
                recipient_id: params.recipient_id,
                content: params.content,
                message_type: params.message_type,
                media_url: params.media_url,
                media_thumbnail: params.media_thumbnail,
                scheduled_for: params.scheduled_for,
                metadata: params.metadata || {},
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * جلب الرسائل المجدولة لمحادثة معينة
     */
    static async getScheduledMessages(
        conversationId: string,
        userId: string
    ): Promise<ScheduledMessage[]> {
        const { data, error } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('sender_id', userId)
            .in('status', ['pending', 'sent'])
            .order('scheduled_for', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * إلغاء رسالة مجدولة
     */
    static async cancelScheduledMessage(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('scheduled_messages')
            .update({ status: 'cancelled' as ScheduledMessageStatus })
            .eq('id', messageId)
            .eq('status', 'pending');

        if (error) throw error;
    }

    /**
     * تحديث رسالة مجدولة
     */
    static async updateScheduledMessage(
        messageId: string,
        updates: Partial<CreateScheduledMessageParams>
    ): Promise<ScheduledMessage> {
        const updateData: any = {};

        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for.toISOString();
        if (updates.metadata) updateData.metadata = updates.metadata;

        const { data, error } = await supabase
            .from('scheduled_messages')
            .update(updateData)
            .eq('id', messageId)
            .eq('status', 'pending')
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * حذف رسالة مجدولة
     */
    static async deleteScheduledMessage(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('scheduled_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    }

    /**
     * الاشتراك في تحديثات الرسائل المجدولة
     */
    static subscribeToScheduledMessages(
        conversationId: string,
        callback: (message: ScheduledMessage) => void
    ) {
        return supabase
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
                    if (payload.new) {
                        callback(payload.new as ScheduledMessage);
                    }
                }
            )
            .subscribe();
    }
}
