// useMessagesFetch Hook
// مسؤول عن جلب الرسائل من database ومزامنتها مع الكاش

import { useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import type { Message } from '../../types';
import type { CachedMessage } from '../types/cacheTypes';
import { CacheStrategy } from '../core/CacheStrategy';
import { syncMessages } from '../utils/syncMessages';
import { validateMessages } from '../utils/validateMessage';
import { CACHE_CONFIG } from '../core/CacheConfig';

const INITIAL_LOAD = CACHE_CONFIG.INITIAL_MESSAGES_LIMIT;
const CACHE_LIMIT = CACHE_CONFIG.CACHE_LIMIT;
const DISPLAY_WINDOW = CACHE_CONFIG.DISPLAY_WINDOW;


interface UseMessagesFetchProps {
    conversationId: string;
    userId: string;
}

export const useMessagesFetch = ({ conversationId, userId }: UseMessagesFetchProps) => {
    const isSyncingRef = useRef<boolean>(false);
    const coldStartRef = useRef<boolean>(false);
    const fullCacheRef = useRef<CachedMessage[]>([]);
    const blobUrlRefs = useRef<Map<string, string>>(new Map());

    const fetchAndSyncMessages = useCallback(async (
        messagesRef: React.MutableRefObject<CachedMessage[]>,
        setMessages: React.Dispatch<React.SetStateAction<CachedMessage[]>>,
        setLoading: React.Dispatch<React.SetStateAction<boolean>>,
        setError: React.Dispatch<React.SetStateAction<string | null>>,
        setIsComplete: React.Dispatch<React.SetStateAction<boolean>>,
        addToMediaQueue: (msgId: string) => void,
        processMediaQueue: (messagesRef: React.MutableRefObject<CachedMessage[]>, setMessages: React.Dispatch<React.SetStateAction<CachedMessage[]>>) => Promise<void>
    ) => {
        if (!conversationId || !userId) return;
        if (isSyncingRef.current) return;

        isSyncingRef.current = true;
        setLoading(true);

        try {
            // تحميل من الكاش أولاً
            const cached = await CacheStrategy.getMessages(conversationId);

            if (cached.length > 0) {
                // استعادة blob URLs وبيانات المرسل
                const restored = cached.map(msg => {
                    const restored: any = { ...msg };

                    // استعادة بيانات المرسل من media_metadata إذا لم تكن موجودة
                    if (!restored.sender || !restored.sender.username) {
                        const meta = msg.media_metadata || {};
                        restored.sender = {
                            id: msg.senderId,
                            username: meta.sender_username || msg.sender?.username || 'مستخدم',
                            avatar_url: meta.sender_avatar_url || msg.sender?.avatar_url
                        };
                    }

                    // استعادة blob URLs
                    if (msg.mediaBlob instanceof Blob) {
                        const blobKey = `media_${msg.id}`;
                        if (!blobUrlRefs.current.has(blobKey)) {
                            blobUrlRefs.current.set(blobKey, URL.createObjectURL(msg.mediaBlob));
                        }
                        restored.signedUrl = blobUrlRefs.current.get(blobKey);
                    }

                    if (msg.message_type === 'video' && msg.thumbnailBlob instanceof Blob) {
                        const thumbKey = `thumb_${msg.id}`;
                        if (!blobUrlRefs.current.has(thumbKey)) {
                            blobUrlRefs.current.set(thumbKey, URL.createObjectURL(msg.thumbnailBlob));
                        }
                        restored.thumbnail = blobUrlRefs.current.get(thumbKey);
                    }

                    return restored as CachedMessage;
                });

                // عرض آخر الرسائل فوراً (مع الحفاظ على isRead من state الحالي)
                const limited = restored.slice(-CACHE_LIMIT);
                fullCacheRef.current = limited;
                const visible = limited.slice(-DISPLAY_WINDOW);

                // ✅ دمج isRead من state الحالي لتجنب فقدان حالة القراءة
                setMessages(prev => {
                    const prevIsReadMap = new Map(prev.map(m => [m.id, (m as any).isRead]));
                    return visible.map(msg => ({
                        ...msg,
                        isRead: prevIsReadMap.has(msg.id) ? prevIsReadMap.get(msg.id) : (msg as any).isRead
                    })) as CachedMessage[];
                });
                messagesRef.current = visible;
                setLoading(false);

                // تحديد الوسائط المرئية للتحميل
                visible.forEach(msg => {
                    if (['image', 'video'].includes((msg as any).message_type) && !(msg as any).signedUrl) {
                        addToMediaQueue(msg.id);
                    }
                });
                processMediaQueue(messagesRef, setMessages);
            } else {
                coldStartRef.current = true;
                setLoading(false);
            }

            // جلب من قاعدة البيانات - محسّن للموبايل
            const limit = coldStartRef.current ? INITIAL_LOAD : CACHE_LIMIT;

            const { data, error: dbError } = await supabase.rpc(
                'get_conversation_messages_with_read_status',
                {
                    p_conversation_id: conversationId,
                    p_limit: limit
                }
            );

            if (dbError) throw dbError;

            // ✅ DEBUG: فحص ما يعيده RPC
            if (data && data.length > 0) {
                console.log('🔍 [DEBUG] RPC Response Sample:', {
                    full: data[0],
                    keys: Object.keys(data[0]),
                    is_read: data[0].is_read,
                    user_has_read: data[0].user_has_read,
                    read_at: data[0].read_at
                });
            }

            // ✅ جلب Metadata والتفاصيل (Repair Fetch) لأن RPC قد لا يرجع كل الحقول المطلوبة (مثل media_metadata)
            const messageIds = (data || []).map((m: any) => m.id);
            const extraDataMap = new Map<string, any>();

            if (messageIds.length > 0) {
                const { data: extras } = await supabase
                    .from('messages')
                    .select('id, media_metadata, reply_to') // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id
                    .in('id', messageIds);

                if (extras) {
                    extras.forEach((r: any) => extraDataMap.set(r.id, r));
                }
            }

            // ✅ جلب تفاصيل الردود (secondary fetch)
            // نستخدم extraDataMap للحصول على reply_to الموثوق
            const replyIds = [...new Set(Array.from(extraDataMap.values()).map(m => m.reply_to).filter(Boolean))]; // ✅ تصحيح
            const repliesMap = new Map<string, any>();

            if (replyIds.length > 0) {
                const { data: replies } = await supabase
                    .from('messages')
                    .select('id, content, message_type, sender:sender_id(username), media_metadata')
                    .in('id', replyIds);

                if (replies) {
                    replies.forEach((r: any) => {
                        repliesMap.set(r.id, {
                            id: r.id,
                            text: r.content,
                            message_type: r.message_type,
                            sender_username: r.sender?.username,
                            sender: r.sender,
                            media_metadata: r.media_metadata
                        });
                    });
                }
            }

            let freshMessages: Message[] = (data || []).map((msg: any) => {
                // ✅ دمج البيانات: الأولوية للبيانات المجلوبة مباشرة (extra)
                const extra = extraDataMap.get(msg.id) || {};
                const finalMediaMetadata = extra.media_metadata || msg.media_metadata;
                const finalReplyId = extra.reply_to || msg.reply_to; // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id

                // 🔍 Debug: طباعة media_metadata للفيديوهات
                if (msg.message_type === 'video') {
                    console.log('📹 [useMessagesFetch] فيديو من DB:', {
                        id: msg.id,
                        has_thumbnail: !!finalMediaMetadata?.thumbnail_data,
                        metadata_keys: finalMediaMetadata ? Object.keys(finalMediaMetadata) : []
                    });
                }

                return {
                    id: msg.id,
                    conversationId: msg.conversation_id,
                    text: msg.content,
                    content: msg.content,
                    senderId: msg.sender_id,
                    timestamp: new Date(msg.created_at).toISOString(),
                    message_type: msg.message_type,
                    caption: msg.caption,
                    media_metadata: finalMediaMetadata,
                    signedUrl: null,
                    status: 'sent',
                    sender: {
                        id: msg.sender_id,
                        username: msg.sender_username || 'مستخدم',
                        avatar_url: msg.sender_avatar_url
                    },
                    isGroupChat: msg.is_group_chat || false,
                    isRead: msg.is_read || false,
                    reply_to: finalReplyId, // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id
                    reply_to_message: finalMediaMetadata?.reply_snapshot ? {
                        id: finalMediaMetadata.reply_snapshot.id,
                        text: finalMediaMetadata.reply_snapshot.text,
                        message_type: finalMediaMetadata.reply_snapshot.message_type,
                        sender_username: finalMediaMetadata.reply_snapshot.sender_username,
                        sender: { username: finalMediaMetadata.reply_snapshot.sender_username }
                    } : (finalReplyId ? repliesMap.get(finalReplyId) : null)
                };
            });


            // ترتيب وتحديد الرسائل
            const byTimeAsc = [...freshMessages].sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            freshMessages = byTimeAsc.slice(-limit);

            const { synced } = syncMessages(cached, freshMessages);

            // في حالة Cold Start، تخطي التحقق الثقيل
            let validated: typeof synced;
            if (coldStartRef.current) {
                validated = synced;
            } else {
                // تحقق فقط من آخر 20 رسالة
                const recentStart = Math.max(0, synced.length - 20);
                const older = synced.slice(0, recentStart);
                const recent = synced.slice(recentStart);
                const validatedRecent = await validateMessages(recent);
                validated = [...older, ...validatedRecent];
            }

            // حفظ في الكاش
            const toCache = validated.map(msg => {
                const cached: any = { ...msg };
                delete cached.signedUrl;
                delete cached.thumbnail;
                return cached;
            });

            // 🔍 Debug: التحقق من media_metadata قبل الحفظ
            const videosToCache = toCache.filter((m: any) => m.message_type === 'video');
            if (videosToCache.length > 0) {
                console.log('💾 [useMessagesFetch] حفظ فيديوهات في IndexedDB:',
                    videosToCache.map((v: any) => ({
                        id: v.id,
                        has_thumbnail: !!v.media_metadata?.thumbnail_data
                    }))
                );
            }

            await CacheStrategy.saveMessages(conversationId, toCache);


            // عرض مع blob URLs
            const withBlobUrls = validated.map(msg => {
                const displayed: any = { ...msg };

                if (msg.mediaBlob instanceof Blob) {
                    const blobKey = `media_${msg.id}`;
                    if (!blobUrlRefs.current.has(blobKey)) {
                        blobUrlRefs.current.set(blobKey, URL.createObjectURL(msg.mediaBlob));
                    }
                    displayed.signedUrl = blobUrlRefs.current.get(blobKey);
                }

                if (msg.message_type === 'video' && msg.thumbnailBlob instanceof Blob) {
                    const thumbKey = `thumb_${msg.id}`;
                    if (!blobUrlRefs.current.has(thumbKey)) {
                        blobUrlRefs.current.set(thumbKey, URL.createObjectURL(msg.thumbnailBlob));
                    }
                    displayed.thumbnail = blobUrlRefs.current.get(thumbKey);
                }

                return displayed as CachedMessage;
            });

            // تحديث العرض (مع الحفاظ على isRead من state الحالي)
            const limitedValidated = withBlobUrls.slice(-CACHE_LIMIT);
            fullCacheRef.current = limitedValidated;
            const visibleValidated = limitedValidated.slice(-DISPLAY_WINDOW);

            // ✅ دمج isRead من state الحالي لتجنب فقدان حالة القراءة
            setMessages(prev => {
                const prevIsReadMap = new Map(prev.map(m => [m.id, (m as any).isRead]));
                return visibleValidated.map(msg => ({
                    ...msg,
                    isRead: prevIsReadMap.has(msg.id) ? prevIsReadMap.get(msg.id) : (msg as any).isRead
                })) as CachedMessage[];
            });
            messagesRef.current = visibleValidated;
            setLoading(false);
            setIsComplete(true);

            // بدء تحميل الوسائط المرئية
            visibleValidated.forEach(msg => {
                if (['image', 'video'].includes((msg as any).message_type) && !(msg as any).signedUrl) {
                    addToMediaQueue(msg.id);
                }
            });
            processMediaQueue(messagesRef, setMessages);

            // ✅ mark_conversation_read_v3 moved to separate useEffect after subscription setup
        } catch (err: any) {
            console.error('[Cache] Error:', err);
            setError(err.message);
            setLoading(false);
        } finally {
            isSyncingRef.current = false;
            coldStartRef.current = false;
        }
    }, [conversationId, userId]); // ✅ Fixed: removed queryClient to prevent infinite re-renders

    return {
        fetchAndSyncMessages,
        fullCacheRef,
        blobUrlRefs,
        isSyncingRef
    };
};
