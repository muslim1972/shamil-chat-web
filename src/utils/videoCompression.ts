// نظام ضغط الفيديو المستقل
// يمكن استخدامه في أي تطبيق مع تعديل الـ storage و media_db

import { generateVideoThumbnail } from './media';

// الواجهة الرئيسية لضغط الفيديو
export interface VideoCompressionOptions {
  targetWidth?: number;      // العرض المستهدف
  fps?: number;              // معدل الإطارات
  videoKbps?: number;        // معدل البت للفيديو
  audioKbps?: number;        // معدل البت للصوت
  minSizeForCompression?: number; // الحد الأدنى لحجم الملف للضغط
  thumbnailAt?: number;      // نقطة الوقت للصورة المصغرة
}

// نتيجة معالجة الفيديو
export interface VideoProcessingResult {
  compressedFile: File;        // الملف المضغوط
  thumbnail: {                 // الصورة المصغرة
    blob: Blob;
    width: number;
    height: number;
    dataUrl: string;
  };
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    duration?: number;
  };
}

// هوك ضغط الفيديو
export function createVideoCompressionSystem(
  supabaseClient: any,  // Supabase client للاستخدام
  storageBucket: string, // اسم bucket للملفات
  mediaDbTable: string  // اسم جدول البيانات (اختياري)
) {
  
  // التحقق من صحة ملف الفيديو
  const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: 'لم يتم اختيار ملف' };
    }

    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'الملف يجب أن يكون فيديو' };
    }

    // التحقق من حجم الملف (حد أقصى 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'حجم الفيديو كبير جداً (حد أقصى 50MB)' };
    }

    // التحقق من امتداد الفيديو
    const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return { valid: false, error: 'نوع الفيديو غير مدعوم' };
    }

    return { valid: true };
  };

  // ضغط الفيديو عند الحاجة
  const compressVideoIfNeeded = async (file: File, options: VideoCompressionOptions = {}): Promise<File> => {
    const opts = {
      targetWidth: options.targetWidth ?? 640,
      fps: options.fps ?? 30,
      videoKbps: options.videoKbps ?? 900,
      audioKbps: options.audioKbps ?? 96,
      minSizeForCompression: options.minSizeForCompression ?? 10 * 1024 * 1024, // 10MB
      ...options
    };

    // إذا كان الملف أقل من الحد الأدنى، لا نحتاج ضغط
    if (file.size < opts.minSizeForCompression) {
      return file;
    }

    try {
      // استخدام transcodeVideo من utils/media
      const { transcodeVideo } = await import('./media');
      const compressed = await transcodeVideo(file, {
        targetWidth: opts.targetWidth,
        fps: opts.fps,
        videoKbps: opts.videoKbps,
        audioKbps: opts.audioKbps
      });
      
      return compressed;
    } catch (error) {
      console.warn('فشل في ضغط الفيديو، سيتم استخدام الملف الأصلي:', error);
      return file;
    }
  };

  // معالجة الفيديو مع ضغط وإنشاء مصغرة
  const processVideo = async (
    file: File, 
    options: VideoCompressionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<VideoProcessingResult | null> => {
    
    // التحقق من صحة الملف
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const opts = {
      thumbnailAt: options.thumbnailAt ?? 0.2,
      ...options
    };

    const originalSize = file.size;

    try {
      onProgress?.(10);

      // ضغط الفيديو إذا لزم الأمر
      const processedFile = await compressVideoIfNeeded(file, options);
      onProgress?.(30);

      // إنشاء الصورة المصغرة
      const thumbnailData = await generateVideoThumbnail(processedFile, opts.thumbnailAt);
      onProgress?.(70);

      // رفع الملف المضغوط
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      const filePath = `videos/${fileName}`;
      
      const { error: uploadError } = await supabaseClient
        .storage
        .from(storageBucket)
        .upload(filePath, processedFile, {
          upsert: true,
          cacheControl: '3600',
          contentType: processedFile.type
        });

      if (uploadError) {
        throw new Error(`فشل في رفع الفيديو: ${uploadError.message}`);
      }

      // رفع الصورة المصغرة
      const thumbName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_thumb.webp`;
      const thumbPath = `thumbnails/${thumbName}`;
      
      const { error: thumbUploadError } = await supabaseClient
        .storage
        .from(storageBucket)
        .upload(thumbPath, thumbnailData.blob, {
          upsert: true,
          cacheControl: '3600',
          contentType: 'image/webp'
        });

      if (thumbUploadError) {
        console.warn('فشل في رفع الصورة المصغرة:', thumbUploadError);
      }

      onProgress?.(100);

      return {
        compressedFile: processedFile,
        thumbnail: thumbnailData,
        metadata: {
          originalSize,
          compressedSize: processedFile.size,
          compressionRatio: Math.round((1 - (processedFile.size / originalSize)) * 100),
        }
      };

    } catch (error) {
      console.error('خطأ في معالجة الفيديو:', error);
      throw new Error(`فشل في معالجة الفيديو: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  // حفظ بيانات الفيديو في قاعدة البيانات (اختياري)
  const saveVideoToDb = async (
    result: VideoProcessingResult,
    filePath: string,
    thumbPath: string,
    userId: string,
    metadata: any = {}
  ) => {
    if (!mediaDbTable) return null;

    try {
      const { data, error } = await supabaseClient
        .from(mediaDbTable)
        .insert({
          user_id: userId,
          file_path: filePath,
          thumbnail_path: thumbPath,
          file_size: result.metadata.compressedSize,
          original_size: result.metadata.originalSize,
          compression_ratio: result.metadata.compressionRatio,
          duration: result.metadata.duration,
          width: result.thumbnail.width,
          height: result.thumbnail.height,
          ...metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('خطأ في حفظ بيانات الفيديو:', error);
      return null;
    }
  };

  return {
    validateVideoFile,
    compressVideoIfNeeded,
    processVideo,
    saveVideoToDb,
    // الثوابت للإعدادات
    defaultOptions: {
      targetWidth: 640,
      fps: 30,
      videoKbps: 900,
      audioKbps: 96,
      minSizeForCompression: 10 * 1024 * 1024,
      thumbnailAt: 0.2
    } as VideoCompressionOptions
  };
}

// إنشاء النظام للتطبيق الأساسي
export const mainAppVideoCompression = createVideoCompressionSystem(
  // سيتم تمرير المعاملات في الاستخدام
  null as any,
  'call-files',  // bucket للتطبيق الأساسي
  ''             // لا نحفظ في جدول منفصل للتطبيق الأساسي
);

// Types للاستخدام المباشر
export type VideoCompression = ReturnType<typeof createVideoCompressionSystem>;

// التصدير التلقائي للاستخدام
export default {
  createVideoCompressionSystem,
  mainAppVideoCompression
};