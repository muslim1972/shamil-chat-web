import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface MessageExtras {
    reactions: Record<string, string>; // { userId: emoji }
    buzz_count: number;
}

export function useChatExtras(messageIds: string[]) {
    const [extras, setExtras] = useState<Record<string, MessageExtras>>({});

    // 1. جلب البيانات الأولية (Fetch)
    const fetchExtras = useCallback(async () => {
        if (messageIds.length === 0) return;

        try {
            // جلب التفاعلات من الجدول الجديد
            const { data: reactionsData } = await supabase
                .from('message_reactions_extra')
                .select('message_id, user_id, emoji')
                .in('message_id', messageIds);

            // جلب العدادات من الجدول الجديد
            const { data: buzzData } = await supabase
                .from('urgent_alert_counters')
                .select('message_id, count')
                .in('message_id', messageIds);

            const newExtras: Record<string, MessageExtras> = {};

            // دمج التفاعلات
            reactionsData?.forEach(row => {
                if (!newExtras[row.message_id]) {
                    newExtras[row.message_id] = { reactions: {}, buzz_count: 1 };
                }
                newExtras[row.message_id].reactions[row.user_id] = row.emoji;
            });

            // دمج عدادات الـ Buzz
            buzzData?.forEach(row => {
                if (!newExtras[row.message_id]) {
                    newExtras[row.message_id] = { reactions: {}, buzz_count: 1 };
                }
                newExtras[row.message_id].buzz_count = row.count;
            });

            setExtras(newExtras);
        } catch (error) {
            console.error('Error fetching chat extras:', error);
        }
    }, [messageIds]);

    useEffect(() => {
        fetchExtras();
    }, [fetchExtras]);

    // 2. الاشتراك في التحديثات الفورية (Realtime)
    useEffect(() => {
        if (messageIds.length === 0) return;

        const channel = supabase
            .channel('chat_extras_realtime')
            // مراقبة التفاعلات
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_reactions_extra'
            }, (payload) => {
                const row: any = payload.new || payload.old;
                if (!messageIds.includes(row.message_id)) return;

                setExtras(prev => {
                    const next = { ...prev };
                    const msgId = row.message_id;
                    if (!next[msgId]) next[msgId] = { reactions: {}, buzz_count: 1 };
                    
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        next[msgId].reactions = { ...next[msgId].reactions, [row.user_id]: row.emoji };
                    } else if (payload.eventType === 'DELETE') {
                        const { [row.user_id]: _, ...rest } = next[msgId].reactions;
                        next[msgId].reactions = rest;
                    }
                    return next;
                });
            })
            // مراقبة الـ Buzz
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'urgent_alert_counters'
            }, (payload) => {
                const row: any = payload.new;
                if (!row || !messageIds.includes(row.message_id)) return;

                setExtras(prev => {
                    const next = { ...prev };
                    const msgId = row.message_id;
                    if (!next[msgId]) next[msgId] = { reactions: {}, buzz_count: 1 };
                    next[msgId].buzz_count = row.count;
                    return next;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [messageIds]);

    return extras;
}
