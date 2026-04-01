import { useMemo } from 'react';
import { getCategoryFromConnection } from './useShamliRelationship';
import type { Conversation } from '../types';
import type { ShamliCategory } from '../types/shamli';

/**
 * Hook لترتيب المحادثات بذكاء حسب فئات Shamli
 * 
 * الأولوية:
 * 1. الثابتون (غير مقروءة)
 * 2. الخلّان (غير مقروءة)  
 * 3. دائرة الضوء (غير مقروءة)
 * 4. الثابتون (مقروءة)
 * 5. الخلّان (مقروءة)
 * 6. دائرة الضوء (مقروءة)
 * 7. البعيدون (غير مقروءة)
 * 8. البعيدون (مقروءة)
 * 
 * @param conversations - قائمة المحادثات
 * @param shamliConnections - علاقات Shamli (اختياري - للأداء)
 * @returns المحادثات مرتبة
 */
export const useShamliSortedConversations = (
    conversations: Conversation[],
    userId?: string
) => {
    return useMemo(() => {
        if (!userId) return conversations;

        // نسخ القائمة لتجنب تعديل الأصلية
        const sortedConversations = [...conversations];

        sortedConversations.sort((a, b) => {
            // حساب أولوية المحادثة A
            const priorityA = getConversationPriority(a, userId);
            const priorityB = getConversationPriority(b, userId);

            // الترتيب التنازلي (الأولوية الأعلى أولاً)
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            // في حالة التساوي، نرتب حسب آخر رسالة (الأحدث أولاً)
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        return sortedConversations;
    }, [conversations, userId]);
};

/**
 * حساب أولوية المحادثة
 */
function getConversationPriority(conversation: Conversation, userId: string): number {
    // استخراج المستخدم الآخر
    const otherUserId = conversation.participants.find(id => id !== userId);

    // إذا كانت مجموعة أو لا يوجد مستخدم آخر، أولوية متوسطة
    if (!otherUserId || conversation.participants.length > 2) {
        return conversation.unread ? 500 : 150; // مجموعات لها أولوية متوسطة
    }

    // تحديد الفئة (نفترض أن لدينا connection data في الكاش)
    // للأداء، يمكننا استخدام localStorage أو context
    const category = getCategoryForConversation(otherUserId);

    const categoryWeight = {
        'pinned': 400,
        'khillan': 300,
        'spotlight': 200,
        'distant': 100,
    } as const;

    const baseWeight = categoryWeight[category] || 100;
    const unreadBonus = conversation.unread ? 1000 : 0;

    return baseWeight + unreadBonus;
}

/**
 * Helper لتحديد الفئة من cache/localStorage
 * (يمكن تحسينه لاحقاً باستخدام context أو store)
 */
function getCategoryForConversation(userId: string): ShamliCategory {
    // TODO: يمكن تحسين هذا بالحصول على البيانات من context/store
    // حالياً نرجع 'distant' كـ default
    // في المستقبل، يمكننا استخدام:
    // - const shamliConnection = getShamliConnectionFromCache(userId);
    // - return getCategoryFromConnection(shamliConnection);

    return 'distant';
}
