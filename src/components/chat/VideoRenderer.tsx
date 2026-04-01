import React from 'react';
import { PlayCircle, Loader2 } from 'lucide-react';
import { BlurhashPlaceholder } from '../media/BlurhashPlaceholder';
import { calculateVideoDimensions } from '../../utils/media/calculateVideoDimensions';
import type { Message } from '../../types';

interface VideoRendererProps {
    message: Message;
    localUrl: string | null;
    onPlayClick: () => void;
}

/**
 * مكون عرض الفيديو - معاينة فقط
 * 
 * 🎯 استراتيجية العرض:
 * 1. BlurHash فوري (من metadata - دائماً موجود)
 * 2. Thumbnail (من metadata.thumbnail_data - يُضاف لاحقاً)
 * 3. عند النقر: فتح GlobalMediaViewer مع كامل المميزات
 * 
 * ✅ لا عنصر نائب = لا قفزة!
 */
export const VideoRenderer: React.FC<VideoRendererProps> = ({
    message,
    localUrl,
    onPlayClick,
}) => {
    // استخراج metadata
    const meta = (message as any).media_metadata || {};
    const w = Number(meta.width || meta.video_width) || 640;
    const h = Number(meta.height || meta.video_height) || 360;
    const blurhash = meta.blurhash || null;
    const thumbnailData = meta.thumbnail_data || null;

    // ✅ حساب الأبعاد الديناميكية
    const dims = calculateVideoDimensions(w, h);

    // ✅ عرض المعاينة الهجينة (BlurHash + Thumbnail)
    const containerStyle: React.CSSProperties = {
        aspectRatio: dims.aspectRatio,
        width: '100%',
        maxWidth: dims.maxWidth,
        maxHeight: dims.maxHeight,
        minWidth: dims.minWidth,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.5rem',
        cursor: 'pointer',
    };

    return (
        <div
            className="relative flex items-center justify-center"
            style={containerStyle}
            onClick={onPlayClick}
        >
            {/* ✅ Layer 1: BlurHash (فوري - دائماً موجود) */}
            {blurhash ? (
                <BlurhashPlaceholder
                    hash={blurhash}
                    width={w}
                    height={h}
                    className="absolute inset-0"
                />
            ) : (
                // Fallback: إذا لم يكن هناك BlurHash (نادر جداً)
                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <PlayCircle size={48} className="text-gray-400" />
                </div>
            )}

            {/* ✅ Layer 2: Thumbnail (من الخلفية - عند توفره) */}
            {thumbnailData && (
                <img
                    src={thumbnailData}
                    alt="Video preview"
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* ✅ Layer 3: زر التشغيل */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-opacity">
                <PlayCircle size={64} className="text-white opacity-90 drop-shadow-lg" />
            </div>

            {/* شارة "Video" */}
            <span className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-60 px-2 py-1 rounded">
                Video
            </span>

            {/* حالة التحميل (إذا لم يكن localUrl جاهز بعد) */}
            {!localUrl && (
                <div className="absolute top-2 left-2">
                    <Loader2 size={16} className="animate-spin text-white opacity-70" />
                </div>
            )}
        </div>
    );
};
