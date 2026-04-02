import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface MessageExtras {
    reactions: Record<string, string>; // { userId: emoji }
    buzz_count: number;
}

export function useChatExtras(messageIds: string[], conversationId?: string) {
    const [extras, setExtras] = useState<Record<string, MessageExtras>>({});
    const messageIdsRef = useRef(messageIds);
    const { user } = useAuth();

    // تحديث المرجع عند تغير المعرفات
    useEffect(() => {
        messageIdsRef.current = messageIds;
    }, [messageIds]);

    // 1. جلب البيانات الأولية (Fetch)
    const fetchExtras = useCallback(async () => {
        const validIds = messageIds.filter(id => id && !id.startsWith('temp_'));
        if (validIds.length === 0) return;

        try {
            const { data: reactionsData } = await supabase
                .from('message_reactions_extra')
                .select('message_id, user_id, emoji')
                .in('message_id', validIds);

            const { data: buzzData } = await supabase
                .from('urgent_alert_counters')
                .select('message_id, count')
                .in('message_id', validIds);

            const newExtras: Record<string, MessageExtras> = {};

            reactionsData?.forEach(row => {
                if (!newExtras[row.message_id]) {
                    newExtras[row.message_id] = { reactions: {}, buzz_count: 1 };
                }
                newExtras[row.message_id].reactions[row.user_id] = row.emoji;
            });

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

    // 2. الاشتراك في التحديثات الفورية (Realtime DB + Broadcast)
    useEffect(() => {
        if (!user || !conversationId) return;

        const channelId = `chat_extras:${conversationId}`;
        console.log(`📡 [ChatExtras] Initializing channel: ${channelId}`);
        
        const channel = supabase.channel(channelId, {
            config: {
                broadcast: { self: true }
            }
        })
            // أ. الاستماع لتغييرات قاعدة البيانات (Postgres)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_reactions_extra'
            }, (payload) => {
                const row: any = payload.new || payload.old;
                if (!row || !messageIdsRef.current.includes(row.message_id)) return;

                console.log('✨ [ChatExtras:DB] Reaction change:', payload.eventType, row.message_id);

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
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'urgent_alert_counters'
            }, (payload) => {
                const row: any = payload.new;
                if (!row || !messageIdsRef.current.includes(row.message_id)) return;

                console.log('🔔 [ChatExtras:DB] Buzz change:', row.message_id, row.count);

                setExtras(prev => {
                    const next = { ...prev };
                    const msgId = row.message_id;
                    if (!next[msgId]) next[msgId] = { reactions: {}, buzz_count: 1 };
                    next[msgId].buzz_count = row.count;
                    return next;
                });
            })
            // ب. الاستماع للبث المباشر (Broadcast) للسرعة
            .on('broadcast', { event: 'reaction_update' }, ({ payload }) => {
                if (!payload || !messageIdsRef.current.includes(payload.message_id)) return;
                console.log('🚀 [ChatExtras:Broadcast] Reaction received:', payload.message_id);
                
                setExtras(prev => {
                    const next = { ...prev };
                    const msgId = payload.message_id;
                    if (!next[msgId]) next[msgId] = { reactions: {}, buzz_count: 1 };
                    
                    if (payload.action === 'add') {
                        next[msgId].reactions = { ...next[msgId].reactions, [payload.user_id]: payload.emoji };
                    } else if (payload.action === 'remove') {
                        const { [payload.user_id]: _, ...rest } = next[msgId].reactions;
                        next[msgId].reactions = rest;
                    }
                    return next;
                });
            })
            .on('broadcast', { event: 'buzz_update' }, ({ payload }) => {
                if (!payload || !messageIdsRef.current.includes(payload.message_id)) return;
                console.log('🚀 [ChatExtras:Broadcast] Buzz received:', payload.message_id);
                
                setExtras(prev => {
                    const next = { ...prev };
                    const msgId = payload.message_id;
                    if (!next[msgId]) next[msgId] = { reactions: {}, buzz_count: 1 };
                    next[msgId].buzz_count = payload.count;
                    return next;
                });
            })
            .subscribe((status) => {
                console.log('📡 [ChatExtras] Subscription status:', status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [ChatExtras] Subscription error occurred');
                }
            });

        return () => {
            console.log('🔌 [ChatExtras] Removing channel:', channelId);
            supabase.removeChannel(channel);
        };
    }, [user?.id, conversationId]); // إعادة التهيئة عند تغير المستخدم أو المحادثة

    return extras;
}
