// ==========================================
// 🔄 Media Pipeline - المنسق الرئيسي لمعالجة الميديا
// ==========================================

import { extractCompleteMetadata, type CompleteMediaMetadata } from '../metadata/extractor';
import { compressImage } from '../compression/imageCompressor';
import { shouldCompressVideo } from '../compression/videoCompressor';

export interface ProcessingResult {
    // الملف النهائي للرفع
    finalFile: File;

    // Metadata الكاملة
    metadata: CompleteMediaMetadata;

    // للعرض الفوري (Optimistic UI)
    localPreview: {
        blurhash: string;
        localObjectUrl: string; // ✅ للعرض الفوري من الذاكرة
    };

    // تحذيرات
    warnings: string[];
}

/**
 * معالجة شاملة لملف ميديا قبل الإرسال
 * 
 * المراحل:
 * 1. Extract metadata (EXIF, dimensions, blurhash)
 * 2. Strip sensitive EXIF (GPS, camera info)
 * 3. Compress (if needed)
 * 4. Generate preview for optimistic UI
 */
export async function processMediaForSending(
    file: File,
    type: 'image' | 'video'
): Promise<ProcessingResult> {

    const warnings: string[] = [];

    console.log(`📊 [mediaProcessor] بدء معالجة ${type}:`, {
        name: file.name,
        size: file.size,
        type: file.type
    });

    // المرحلة 1: استخراج Metadata الكاملة (مع حذف EXIF)
    const { metadata, cleanFile } = await extractCompleteMetadata(file, {
        generateBlurhash: type === 'image', // ✅ فقط للصور
        stripSensitiveExif: true
    });

    // تحذير إذا كان الملف يحتوي GPS
    if (metadata.hasGPS) {
        warnings.push('تم حذف بيانات الموقع (GPS) لحماية خصوصيتك');
    }

    // المرحلة 2: الضغط (Hardware Accelerated)
    let finalFile = cleanFile;

    // ✅ حفظ الأبعاد الأصلية (قبل الضغط!)
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    if (type === 'image') {
        try {
            const compressed = await compressImage(cleanFile, {
                maxDimension: 1920,
                quality: 0.8,
                preserveAspectRatio: true
            });
            finalFile = compressed.file;

            console.log(`✅ تم ضغط الصورة: ${file.size} → ${finalFile.size} bytes`);
            console.log(`📐 الأبعاد الأصلية المحفوظة: ${originalWidth}x${originalHeight}`);

            // ⚠️ لا نستبدل width/height! نحافظ على الأبعاد الأصلية
        } catch (error) {
            console.warn('فشل في ضغط الصورة، استخدام الملف الأصلي:', error);
            finalFile = cleanFile;
        }
    } else if (type === 'video') {
        // التحقق من حد 15MB
        try {
            const needsCompression = shouldCompressVideo(cleanFile);

            if (needsCompression) {
                // حالياً: لا نضغط الفيديوهات (معقد)
                // الملفات < 15MB مسموحة
                console.log('الفيديو ضمن الحد المسموح (15MB)');
            }

            finalFile = cleanFile;
        } catch (error: any) {
            // إذا كان الملف > 15MB
            throw error;
        }
    }

    // المرحلة 3: إنشاء Preview للعرض الفوري
    // ✅ الآن: BlurHash فقط (thumbnail سيُولّد في الخلفية بعد الرفع)

    // ✅ إنشاء Object URL للعرض الفوري
    const localObjectUrl = URL.createObjectURL(finalFile);

    return {
        finalFile,
        metadata,
        localPreview: {
            blurhash: metadata.blurhash,
            localObjectUrl // ✅ للعرض الفوري بدون انتظار الرفع
        },
        warnings
    };
}

/**
 * تنظيف Object URLs بعد الانتهاء
 */
export function cleanupProcessingResult(result: ProcessingResult): void {
    if (result.localPreview.localObjectUrl) {
        URL.revokeObjectURL(result.localPreview.localObjectUrl);
    }
}
