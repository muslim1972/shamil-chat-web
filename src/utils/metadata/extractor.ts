// ==========================================
// 📊 Metadata Extractor - استخراج شامل لبيانات الميديا
// ==========================================

import { generateBlurhash, generateBlurhashFromVideo } from '../blurhash/generator';
import { readExif, type ExifMetadata } from '../exif/exifReader';
import { stripExif } from '../exif/exifStripper';

export interface CompleteMediaMetadata {
    // أبعاد حقيقية
    width: number;
    height: number;

    // BlurHash للعرض الفوري
    blurhash: string;

    // EXIF (نظيف)
    orientation: number;
    hasGPS: boolean; // تحذير أمني

    // معلومات عامة
    size: number;
    mimeType: string;
    duration?: number; // للفيديو فقط
}

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
 * تحميل فيديو من File
 */
async function loadVideo(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const url = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(video);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load video'));
        };
        video.src = url;
    });
}

/**
 * استخراج metadata كامل من ملف ميديا
 */
export async function extractCompleteMetadata(
    file: File,
    options: {
        generateBlurhash: boolean;
        stripSensitiveExif: boolean;
    } = { generateBlurhash: true, stripSensitiveExif: true }
): Promise<{
    metadata: CompleteMediaMetadata;
    cleanFile: File; // ملف بدون EXIF حساس
}> {

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    let cleanFile = file;
    let exifData: ExifMetadata | null = null;

    // 1. قراءة وحذف EXIF (للصور فقط)
    if (isImage && options.stripSensitiveExif) {
        try {
            exifData = await readExif(file);
            cleanFile = await stripExif(file); // ✅ حذف GPS وبيانات حساسة

            if (exifData.hasGPS) {
                console.warn('⚠️ تم حذف بيانات الموقع (GPS) من الصورة لحماية خصوصيتك');
            }
        } catch (error) {
            console.warn('فشل في معالجة EXIF، استخدام الملف الأصلي:', error);
        }
    }

    // 2. استخراج الأبعاد والمدة
    let width = 0;
    let height = 0;
    let duration: number | undefined;

    if (isImage) {
        try {
            const img = await loadImage(cleanFile);
            width = img.naturalWidth;
            height = img.naturalHeight;
            console.log(`📐 [extractor] قراءة أبعاد من cleanFile: ${width}x${height}`);
            console.log(`📐 [extractor] حجم cleanFile: ${cleanFile.size} bytes`);
        } catch (error) {
            console.warn('فشل في قراءة أبعاد الصورة:', error);
            // استخدام EXIF إذا كان متاحاً
            if (exifData) {
                width = exifData.width;
                height = exifData.height;
            }
        }
    } else if (isVideo) {
        try {
            const video = await loadVideo(cleanFile);
            width = video.videoWidth;
            height = video.videoHeight;
            duration = video.duration;
        } catch (error) {
            console.warn('فشل في قراءة أبعاد الفيديو:', error);
        }
    }

    // 3. توليد BlurHash
    let blurhash = '';
    if (options.generateBlurhash) {
        try {
            if (isImage) {
                blurhash = await generateBlurhash(cleanFile, { width: 32, height: 32 });
            } else if (isVideo) {
                // لتوليد blurhash من الفيديو، نحتاج للإطار الأول
                const video = await loadVideo(cleanFile);
                video.currentTime = 0.1; // أول 100ms
                await new Promise(resolve => {
                    video.onseeked = resolve;
                });
                blurhash = await generateBlurhashFromVideo(video, { width: 32, height: 32 });
            }
        } catch (error) {
            console.warn('فشل في توليد BlurHash:', error);
            blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'; // افتراضي
        }
    }

    return {
        metadata: {
            width,
            height,
            blurhash,
            orientation: exifData?.orientation || 1,
            hasGPS: exifData?.hasGPS || false,
            size: cleanFile.size,
            mimeType: cleanFile.type,
            duration
        },
        cleanFile // ✅ ملف نظيف بدون GPS
    };
}
