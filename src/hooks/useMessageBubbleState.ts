import { useState, useRef, useCallback, useMemo } from 'react';
import type { Message } from '../types';

/**
 * Hook لإدارة الحالات المحلية لـ MessageBubble
 * 
 * يجمع جميع الحالات في مكان واحد لتسهيل الصيانة
 */
export function useMessageBubbleState(message: Message) {
    // حالات الفيديو
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);

    // حالات الصور المصغرة
    const [generatedThumbUrl, setGeneratedThumbUrl] = useState<string | null>(null);
    const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
    const [thumbError, setThumbError] = useState<string | null>(null);

    // حالات الصور
    const [imageError, setImageError] = useState<boolean>(false);

    // حالات الأفاتار
    const [avatarError, setAvatarError] = useState<boolean>(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const pressStartTime = useRef<number>(0);

    // البيانات المحسوبة
    const computedData = useMemo(() => {
        const msg = message as any;
        const msgTypeRaw = (msg?.message_type || '').toLowerCase();
        const textPath = String(msg?.text || '');
        const metaPath = String(
            (msg?.media_metadata || {})?.path ||
            (msg?.media_metadata || {})?.file_path ||
            (msg?.media_metadata || {})?.storage_path ||
            ''
        );
        const pathForInfer = metaPath || textPath;
        const ext = pathForInfer.split('.').pop()?.toLowerCase() || '';

        const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
        const videoExts = new Set(['mp4', 'webm', 'mkv', 'mov']);
        const inferred = imageExts.has(ext) ? 'image' : (videoExts.has(ext) ? 'video' : '');

        const msgType = msgTypeRaw || inferred;
        const isMedia = !!msgType && msgType !== 'text' && msgType !== 'forwarded_block';

        return {
            msgType,
            isMedia,
            msgTypeRaw,
            textPath,
            metaPath,
            ext,
        };
    }, [message]);

    // دوال المساعدة
    const formatTime = useCallback((timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const getAspectStyles = useCallback((fallback: { w: number; h: number }, minH?: number) => {
        const meta: any = (message as any).media_metadata || {};
        const mw = Number(
            meta.width || meta.w || meta.image_width || meta.video_width || meta.thumb_width
        );
        const mh = Number(
            meta.height || meta.h || meta.image_height || meta.video_height || meta.thumb_height
        );
        const w = mw > 0 ? mw : fallback.w;
        const h = mh > 0 ? mh : fallback.h;

        const style: React.CSSProperties = {
            aspectRatio: `${Math.max(w, 1)}/${Math.max(h, 1)}`,
        };

        if ((!mw || !mh) && typeof minH === 'number') {
            style.minHeight = `${minH}px`;
        }

        return style;
    }, [message]);

    // إعادة ضبط الحالات
    const resetVideoState = useCallback(() => {
        setShowVideoPlayer(false);
        setIsLoadingVideo(false);
    }, []);

    const resetThumbState = useCallback(() => {
        setThumbError(null);
        setGeneratedThumbUrl(null);
        setIsGeneratingThumb(false);
    }, []);

    const resetImageState = useCallback(() => {
        setImageError(false);
    }, []);

    const resetAvatarState = useCallback(() => {
        setAvatarError(false);
    }, []);

    return {
        // حالات الفيديو
        showVideoPlayer,
        setShowVideoPlayer,
        isLoadingVideo,
        setIsLoadingVideo,
        videoRef,
        resetVideoState,

        // حالات الصور المصغرة
        generatedThumbUrl,
        setGeneratedThumbUrl,
        isGeneratingThumb,
        setIsGeneratingThumb,
        thumbError,
        setThumbError,
        resetThumbState,

        // حالات الصور
        imageError,
        setImageError,
        resetImageState,

        // حالات الأفاتار
        avatarError,
        setAvatarError,
        resetAvatarState,

        // Refs
        pressStartTime,

        // بيانات محسوبة
        computedData,

        // دوال مساعدة
        formatTime,
        getAspectStyles,
    };
}
