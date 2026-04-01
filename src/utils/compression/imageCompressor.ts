// ==========================================
// 🖼️ Image Compressor - ضغط الصور بـ Hardware Acceleration
// ==========================================

import {
    selectCompressionMethod,
    calculateDimensions,
    isOffscreenCanvasSupported
} from './compressionStrategy';

export interface ImageCompressionOptions {
    maxDimension: number;
    quality: number;
    preserveAspectRatio: boolean;
}

export interface ImageMetadata {
    width: number;
    height: number;
    size: number;
}

/**
 * ضغط صورة باستخدام أفضل طريقة متاحة
 */
export async function compressImage(
    file: File,
    options: ImageCompressionOptions
): Promise<{ file: File; metadata: ImageMetadata }> {

    const method = selectCompressionMethod();

    if (method === 'offscreen-canvas' && isOffscreenCanvasSupported()) {
        return compressWithOffscreenCanvas(file, options);
    } else {
        return compressWithCanvas(file, options);
    }
}

/**
 * ضغط باستخدام OffscreenCanvas (GPU Accelerated)
 */
async function compressWithOffscreenCanvas(
    file: File,
    options: ImageCompressionOptions
): Promise<{ file: File; metadata: ImageMetadata }> {

    // استخدام createImageBitmap للسرعة
    const bitmap = await createImageBitmap(file);

    const { width, height } = calculateDimensions(
        bitmap.width,
        bitmap.height,
        options.maxDimension
    );

    // ✅ OffscreenCanvas يستخدم GPU
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get OffscreenCanvas context');
    }

    // رسم الصورة المصغرة
    ctx.drawImage(bitmap, 0, 0, width, height);

    // ✅ convertToBlob يضغط بالـ Hardware
    const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: options.quality
    });

    const compressedFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, '.webp'),
        { type: 'image/webp' }
    );

    return {
        file: compressedFile,
        metadata: { width, height, size: blob.size }
    };
}

/**
 * ضغط باستخدام Canvas العادي (Fallback)
 */
async function compressWithCanvas(
    file: File,
    options: ImageCompressionOptions
): Promise<{ file: File; metadata: ImageMetadata }> {

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            try {
                const { width, height } = calculateDimensions(
                    img.naturalWidth,
                    img.naturalHeight,
                    options.maxDimension
                );

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Failed to get canvas context');
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(url);

                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.webp'),
                            { type: 'image/webp' }
                        );

                        resolve({
                            file: compressedFile,
                            metadata: { width, height, size: blob.size }
                        });
                    },
                    'image/webp',
                    options.quality
                );
            } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
