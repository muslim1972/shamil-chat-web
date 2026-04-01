// ==========================================
// 🎨 BlurHash Generator - توليد BlurHash من الصور
// ==========================================

import { encode } from 'blurhash';

/**
 * تحميل صورة من File
 */
async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

/**
 * توليد BlurHash من ملف صورة أو فيديو
 * @param file - الملف المصدر
 * @param options - خيارات التوليد (حجم صغير للسرعة)
 */
export async function generateBlurhash(
    file: File | Blob,
    options: { width?: number; height?: number } = {}
): Promise<string> {
    const targetWidth = options.width || 32;
    const targetHeight = options.height || 32;

    try {
        // تحميل الصورة
        const img = await loadImage(file);

        // إنشاء canvas صغير (BlurHash يعمل أفضل مع صور صغيرة)
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // رسم الصورة المصغرة
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // استخراج pixel data
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // توليد BlurHash (4x3 components للسرعة)
        const hash = encode(
            imageData.data,
            imageData.width,
            imageData.height,
            4, // componentX
            3  // componentY
        );

        return hash;
    } catch (error) {
        console.error('فشل في توليد BlurHash:', error);
        // BlurHash افتراضي (رمادي)
        return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
    }
}

/**
 * توليد BlurHash من عنصر فيديو (أول إطار)
 */
export async function generateBlurhashFromVideo(
    videoElement: HTMLVideoElement,
    options: { width?: number; height?: number } = {}
): Promise<string> {
    const targetWidth = options.width || 32;
    const targetHeight = options.height || 32;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // رسم الإطار الحالي من الفيديو
        ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        const hash = encode(
            imageData.data,
            imageData.width,
            imageData.height,
            4,
            3
        );

        return hash;
    } catch (error) {
        console.error('فشل في توليد BlurHash من الفيديو:', error);
        return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
    }
}
