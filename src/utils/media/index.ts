// ==========================================
// 📍 Media Utils - نقطة الدخول الموحدة
// ==========================================

// EXIF
export { readExif, type ExifMetadata } from './exif/exifReader';
export { stripExif } from './exif/exifStripper';

// BlurHash
export { generateBlurhash, generateBlurhashFromVideo } from './blurhash/generator';

// Compression
export {
    selectCompressionMethod,
    calculateDimensions,
    isWebCodecsSupported,
    isOffscreenCanvasSupported,
    type CompressionMethod
} from './compression/compressionStrategy';

export {
    compressImage,
    type ImageCompressionOptions,
    type ImageMetadata
} from './compression/imageCompressor';

export {
    compressVideo,
    shouldCompressVideo,
    type VideoCompressionOptions
} from './compression/videoCompressor';

// Metadata
export {
    extractCompleteMetadata,
    type CompleteMediaMetadata
} from './metadata/extractor';

// Pipeline (المنسق الرئيسي)
export {
    processMediaForSending,
    cleanupProcessingResult,
    type ProcessingResult
} from './pipeline/mediaProcessor';
