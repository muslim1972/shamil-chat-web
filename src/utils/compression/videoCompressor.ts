// ==========================================
// 🎬 Video Compressor - ضغط الفيديو (اختياري للملفات الكبيرة)
// ==========================================

/**
 * ملاحظة: ضغط الفيديو معقد ويتطلب WebCodecs API أو MediaRecorder
 * حالياً لدينا حد 15MB على الفيديوهات، لذا الضغط اختياري
 * 
 * للمستقبل: يمكن استخدام WebCodecs API للضغط السريع
 */

export interface VideoCompressionOptions {
    targetWidth: number;
    targetBitrate: number;
}

/**
 * ضغط فيديو (حالياً placeholder - سنستخدمه فقط للملفات > 5MB)
 */
export async function compressVideo(
    file: File,
    options: VideoCompressionOptions
): Promise<File> {

    // حالياً: نرجع الملف كما هو
    // TODO: تنفيذ WebCodecs compression عند الحاجة
    console.log('تخطي ضغط الفيديو - الملف ضمن الحد المسموح');
    return file;
}

/**
 * التحقق من حاجة الفيديو للضغط
 */
export function shouldCompressVideo(file: File): boolean {
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    const COMPRESS_THRESHOLD = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_SIZE) {
        throw new Error('حجم الفيديو أكبر من 15 ميجابايت');
    }

    return file.size > COMPRESS_THRESHOLD;
}
