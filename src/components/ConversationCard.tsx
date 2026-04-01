import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import useLongPress from '../hooks/useLongPress';
import { summarizeMessage } from '../utils/messagePreview';
import type { Conversation } from '../types';
import { useShamliRelationship } from '../hooks/useShamliRelationship';
import { ShamliAvatar } from './shamli/ShamliAvatar';
import { getShamliColor } from '../constants/shamliColors';

interface ConversationCardProps {
    conversation: Conversation;
    isSelected: boolean;
    onClick: (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
    onLongPress: (target: EventTarget | null) => void;
    isForwarding?: boolean;
    groupAvatarComponent?: React.ReactNode; // للمجموعات
    showGroupLabel?: boolean; // عرض "محادثة جماعية" بدلاً من الاسم
    disablePointerEvents?: boolean; // للمحادثات المؤرشفة
    isOnline?: boolean; // حالة الاتصال
    userId?: string; // ✅ معرف المستخدم الحالي للتفريق بين الرسائل المرسلة والمستلمة
    otherUserId?: string; // ✨ معرف المستخدم الآخر للحصول على علاقة Shamli
}

/**
 * مكون مشترك لعرض بطاقة المحادثة
 * يُستخدم في: ConversationListScreen, ArchivedConversationsScreen
 * 
 * @param conversation - بيانات المحادثة
 * @param isSelected - هل المحادثة محددة
 * @param onClick - دالة عند النقر
 * @param onLongPress - دالة عند Long Press
 * @param isForwarding - هل في وضع التحويل (اختياري)
 * @param groupAvatarComponent - مكون الأفاتار للمجموعات (اختياري)
 * @param showGroupLabel - عرض تسمية "محادثة جماعية" (اختياري)
 * @param disablePointerEvents - تعطيل pointer events للعناصر الداخلية (اختياري)
 * @param userId - معرف المستخدم الحالي (اختياري)
 */
export const ConversationCard: React.FC<ConversationCardProps> = React.memo(({
    conversation,
    isSelected,
    onClick,
    onLongPress,
    isForwarding = false,
    groupAvatarComponent,
    showGroupLabel = false,
    disablePointerEvents = false,
    isOnline = false,
    userId,
    otherUserId,
}) => {
    // ✨ Shamli Integration: الحصول على فئة العلاقة
    const { category, loading: shamliLoading } = useShamliRelationship(otherUserId);
    // تنسيق التاريخ
    const formattedTimestamp = useMemo(() => {
        if (!conversation.timestamp) return '';
        try {
            return formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true, locale: ar });
        } catch (error) {
            console.error("Error formatting date:", error);
            return '';
        }
    }, [conversation.timestamp]);

    // Long Press Handler
    const longPressEvents = useLongPress(
        (target) => onLongPress(target),
        onClick,
        undefined, // ✅ لا نحتاج onDoubleClick هنا
        { delay: 500 }
    );

    // تنسيق آخر رسالة - مع التفريق بين المرسلة والمستلمة
    const lastMessageDisplay = useMemo(() => {
        const meta = (conversation as any).lastMessageMeta;
        // ✅ التحقق هل الرسالة من المستخدم الحالي
        const isFromMe = meta?.sender_id && userId ? meta.sender_id === userId : false;

        if (meta) {
            return summarizeMessage(meta, isFromMe);
        }
        if (conversation.lastMessage && typeof conversation.lastMessage === 'object') {
            return summarizeMessage(conversation.lastMessage, isFromMe);
        }
        return conversation.lastMessage || 'لا توجد رسائل بعد';
    }, [conversation.lastMessage, (conversation as any).lastMessageMeta, userId]);

    // ✨ Shamli: تحديد ألوان البطاقة حسب الفئة
    const shamliColors = category !== 'distant' ? getShamliColor(category) : null;
    const cardBorderStyle = shamliColors ? {
        borderRight: `4px solid ${shamliColors.solid}`,
        boxShadow: conversation.unread ? `0 2px 8px ${shamliColors.shadow}` : undefined,
    } : {};

    return (
        <div
            className={`p-3 sm:p-4 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-200 border-b border-slate-200 dark:border-slate-700 ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            data-id={conversation.id}
            style={cardBorderStyle}
            {...(isForwarding ? { onClick } : longPressEvents)}
        >
            <div className={`flex items-center space-x-4 rtl:space-x-reverse ${disablePointerEvents ? 'pointer-events-none' : ''}`}>
                {/* Avatar Section with Shamli Ring */}
                <div className="flex-shrink-0">
                    {groupAvatarComponent || (
                        <ShamliAvatar
                            avatarUrl={conversation.avatar_url}
                            username={conversation.name || 'مستخدم'}
                            category={category}
                            size={48}
                            showRing={!shamliLoading && category !== 'distant'}
                        />
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <p className={`text-sm font-semibold truncate ${conversation.unread ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-50'}`}>
                                {showGroupLabel ? 'محادثة جماعية' : (conversation.name || 'مستخدم غير معروف')}
                            </p>
                            {/* Online Indicator */}
                            {isOnline && (
                                <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm ring-2 ring-white dark:ring-slate-800" title="متصل الآن"></div>
                            )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                            {formattedTimestamp}
                        </span>
                    </div>
                    <p className={`text-sm truncate ${conversation.unread ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-700 dark:text-slate-400'}`}>
                        {lastMessageDisplay}
                    </p>
                </div>

                {/* Unread Count Badge */}
                {conversation.unread && (conversation.unreadCount || 0) > 0 && (
                    <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-sm">
                        {conversation.unreadCount}
                    </div>
                )}
            </div>
        </div>
    );
});

ConversationCard.displayName = 'ConversationCard';
