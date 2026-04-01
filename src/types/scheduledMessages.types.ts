// Types لجدولة الرسائل

export type ScheduledMessageStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

export type ScheduledMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

export interface ScheduledMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    recipient_id: string;

    // محتوى الرسالة
    content: string | null;
    message_type: ScheduledMessageType;
    media_url: string | null;
    media_thumbnail: string | null;

    // الجدولة
    scheduled_for: string; // ISO timestamp
    created_at: string;

    // الحالة
    status: ScheduledMessageStatus;
    sent_at: string | null;
    error_message: string | null;

    // Metadata
    metadata?: {
        location?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
        file_name?: string;
        file_size?: number;
        duration?: number; // للصوتيات والفيديوهات
        [key: string]: any;
    };
}

export interface CreateScheduledMessageParams {
    conversation_id: string;
    recipient_id: string;
    content: string | null;
    message_type: ScheduledMessageType;
    media_url: string | null;
    media_thumbnail: string | null;
    scheduled_for: Date;
    metadata?: ScheduledMessage['metadata'];
}

export interface QuickScheduleOption {
    id: string;
    label: string;
    icon: string;
    getDateTime: () => Date;
}
