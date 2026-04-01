// ==========================================
// 🎨 BlurHash Placeholder Component
// ==========================================

import React, { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

interface BlurhashPlaceholderProps {
    hash: string;
    width?: number;
    height?: number;
    className?: string;
    punch?: number; // 0-1, default 1
}

/**
 * مكون لعرض BlurHash كـ placeholder
 * يستخدم Canvas لفك الـ hash وعرضه كصورة ضبابية
 */
export const BlurhashPlaceholder: React.FC<BlurhashPlaceholderProps> = ({
    hash,
    width = 32,
    height = 32,
    className = '',
    punch = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !hash) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            // فك BlurHash (سريع جداً - <5ms)
            const pixels = decode(hash, width, height, punch);

            const imageData = ctx.createImageData(width, height);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            console.error('فشل في فك BlurHash:', error);
        }
    }, [hash, width, height, punch]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={className}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                imageRendering: 'auto',
                // blur effect للمظهر الضبابي
                filter: 'blur(20px)',
            }}
        />
    );
};

BlurhashPlaceholder.displayName = 'BlurhashPlaceholder';
