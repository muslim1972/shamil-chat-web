import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface UseConversationItemProps {
    conversationId: string;
    onLongPress: (target: EventTarget | null) => void;
}

interface UseConversationItemReturn {
    isGroup: boolean;
    participants: any[];
    handleLongPress: (target: EventTarget | null) => void;
}

/**
 * هوك مشترك لإدارة منطق بطاقة المحادثة
 * يجلب معلومات المجموعة ويدير Long Press
 * 
 * @param conversationId - معرّف المحادثة
 * @param onLongPress - دالة عند Long Press
 * @returns isGroup, participants, handleLongPress
 */
export function useConversationItem({
    conversationId,
    onLongPress,
}: UseConversationItemProps): UseConversationItemReturn {
    const [isGroup, setIsGroup] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);

    // جلب معلومات المجموعة
    useEffect(() => {
        const fetchGroupInfo = async () => {
            try {
                const { data } = await supabase
                    .from('conversations')
                    .select('is_group, participants')
                    .eq('id', conversationId)
                    .single();

                if (data?.is_group) {
                    setIsGroup(true);

                    // جلب بيانات المشاركين
                    const { data: usersData } = await supabase
                        .from('users')
                        .select('id, username, avatar_url')
                        .in('id', data.participants);

                    if (usersData) {
                        setParticipants(usersData);
                    }
                }
            } catch (error) {
                console.error('Error fetching group info:', error);
            }
        };

        fetchGroupInfo();
    }, [conversationId]);

    // تحسين الأداء: استخدام useCallback للوظيفة
    const handleLongPress = useCallback((target: EventTarget | null) => {
        onLongPress(target);
    }, [onLongPress]);

    return {
        isGroup,
        participants,
        handleLongPress,
    };
}
