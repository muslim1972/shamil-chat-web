import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Message } from '../types';

interface MediaUrlResult {
    localUrl: string | null;
    localThumb: string | null;
    isLoading: boolean;
    refreshUrl: () => Promise<void>;
}

/**
 * Hook لإدارة روابط الوسائط من Supabase
 * 
 * يقوم بـ:
 * - تحميل الـ signed URLs للوسائط
 * - إدارة الصور المصغرة للفيديو
 * - معالجة حالات الخطأ
 */
export function useMessageMediaUrl(message: Message): MediaUrlResult {
    const msg = message as any;

    // ✅ استخدام localUrl من optimistic message مباشرة إذا كان موجوداً
    const [localUrl, setLocalUrl] = useState<string | null>(
        msg.localUrl || msg.signedUrl || null
    );
    const [localThumb, setLocalThumb] = useState<string | null>(
        msg.thumbnail || null
    );
    const [isLoading, setIsLoading] = useState(false);

    // استخراج المسار من البيانات الوصفية
    const getRawPath = useCallback(() => {
        const meta = msg.media_metadata || {};
        return meta.path || meta.file_path || meta.storage_path || msg.text || '';
    }, [msg]);

    // تحميل الـ signed URL
    const resolveMediaUrl = useCallback(async () => {
        const rawPath = getRawPath();
        if (!rawPath) return;

        // إذا كان الرابط URL كامل، استخدمه مباشرة
        if (/^https?:\/\//i.test(rawPath)) {
            setLocalUrl(rawPath);
            return;
        }

        // تحميل signed URL من Supabase
        const path = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;

        try {
            setIsLoading(true);
            const { data: signed } = await supabase.storage
                .from('call-files')
                .createSignedUrl(path, 900);

            if (signed?.signedUrl) {
                setLocalUrl(signed.signedUrl);
            } else {
                // fallback للرابط العام
                try {
                    const { supabaseUrl } = await import('../services/supabase');
                    setLocalUrl(`${supabaseUrl}/storage/v1/object/public/call-files/${path}`);
                } catch { }
            }
        } catch (error) {
            console.warn('فشل في تحميل رابط الوسائط:', error);
        } finally {
            setIsLoading(false);
        }
    }, [getRawPath]);

    // تحميل الصورة المصغرة للفيديو
    const resolveThumbnail = useCallback(async () => {
        const type = (msg.message_type || '').toLowerCase();
        if (type !== 'video' || localThumb) return;

        // إذا كانت هناك صورة مصغرة في الرسالة
        if (msg.thumbnail) {
            setLocalThumb(msg.thumbnail);
            return;
        }

        const meta = msg.media_metadata || {};
        const thumbPath = meta.thumb_path;

        if (!thumbPath) return;

        // إذا كان رابط URL كامل
        if (/^https?:\/\//i.test(thumbPath)) {
            setLocalThumb(thumbPath);
            return;
        }

        // تحميل signed URL للصورة المصغرة
        const path = thumbPath.startsWith('public/') ? thumbPath : `public/${thumbPath}`;

        try {
            const { data: signed } = await supabase.storage
                .from('call-files')
                .createSignedUrl(path, 900);

            if (signed?.signedUrl) {
                setLocalThumb(signed.signedUrl);
            } else {
                try {
                    const { supabaseUrl } = await import('../services/supabase');
                    setLocalThumb(`${supabaseUrl}/storage/v1/object/public/call-files/${path}`);
                } catch { }
            }
        } catch (error) {
            console.warn('فشل في تحميل الصورة المصغرة:', error);
        }
    }, [msg, localThumb]);

    // تحديث الرابط عند الخطأ
    const refreshUrl = useCallback(async () => {
        const rawPath = getRawPath();
        if (!rawPath) return;

        const path = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;

        try {
            const { data } = await supabase.storage
                .from('call-files')
                .createSignedUrl(path, 900);

            if (data?.signedUrl) {
                setLocalUrl(data.signedUrl);
            }
        } catch { }
    }, [getRawPath]);

    // Effect لتحميل الروابط
    useEffect(() => {
        const type = (msg.message_type || '').toLowerCase();
        if (!type || type === 'text' || type === 'alert' || type === 'forwarded_block') {
            return;
        }

        let cancelled = false;

        const init = async () => {
            if (!localUrl) {
                await resolveMediaUrl();
            }
            if (!cancelled) {
                await resolveThumbnail();
            }
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [message.id, localUrl, resolveMediaUrl, resolveThumbnail, msg.message_type]);

    return {
        localUrl,
        localThumb,
        isLoading,
        refreshUrl,
    };
}
