import { useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import type { CachedMessage } from '../types/cacheTypes';
import { CACHE_CONFIG } from '../core/CacheConfig';

const MEDIA_BATCH_SIZE = CACHE_CONFIG.MEDIA_BATCH_SIZE;

/**
 * Hook لإدارة طابور تحميل الوسائط
 * 
 * يدير تحميل الصور والفيديوهات بشكل تدريجي لتحسين الأداء
 * يستخدم batch loading لتحميل عدة وسائط في نفس الوقت
 * 
 * @hook
 * @returns {{
 *   processMediaQueue: Function,
 *   registerVisibleMessage: Function,
 *   addToMediaQueue: Function,
 *   mediaQueueRef: React.MutableRefObject
 * }}
 */
export const useMediaQueue = () => {
    const mediaQueueRef = useRef<Set<string>>(new Set());
    const mediaLoadingRef = useRef<boolean>(false);
    const visibleMessagesRef = useRef<Set<string>>(new Set());

    // تحميل ذكي للوسائط - محسّن للموبايل
    const processMediaQueue = useCallback(async (
        messagesRef: React.MutableRefObject<CachedMessage[]>,
        setMessages: React.Dispatch<React.SetStateAction<CachedMessage[]>>
    ) => {
        if (mediaLoadingRef.current || mediaQueueRef.current.size === 0) return;

        mediaLoadingRef.current = true;
        const queue = Array.from(mediaQueueRef.current);
        const batch = queue.slice(0, MEDIA_BATCH_SIZE);

        // معالجة دفعة الوسائط
        await Promise.all(batch.map(async (msgId) => {
            try {
                const msg = messagesRef.current.find(m => m.id === msgId);
                if (!msg) return;

                const meta = (msg as any).media_metadata || {};
                const rawPath = meta.path || meta.file_path || meta.storage_path || (msg as any).text;
                if (!rawPath) return;

                let url: string | null = null;

                // ✅ إصلاح: إذا كان الرابط URL كامل (R2)، استخدمه مباشرة
                if (/^https?:\/\//i.test(rawPath)) {
                    url = rawPath;
                } else {
                    // جلب URL الوسائط من Supabase (للنسخ القديمة أو Fallback)
                    const path = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;

                    // محاولة الحصول على public URL أولاً (أسرع)
                    const pub = await supabase.storage.from('call-files').getPublicUrl(path);
                    if (pub?.data?.publicUrl) {
                        url = pub.data.publicUrl;
                    } else {
                        const { data } = await supabase.storage.from('call-files').createSignedUrl(path, 3600);
                        url = data?.signedUrl || null;
                    }
                }

                if (url) {
                    setMessages(prev => {
                        const idx = prev.findIndex(m => m.id === msgId);
                        if (idx === -1) return prev;
                        const next = [...prev];
                        (next[idx] as any).signedUrl = url;
                        // ✅ Don't overwrite messagesRef.current - let parent sync it
                        return next;
                    });
                }

                mediaQueueRef.current.delete(msgId);
            } catch (error) {
                console.error(`[Media] Failed to load media for ${msgId}:`, error);
                mediaQueueRef.current.delete(msgId);
            }
        }));

        mediaLoadingRef.current = false;

        // معالجة الدفعة التالية
        if (mediaQueueRef.current.size > 0) {
            setTimeout(() => processMediaQueue(messagesRef, setMessages), 200);
        }
    }, []);

    // تسجيل الرسائل المرئية
    const registerVisibleMessage = useCallback((msgId: string, isVisible: boolean, messagesRef: React.MutableRefObject<CachedMessage[]>) => {
        if (isVisible) {
            visibleMessagesRef.current.add(msgId);
            const msg = messagesRef.current.find(m => m.id === msgId);
            if (msg && ['image', 'video'].includes((msg as any).message_type) && !(msg as any).signedUrl) {
                mediaQueueRef.current.add(msgId);
            }
        } else {
            visibleMessagesRef.current.delete(msgId);
        }
    }, []);

    const addToMediaQueue = useCallback((msgId: string) => {
        mediaQueueRef.current.add(msgId);
    }, []);

    return {
        processMediaQueue,
        registerVisibleMessage,
        addToMediaQueue,
        mediaQueueRef,
    };
};
