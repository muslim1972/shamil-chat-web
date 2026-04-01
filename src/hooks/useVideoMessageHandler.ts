import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVideoThumbnailSystem } from './useVideoThumbnailSystem';

interface VideoMessageData {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  dataUrl: string;
}

interface UseVideoMessageHandlerReturn {
  // معالجة الفيديو وإرسال الرسالة
  sendVideoMessage: (
    file: File,
    caption?: string
  ) => Promise<VideoMessageData | null>;
  
  // معالجة رفع الفيديو مع الصورة المصغرة
  processVideoWithThumbnail: (
    file: File,
    onProgress?: (progress: number) => void
  ) => Promise<VideoMessageData | null>;
  
  // التحقق من صحة ملف الفيديو
  validateVideoFile: (file: File) => { valid: boolean; error?: string };
  
  // ضغط الفيديو عند الحاجة
  compressVideoIfNeeded: (file: File) => Promise<File>;
  
  // إدارة حالات الخطأ والحالة
  getProcessingStatus: (messageId: string) => 'idle' | 'processing' | 'completed' | 'error';
  getProcessingError: (messageId: string) => string | null;
  clearProcessingState: (messageId: string) => void;
}

export function useVideoMessageHandler(): UseVideoMessageHandlerReturn {
  const { user } = useAuth();
  const videoThumbnailSystem = useVideoThumbnailSystem();

  // التحقق من صحة ملف الفيديو
  const validateVideoFile = useCallback((file: File): { valid: boolean; error?: string } => {
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
  }, []);

  // ضغط الفيديو عند الحاجة
  const compressVideoIfNeeded = useCallback(async (file: File): Promise<File> => {
    // إذا كان الملف أقل من 10MB، لا نحتاج ضغط
    if (file.size < 10 * 1024 * 1024) {
      return file;
    }

    try {
      // استخدام transcodeVideo من utils/media
      const { transcodeVideo } = await import('../utils/media');
      const compressed = await transcodeVideo(file, {
        targetWidth: 640,
        fps: 30,
        videoKbps: 900,
        audioKbps: 96
      });
      
      return compressed;
    } catch (error) {
      console.warn('فشل في ضغط الفيديو، سيتم استخدام الملف الأصلي:', error);
      return file;
    }
  }, []);

  // معالجة الفيديو مع الصورة المصغرة
  const processVideoWithThumbnail = useCallback(async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<VideoMessageData | null> => {
    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    // التحقق من صحة الملف
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      onProgress?.(10);

      // ضغط الفيديو إذا لزم الأمر
      const processedFile = await compressVideoIfNeeded(file);
      onProgress?.(30);

      // إنشاء معرف فريد للرسالة
      const messageId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // توليد أو استرجاع الصورة المصغرة
      const thumbnailData = await videoThumbnailSystem.getOrGenerateThumbnail(
        messageId,
        processedFile
      );

      if (!thumbnailData) {
        throw new Error('فشل في توليد الصورة المصغرة');
      }

      onProgress?.(100);

      return {
        id: messageId,
        blob: thumbnailData.blob,
        width: thumbnailData.width,
        height: thumbnailData.height,
        dataUrl: thumbnailData.dataUrl
      };

    } catch (error) {
      console.error('خطأ في معالجة الفيديو:', error);
      throw new Error(`فشل في معالجة الفيديو: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }, [user, videoThumbnailSystem, validateVideoFile, compressVideoIfNeeded]);

  // إرسال رسالة فيديو
  const sendVideoMessage = useCallback(async (
    file: File,
    caption?: string
  ): Promise<VideoMessageData | null> => {
    try {
      // معالجة الفيديو والحصول على البيانات
      const videoData = await processVideoWithThumbnail(file);

      if (!videoData) {
        throw new Error('فشل في معالجة الفيديو');
      }

      // هنا يمكن إضافة منطق الإرسال الفعلي
      // مثل استدعاء useSend أو إرسال مباشرة إلى Supabase
      
      return videoData;

    } catch (error) {
      console.error('خطأ في إرسال الفيديو:', error);
      throw error;
    }
  }, [processVideoWithThumbnail]);

  // إدارة حالات المعالجة
  const processingStates = new Map<string, 'idle' | 'processing' | 'completed' | 'error'>();
  const processingErrors = new Map<string, string>();

  const getProcessingStatus = useCallback((messageId: string) => {
    return processingStates.get(messageId) || 'idle';
  }, []);

  const getProcessingError = useCallback((messageId: string) => {
    return processingErrors.get(messageId) || null;
  }, []);

  const clearProcessingState = useCallback((messageId: string) => {
    processingStates.delete(messageId);
    processingErrors.delete(messageId);
  }, []);

  return {
    sendVideoMessage,
    processVideoWithThumbnail,
    validateVideoFile,
    compressVideoIfNeeded,
    getProcessingStatus,
    getProcessingError,
    clearProcessingState
  };
}

// ثابت للاستخدام
export const videoMessageHandler = {
  useHook: useVideoMessageHandler
};