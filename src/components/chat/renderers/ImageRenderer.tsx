import React, { memo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { BlurhashPlaceholder } from '../../media/BlurhashPlaceholder';
import type { Message } from '../../../types';

interface ImageRendererProps {
    message: Message;
    localUrl: string | null;
    imageError: boolean;
    onImageError: () => Promise<void>;
    onImageLoad: () => void;
    onImageClick: (pressDuration: number) => void;
}

/**
 * مكون عرض الصور
 * يدعم BlurHash لمنع القفزات
 */
export const ImageRenderer: React.FC<ImageRendererProps> = memo((function ImageRenderer({
    message,
    localUrl,
    imageError,
    onImageError,
    onImageLoad,
    onImageClick,
}) {
    const pressStartTime = useRef<number>(0);

    const meta = (message as any).media_metadata || {};
    const w = Number(meta.width || meta.image_width) || 4;
    const h = Number(meta.height || meta.image_height) || 3;
    const blurhash = meta.blurhash || null;

    const containerStyle: React.CSSProperties = {
        aspectRatio: `${w}/${h}`,
        width: '100%',
        minWidth: '200px',
        maxWidth: '95vw',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.5rem',
    };

    return (
        <div className="relative w-full max-w-full" style={containerStyle}>
            {/* Layer 1: BlurHash (فوري - دائماً كخلفية) */}
            {blurhash && (
                <BlurhashPlaceholder
                    hash={blurhash}
                    width={w}
                    height={h}
                    className="absolute inset-0"
                />
            )}

            {/* Layer 2: الصورة الأصلية */}
            {localUrl && !imageError && (
                <img
                    src={localUrl}
                    alt="صورة"
                    className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                    onMouseDown={() => { pressStartTime.current = Date.now(); }}
                    onTouchStart={() => { pressStartTime.current = Date.now(); }}
                    onClick={(e) => {
                        const pressDuration = Date.now() - pressStartTime.current;
                        if (pressDuration < 500) {
                            e.stopPropagation();
                            onImageClick(pressDuration);
                        }
                    }}
                    onLoad={onImageLoad}
                    onError={onImageError}
                />
            )}

            {/* حالة التحميل */}
            {!localUrl && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <Loader2 className="animate-spin text-gray-500" />
                </div>
            )}

            {/* حالة الخطأ */}
            {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600 text-sm">
                    تعذر تحميل الصورة
                </div>
            )}
        </div>
    );
}));

ImageRenderer.displayName = 'ImageRenderer';
