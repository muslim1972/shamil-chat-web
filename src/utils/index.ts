// ==========================================
// 📍 Media Utils - نقطة الدخول الموحدة
// ==========================================

// EXIF
export { readExif, type ExifMetadata } from './media/exif/exifReader';
export { stripExif } from './media/exif/exifStripper';

// BlurHash
export { generateBlurhash, generateBlurhashFromVideo } from './media/blurhash/generator';

// Compression
export {
    selectCompressionMethod,
    calculateDimensions,
    isWebCodecsSupported,
    isOffscreenCanvasSupported,
    type CompressionMethod
} from './media/compression/compressionStrategy';

export {
    compressImage,
    type ImageCompressionOptions,
    type ImageMetadata
} from './media/compression/imageCompressor';

export {
    prepareImagesForAI,
    prepareImageForAI
} from './media/compression/imageCompression';

export {
    compressVideo,
    shouldCompressVideo,
    type VideoCompressionOptions
} from './media/compression/videoCompressor';

// Metadata
export {
    extractCompleteMetadata,
    type CompleteMediaMetadata
} from './media/metadata/extractor';

// Pipeline (المنسق الرئيسي)
export {
    processMediaForSending,
    cleanupProcessingResult,
    type ProcessingResult
} from './media/pipeline/mediaProcessor';
