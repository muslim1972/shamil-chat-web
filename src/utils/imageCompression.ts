// src/utils/imageCompression.ts
// أدوات ضغط ومعالجة الصور لـ AI Vision

import imageCompression from 'browser-image-compression';

/**
 * الحد الأقصى لحجم الصورة بالميجابايت (Groq Base64 limit)
 */
const MAX_SIZE_MB = 4;

/**
 * الحد الأقصى للدقة بالبكسل (Groq limit: 33 ميجابكسل)
 */
const MAX_RESOLUTION = 33_177_600; // 33 million pixels

/**
 * عتبة الحجم التي نبدأ عندها بالضغط
 * إذا كانت الصورة < 3MB، لا نضغط (للحفاظ على الجودة)
 */
const COMPRESSION_THRESHOLD_MB = 3;

/**
 * معلومات الصورة
 */
export interface ImageInfo {
    width: number;
    height: number;
    sizeInMB: number;
    megapixels: number;
    needsCompression: boolean;
    exceedsResolution: boolean;
}

/**
 * الحصول على معلومات الصورة
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                const sizeInMB = file.size / (1024 * 1024);
                const megapixels = (width * height) / 1_000_000;
                const totalPixels = width * height;

                resolve({
                    width,
                    height,
                    sizeInMB,
                    megapixels,
                    needsCompression: sizeInMB >= COMPRESSION_THRESHOLD_MB,
                    exceedsResolution: totalPixels > MAX_RESOLUTION
                });
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * التحقق من صلاحية الصورة
 */
export async function validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
        const info = await getImageInfo(file);

        // التحقق من الدقة
        if (info.exceedsResolution) {
            return {
                valid: false,
                error: `دقة الصورة عالية جداً (${info.megapixels.toFixed(1)} ميجابكسل). الحد الأقصى 33 ميجابكسل.`
            };
        }

        // التحقق من الحجم بعد الضغط المحتمل
        // إذا كانت الصورة > 15MB، من الصعب ضغطها لـ 4MB
        if (info.sizeInMB > 15) {
            return {
                valid: false,
                error: `حجم الصورة كبير جداً (${info.sizeInMB.toFixed(1)} MB). حاول استخدام صورة أصغر.`
            };
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: 'فشل تحميل الصورة. تأكد من أنها ملف صورة صالح.'
        };
    }
}

/**
 * ضغط الصورة بشكل ذكي
 * - إذا كانت < 3MB: لا ضغط (جودة كاملة)
 * - إذا كانت 3-10MB: ضغط خفيف (90% جودة)
 * - إذا كانت > 10MB: ضغط متوسط (85% جودة)
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
    const info = await getImageInfo(file);

    // إذا كانت الصورة صغيرة بالفعل، لا حاجة للضغط
    if (info.sizeInMB < COMPRESSION_THRESHOLD_MB) {
        console.log(`✅ الصورة صغيرة (${info.sizeInMB.toFixed(2)}MB)، لا حاجة للضغط`);
        return file;
    }

    console.log(`🔄 ضغط الصورة من ${info.sizeInMB.toFixed(2)}MB...`);

    // تحديد مستوى الجودة حسب الحجم
    let quality = 0.9; // افتراضي 90%
    if (info.sizeInMB > 10) {
        quality = 0.85; // 85% للصور الكبيرة جداً
    }

    const options = {
        maxSizeMB: MAX_SIZE_MB,
        maxWidthOrHeight: info.exceedsResolution ? 4096 : undefined, // تقليل الدقة إن لزم
        useWebWorker: true,
        initialQuality: quality,
        fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
    };

    try {
        const compressedFile = await imageCompression(file, options);
        const compressedSizeMB = compressedFile.size / (1024 * 1024);

        console.log(`✅ تم الضغط: ${info.sizeInMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`);

        return compressedFile;
    } catch (error) {
        console.error('❌ فشل ضغط الصورة:', error);
        throw new Error('فشل ضغط الصورة. حاول مرة أخرى.');
    }
}

/**
 * تحويل ملف صورة إلى Base64 Data URL
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * معالجة الصورة للإرسال إلى AI
 * - التحقق من الصلاحية
 * - الضغط إذا لزم الأمر
 * - التحويل إلى Base64
 */
export async function prepareImageForAI(file: File): Promise<string> {
    // 1. التحقق من الصلاحية
    const validation = await validateImage(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // 2. الضغط إذا لزم الأمر
    const processedFile = await compressImageIfNeeded(file);

    // 3. التحويل إلى Base64
    const base64 = await fileToBase64(processedFile);

    return base64;
}

/**
 * معالجة مجموعة من الصور
 * الحد الأقصى: 4 صور
 */
export async function prepareImagesForAI(files: File[]): Promise<string[]> {
    if (files.length === 0) {
        throw new Error('لم يتم اختيار أي صور');
    }

    if (files.length > 4) {
        throw new Error('يمكنك إرسال 4 صور كحد أقصى');
    }

    console.log(`📸 معالجة ${files.length} صورة...`);

    const results = await Promise.all(
        files.map((file, index) =>
            prepareImageForAI(file).catch(error => {
                throw new Error(`خطأ في الصورة ${index + 1}: ${error.message}`);
            })
        )
    );

    console.log(`✅ تم معالجة ${results.length} صورة بنجاح`);

    return results;
}
