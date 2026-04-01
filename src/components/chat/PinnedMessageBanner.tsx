import React from 'react';
import { Pin, X } from 'lucide-react';
import type { Message } from '../../types';

interface PinnedMessageBannerProps {
    pinnedMessage: Message | null;
    userId?: string;
    onScrollToMessage: (messageId: string) => void;
    onUnpinMessage: () => void;
}

/**
 * مكون لعرض بانر الرسالة المثبتة
 * 
 * يعرض رسالة مثبتة في أعلى الدردشة مع:
 * - إمكانية النقر للانتقال للرسالة
 * - زر إلغاء التثبيت (للمرسل فقط)
 * - تصميم جذاب مع ألوان indigo
 */
export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
    pinnedMessage,
    userId,
    onScrollToMessage,
    onUnpinMessage
}) => {
    if (!pinnedMessage) return null;

    const handleBannerClick = () => {
        onScrollToMessage(pinnedMessage.id);
    };

    const handleUnpinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUnpinMessage();
    };

    const isOwner = userId && pinnedMessage.senderId === userId;

    return (
        <div
            className="bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-300 dark:border-indigo-700 p-3 flex justify-between items-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
            onClick={handleBannerClick}
        >
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <Pin size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                        رسالة مثبتة
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {pinnedMessage.text || pinnedMessage.content}
                    </p>
                </div>
            </div>
            {isOwner && (
                <button
                    onClick={handleUnpinClick}
                    className="p-1.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 ml-2 flex-shrink-0"
                    title="إلغاء التثبيت"
                >
                    <X size={18} className="text-indigo-600 dark:text-indigo-400" />
                </button>
            )}
        </div>
    );
};
