import React from 'react';

interface UnreadMessagesButtonProps {
    showUnread: boolean;
    unreadCount: number;
    formHeight: number;
    onClearUnread: () => void;
    onScrollToBottom: (smooth: boolean) => void;
}

/**
 * زر عرض الرسائل غير المقروءة
 * 
 * يظهر عندما يكون هناك رسائل جديدة غير مقروءة
 * يسمح للمستخدم بالانتقال السريع إلى أحدث الرسائل
 */
export const UnreadMessagesButton: React.FC<UnreadMessagesButtonProps> = ({
    showUnread,
    unreadCount,
    formHeight,
    onClearUnread,
    onScrollToBottom
}) => {
    if (!showUnread || unreadCount === 0) return null;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClearUnread();
        onScrollToBottom(true);
    };

    return (
        <button
            onClick={handleClick}
            className="absolute left-4 z-[200] bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow hover:bg-blue-200 text-xs"
            style={{ bottom: Math.max(formHeight + 16, 72) }}
            title="الانتقال إلى أحدث الرسائل"
        >
            {unreadCount} رسائل جديدة
        </button>
    );
};
