import React, { memo } from 'react';
import type { Message } from '../../types';

interface MessageStatusDotProps {
    status?: Message['status'];
    isRead?: boolean;
    isDeleted?: boolean;
    isSenderDeleted?: boolean; // ✅ للرسائل المحذوفة من المرسل
    isOwnMessage: boolean;
    className?: string; // للسماح بتنسيق خارجي إضافي
}

export const MessageStatusDot: React.FC<MessageStatusDotProps> = memo(({
    status,
    isRead,
    isDeleted,
    isSenderDeleted,
    isOwnMessage,
    className = ''
}) => {
    // 1. حالة الحذف (الأولوية القصوى)
    // ✅ نعرض نقطة حمراء سواء كانت محذوفة للجميع أو محذوفة من المرسل
    if (isDeleted || isSenderDeleted) {
        return (
            <div
                className={`w-2 h-2 rounded-full bg-red-500 cursor-help ${className}`}
                title={isSenderDeleted ? "رسالة محذوفة من المرسل" : "رسالة محذوفة"}
            />
        );
    }

    // إذا لم تكن رسالتي، لا نعرض مؤشرات (إلا الحذف أعلاه)
    if (!isOwnMessage) return null;

    // 2. حالة القراءة
    if (isRead) {
        return (
            <div
                className={`w-2 h-2 rounded-full bg-green-500 shadow-sm ${className}`}
                title="تمت القراءة"
            />
        );
    }

    // 3. حالة الإرسال
    switch (status) {
        case 'sending':
        case 'pending':
            return (
                <div
                    className={`w-2 h-2 rounded-full bg-gray-400 animate-pulse ${className}`}
                    title="جاري الإرسال..."
                />
            );
        case 'sent':
            return (
                <div
                    className={`w-2 h-2 rounded-full bg-black dark:bg-white shadow-sm ${className}`}
                    title="تم الإرسال"
                />
            );
        case 'failed':
            return (
                <div
                    className={`w-2 h-2 rounded-full bg-red-600 cursor-pointer ${className}`}
                    title="فشل الإرسال (انقر لإعادة المحاولة)"
                />
            );
        default:
            // حالة افتراضية (مثلاً رسائل قديمة لا تملك status) - نعتبرها مرسلة
            return (
                <div
                    className={`w-2 h-2 rounded-full bg-black dark:bg-white shadow-sm ${className}`}
                />
            );
    }
});

MessageStatusDot.displayName = 'MessageStatusDot';
