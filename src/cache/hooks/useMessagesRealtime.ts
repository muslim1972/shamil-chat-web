// useMessagesRealtime Hook
// مسؤول عن Realtime subscriptions للرسائل

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import type { CachedMessage } from '../types/cacheTypes';
import { CACHE_CONFIG } from '../core/CacheConfig';
import { CacheStrategy } from '../core/CacheStrategy';

const REALTIME_DELAY = CACHE_CONFIG.REALTIME_BATCH_DELAY_MS;


interface UseMessagesRealtimeProps {
    conversationId: string;
    userId: string;
    isComplete: boolean;
    messagesRef: React.MutableRefObject<CachedMessage[]>;
    setMessages: React.Dispatch<React.SetStateAction<CachedMessage[]>>;
    addToMediaQueue: (msgId: string) => void;
    processMediaQueue: (messagesRef: React.MutableRefObject<CachedMessage[]>, setMessages: React.Dispatch<React.SetStateAction<CachedMessage[]>>) => Promise<void>;
}

export const useMessagesRealtime = ({
    conversationId,
    userId,
    isComplete,
    messagesRef,
    setMessages,
    addToMediaQueue,
    processMediaQueue
}: UseMessagesRealtimeProps) => {

    // ✅ تم إزالة logs التتبع لتحسين الأداء

    // Batch realtime mutations to reduce flicker
    const pendingMutationsRef = useRef<Array<(arr: CachedMessage[]) => CachedMessage[]>>([]);
    const batchTimerRef = useRef<number | null>(null);

    const enqueueMutation = useCallback((mutate: (arr: CachedMessage[]) => CachedMessage[]) => {
        pendingMutationsRef.current.push(mutate);
        if (batchTimerRef.current != null) return;
        batchTimerRef.current = window.setTimeout(() => {
            const mutations = pendingMutationsRef.current.splice(0);
            batchTimerRef.current = null;
            if (mutations.length === 0) return;

            const base = messagesRef.current;
            // ✅ حفظ isRead من الـ base قبل تطبيق mutations
            const baseIsReadMap = new Map(base.map(m => [m.id, (m as any).isRead]));

            let result = base;
            for (const m of mutations) {
                result = m(result);
            }

            // ✅ استعادة isRead من الـ base بعد تطبيق mutations
            result = result.map(msg => ({
                ...msg,
                isRead: baseIsReadMap.has(msg.id) ? baseIsReadMap.get(msg.id) : (msg as any).isRead
            })) as CachedMessage[];

            if (result !== base) {
                messagesRef.current = result;
                setMessages(result);
            }
        }, REALTIME_DELAY);
    }, [messagesRef, setMessages]);

    // Real-time subscription - محسّن
    useEffect(() => {
        if (!conversationId || !isComplete) return;

        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, async (payload) => {
                // Event received - processed silently

                try { /* تم حذف رسائل الكونسول */ } catch (e) { }

                if (payload.eventType === 'INSERT') {
                    try {
                        const row: any = payload.new;

                        // استخراج بيانات المرسل من media_metadata (إذا وجدت) أو من row مباشرة
                        const meta = row.media_metadata || {};
                        const senderUsername = meta.sender_username || row.sender_username || 'مستخدم';
                        const senderAvatarUrl = meta.sender_avatar_url || row.sender_avatar_url;

                        // ✅ معالجة الرد (reply_to_message)
                        let replyToMessage = null;
                        if (row.reply_to) {
                            // أولاً: محاولة استخراج من reply_snapshot في media_metadata
                            if (meta.reply_snapshot) {
                                replyToMessage = {
                                    id: meta.reply_snapshot.id,
                                    text: meta.reply_snapshot.text,
                                    message_type: meta.reply_snapshot.message_type,
                                    sender_username: meta.reply_snapshot.sender_username,
                                    sender: { username: meta.reply_snapshot.sender_username }
                                };
                            } else {
                                // ثانياً: جلب من قاعدة البيانات إذا لم يكن في snapshot
                                try {
                                    const { data: replyData } = await supabase
                                        .from('messages')
                                        .select('id, content, message_type, sender:sender_id(username)')
                                        .eq('id', row.reply_to)
                                        .single();

                                    if (replyData) {
                                        // ✅ إصلاح: sender قد يكون array، نأخذ العنصر الأول
                                        const senderObj = Array.isArray(replyData.sender)
                                            ? replyData.sender[0]
                                            : replyData.sender;

                                        replyToMessage = {
                                            id: replyData.id,
                                            text: replyData.content,
                                            message_type: replyData.message_type,
                                            sender_username: senderObj?.username || 'مستخدم',
                                            sender: { username: senderObj?.username || 'مستخدم' }
                                        };
                                    }
                                } catch (e) {
                                    console.warn('[Realtime] فشل جلب reply_to_message:', e);
                                }
                            }
                        }

                        const incoming: CachedMessage = {
                            id: row.id,
                            conversationId: row.conversation_id,
                            text: row.content,
                            content: row.content,
                            senderId: row.sender_id,
                            timestamp: new Date(row.created_at).toISOString(),
                            message_type: row.message_type,
                            caption: row.caption,
                            media_metadata: row.media_metadata,
                            signedUrl: null,
                            status: 'sent',
                            isRead: false, // ✅ Default for new messages
                            sender: {
                                id: row.sender_id,
                                username: senderUsername,
                                avatar_url: senderAvatarUrl
                            },
                            reply_to: row.reply_to, // ✅ إضافة
                            reply_to_message: replyToMessage // ✅ إضافة
                        } as any;

                        enqueueMutation(prev => {
                            if (prev.some(m => m.id === incoming.id)) return prev;
                            const next = [...prev, incoming];
                            if (['image', 'video'].includes(row.message_type)) {
                                addToMediaQueue(row.id);
                                setTimeout(() => processMediaQueue(messagesRef, setMessages), 100);
                            }
                            return next;
                        });

                        // ✅ إذا كانت الرسالة من شخص آخر → mark as read تلقائياً
                        if (row.sender_id !== userId) {
                            try {
                                const { error: rpcError } = await supabase.rpc('mark_conversation_read_v3', {
                                    p_conversation_id: conversationId
                                });
                                if (rpcError) throw rpcError;
                            } catch (e) {
                                console.warn('[Realtime] Failed to mark as read:', e);
                            }
                        }
                    } catch (e) { console.warn('[Realtime] INSERT failed:', e); }

                } else if (payload.eventType === 'UPDATE') {
                    const row: any = payload.new;

                    // UPDATE: تحديث الرسالة في الكاش

                    // ✅ عند الحذف: نُبقي الرسالة مع isDeleted=true لعرض النقطة الحمراء
                    // بدلاً من إزالتها من الكاش
                    enqueueMutation(prev => {
                        const idx = prev.findIndex(m => m.id === row.id);
                        if (idx === -1) {
                            // رسالة غير موجودة في الكاش
                            return prev;
                        }
                        const next = [...prev];
                        next[idx] = {
                            ...next[idx],
                            text: row.content,
                            caption: row.caption,
                            media_metadata: row.media_metadata,
                            isRead: row.is_read, // ✅ تحديث حالة القراءة
                            isDeleted: row.is_deleted || row.deleted_for_all // ✅ تحديث حالة الحذف
                        } as any;

                        // تم تحديث الرسالة في الكاش (Realtime)

                        // ✅ حفظ التحديث في IndexedDB للاحتفاظ به (مهم للمستلمين!)
                        setTimeout(async () => {
                            try {
                                const toSave = next.map((m: any) => {
                                    const copy = { ...m };
                                    delete copy.signedUrl;
                                    delete copy.thumbnail;
                                    return copy;
                                });
                                await CacheStrategy.saveMessages(conversationId, toSave);
                                // تم حفظ التحديث في IndexedDB (Realtime)
                            } catch (e) {
                                console.warn('⚠️ فشل حفظ التحديث:', e);
                            }
                        }, 100);

                        return next;
                    });


                } else if (payload.eventType === 'DELETE') {
                    const row: any = payload.old || payload.new;
                    // ✅ عند الحذف: نُبقي الرسالة مع isDeleted=true لعرض النقطة الحمراء
                    enqueueMutation(prev => {
                        const idx = prev.findIndex(m => m.id === row.id);
                        if (idx === -1) return prev;
                        const next = [...prev];
                        next[idx] = {
                            ...next[idx],
                            isDeleted: true // ✅ تأكيد الحذف
                        } as any;

                        // ✅ حفظ حالة الحذف في IndexedDB للاستمرارية
                        setTimeout(async () => {
                            try {
                                const toSave = next.map((m: any) => {
                                    const copy = { ...m };
                                    delete copy.signedUrl;
                                    delete copy.thumbnail;
                                    return copy;
                                });
                                await CacheStrategy.saveMessages(conversationId, toSave);
                            } catch (e) {
                                console.warn('⚠️ فشل حفظ حالة الحذف:', e);
                            }
                        }, 100);

                        return next;
                    });
                }
            })
            .subscribe();

        return () => { try { supabase.removeChannel(channel); } catch (e) { } };
    }, [conversationId, isComplete, enqueueMutation, processMediaQueue, userId, messagesRef, setMessages, addToMediaQueue]);

    // ✅ Realtime Subscription على message_reads لتحديث حالة القراءة فوراً
    useEffect(() => {
        if (!conversationId || !userId) {
            return;
        }

        const readChannel = supabase
            .channel(`message_reads:${conversationId}:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'message_reads'
                // ✅ إزالة الفلتر لنستقبل كل events (حتى التي user_id ≠ self)
            }, async (payload) => {
                try {
                    const row: any = payload.new;

                    // ✅ Flush any pending mutations first to sync messagesRef.current
                    if (batchTimerRef.current != null) {
                        clearTimeout(batchTimerRef.current);
                        const mutations = pendingMutationsRef.current.splice(0);
                        batchTimerRef.current = null;
                        if (mutations.length > 0) {
                            let base = messagesRef.current;
                            for (const m of mutations) {
                                base = m(base);
                            }
                            messagesRef.current = base;
                            setMessages(base);
                        }
                    }

                    // ✅ Now update isRead (messagesRef.current is synced)
                    setMessages(prev => {
                        const idx = prev.findIndex(m => m.id === row.message_id);
                        if (idx === -1) return prev;

                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            isRead: true,
                            _readTimestamp: Date.now()
                        } as any;

                        messagesRef.current = updated;

                        // ✅ حفظ في IndexedDB للاحتفاظ بحالة القراءة
                        const toSave = updated.map((m: any) => {
                            const copy = { ...m };
                            delete copy.signedUrl;
                            delete copy.thumbnail;
                            return copy;
                        });
                        CacheStrategy.saveMessages(conversationId, toSave).catch(() => { });

                        return updated;
                    });
                } catch (e) {
                    console.warn('[message_reads] Failed to process read event:', e);
                }
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(readChannel); } catch (e) { }
        };
    }, [conversationId, userId, enqueueMutation]);

    // ✅ Realtime على user_message_visibility لتحديث النقطة الحمراء
    useEffect(() => {
        if (!conversationId || !userId) return;

        const visibilityChannel = supabase
            .channel(`user_message_visibility:${conversationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_message_visibility'
            }, (payload: any) => {
                const row: any = payload.new;
                if (!row?.is_hidden || row.user_id === userId) return;

                setMessages(prev => {
                    const idx = prev.findIndex(m => m.id === row.message_id);
                    if (idx === -1) return prev;

                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], isSenderDeleted: true } as any;
                    messagesRef.current = updated;

                    const toSave = updated.map((m: any) => {
                        const copy = { ...m };
                        delete copy.signedUrl;
                        delete copy.thumbnail;
                        return copy;
                    });
                    CacheStrategy.saveMessages(conversationId, toSave).catch(() => { });
                    return updated;
                });
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(visibilityChannel); } catch (e) { }
        };
    }, [conversationId, userId, messagesRef, setMessages]);

    // ✅ الاستماع للـ CustomEvent من App.tsx (الحارس العام)
    useEffect(() => {
        if (!conversationId) return;

        const handleMessageUpdate = (event: any) => {
            const { conversationId: eventConversationId, action, data } = event.detail;

            // تجاهل إذا كانت محادثة مختلفة
            if (eventConversationId !== conversationId) return;

            // CustomEvent message-update

            if (action === 'update') {
                // ✅ UPDATE: تحديث الرسالة في الكاش
                enqueueMutation(prev => {
                    const idx = prev.findIndex(m => m.id === data.id);
                    if (idx === -1) {
                        // رسالة غير موجودة
                        return prev;
                    }

                    const next = [...prev];
                    next[idx] = {
                        ...next[idx],
                        text: data.content,
                        caption: data.caption,
                        media_metadata: data.media_metadata,
                        isRead: data.is_read !== undefined ? data.is_read : next[idx].isRead, // ✅ تحديث القراءة
                        isDeleted: data.is_deleted !== undefined ? data.is_deleted : next[idx].isDeleted // ✅ تحديث الحذف
                    } as any;

                    // تم تحديث الرسالة عبر CustomEvent

                    // ✅ حفظ في IndexedDB للاحتفاظ بالتحديث
                    setTimeout(async () => {
                        try {
                            const toSave = next.map((m: any) => {
                                const copy = { ...m };
                                delete copy.signedUrl;
                                delete copy.thumbnail;
                                return copy;
                            });
                            await CacheStrategy.saveMessages(conversationId, toSave);
                            // تم حفظ التحديث في الكاش
                        } catch (e) {
                            console.warn('فشل حفظ التحديث:', e);
                        }
                    }, 100);

                    return next;
                });
            }
        };

        window.addEventListener('message-update', handleMessageUpdate);

        return () => {
            window.removeEventListener('message-update', handleMessageUpdate);
        };
    }, [conversationId, enqueueMutation]);
};
