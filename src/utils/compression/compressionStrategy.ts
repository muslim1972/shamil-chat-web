// ==========================================
// ⚙️ Compression Strategy - اختيار طريقة الضغط المناسبة
// ==========================================

export type CompressionMethod =
    | 'webcodecs'        // الأسرع - Chrome 94+ (GPU/DSP)
    | 'offscreen-canvas' // سريع - Chrome 69+ (GPU)
    | 'canvas'           // متوافق (CPU)
    | 'mediarecorder';   // Fallback للفيديو

/**
 * اختيار أفضل طريقة ضغط متاحة
 */
export function selectCompressionMethod(): CompressionMethod {
    // 1. WebCodecs API (الأسرع - Hardware Acceleration كامل)
    if (typeof window !== 'undefined' &&
        'VideoEncoder' in window &&
        'VideoDecoder' in window) {
        return 'webcodecs';
    }

    // 2. OffscreenCanvas (سريع - GPU Acceleration)
    if (typeof window !== 'undefined' && 'OffscreenCanvas' in window) {
        return 'offscreen-canvas';
    }

    // 3. Canvas العادي (متوافق - CPU)
    if (typeof document !== 'undefined' &&
        document.createElement('canvas').getContext('2d')) {
        return 'canvas';
    }

    // 4. MediaRecorder (fallback)
    return 'mediarecorder';
}

/**
 * التحقق من دعم WebCodecs
 */
export function isWebCodecsSupported(): boolean {
    return typeof window !== 'undefined' &&
        'VideoEncoder' in window &&
        'VideoDecoder' in window;
}

/**
 * التحقق من دعم OffscreenCanvas
 */
export function isOffscreenCanvasSupported(): boolean {
    return typeof window !== 'undefined' && 'OffscreenCanvas' in window;
}

/**
 * حساب الأبعاد الجديدة مع الحفاظ على نسبة العرض
 */
export function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxDimension: number
): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    if (originalWidth > maxDimension || originalHeight > maxDimension) {
        if (originalWidth > originalHeight) {
            width = maxDimension;
            height = Math.round(maxDimension / aspectRatio);
        } else {
            height = maxDimension;
            width = Math.round(maxDimension * aspectRatio);
        }
    }

    return { width, height };
}
