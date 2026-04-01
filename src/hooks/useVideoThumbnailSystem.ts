import { useState, useCallback } from 'react';
import { cacheManager } from '../services/CacheManager';
// ✅ استيراد ديناميكي لتجنب تحذير Vite حول الاستيراد المختلط
// import { generateVideoThumbnail } from '../utils/media';

interface VideoThumbnailData {
  blob: Blob;
  width: number;
  height: number;
  dataUrl: string;
  cached: boolean;
}

interface UseVideoThumbnailSystemReturn {
  // إدارة حالة تحميل الصور المصغرة
  thumbnailStates: Map<string, VideoThumbnailData>;

  // توليد أو استرجاع صورة مصغرة
  getOrGenerateThumbnail: (
    messageId: string,
    videoFile: File,
    forceRegenerate?: boolean
  ) => Promise<VideoThumbnailData | null>;

  // حفظ صورة مصغرة في الكاش
  saveThumbnail: (messageId: string, data: VideoThumbnailData) => Promise<void>;

  // استرجاع صورة مصغرة من الكاش
  getCachedThumbnail: (messageId: string) => Promise<VideoThumbnailData | null>;

  // مسح صورة مصغرة من الكاش
  clearThumbnail: (messageId: string) => Promise<void>;

  // مسح جميع الصور المصغرة
  clearAllThumbnails: () => Promise<void>;

  // إدارة حالة التحميل
  isGenerating: (messageId: string) => boolean;
  setGenerating: (messageId: string, generating: boolean) => void;

  // معالجة الأخطاء
  getError: (messageId: string) => string | null;
  setError: (messageId: string, error: string | null) => void;
}

export function useVideoThumbnailSystem(): UseVideoThumbnailSystemReturn {
  const [thumbnailStates] = useState<Map<string, VideoThumbnailData>>(new Map());
  const [generatingStates] = useState<Map<string, boolean>>(new Map());
  const [errorStates] = useState<Map<string, string>>(new Map());

  // توليد أو استرجاع صورة مصغرة
  const getOrGenerateThumbnail = useCallback(async (
    messageId: string,
    videoFile: File,
    forceRegenerate: boolean = false
  ): Promise<VideoThumbnailData | null> => {
    // التحقق من وجود النتيجة في الذاكرة المحلية أولاً
    const cachedLocal = thumbnailStates.get(messageId);
    if (cachedLocal && !forceRegenerate) {
      return cachedLocal;
    }

    // التحقق من حالة التوليد الحالية
    if (generatingStates.get(messageId)) {
      // في حالة التوليد، انتظر حتى ينتهي
      return new Promise((resolve) => {
        const checkGeneration = () => {
          if (!generatingStates.get(messageId)) {
            const result = thumbnailStates.get(messageId);
            resolve(result || null);
          } else {
            setTimeout(checkGeneration, 100);
          }
        };
        checkGeneration();
      });
    }

    // تعيين حالة التوليد
    generatingStates.set(messageId, true);
    setError(messageId, null);

    try {
      // محاولة الاسترجاع من الكاش
      if (!forceRegenerate) {
        const cachedData = await getCachedThumbnail(messageId);
        if (cachedData) {
          // حفظ في الذاكرة المحلية للاستجابة السريعة
          thumbnailStates.set(messageId, cachedData);
          generatingStates.set(messageId, false);
          return cachedData;
        }
      }

      // توليد صورة مصغرة جديدة (استيراد ديناميكي)
      const { generateVideoThumbnail } = await import('../utils/media');
      const thumb = await generateVideoThumbnail(videoFile, 0.2);
      const thumbnailData: VideoThumbnailData = {
        blob: thumb.blob,
        width: thumb.width,
        height: thumb.height,
        dataUrl: thumb.dataUrl,
        cached: false
      };

      // حفظ في الكاش والذاكرة المحلية
      await saveThumbnail(messageId, thumbnailData);
      thumbnailStates.set(messageId, thumbnailData);

      generatingStates.set(messageId, false);
      return thumbnailData;

    } catch (error) {
      const errorMessage = `فشل في توليد الصورة المصغرة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`;
      setError(messageId, errorMessage);
      generatingStates.set(messageId, false);
      console.error('خطأ في توليد الصورة المصغرة:', error);
      return null;
    }
  }, [thumbnailStates, generatingStates, errorStates]);

  // حفظ صورة مصغرة في الكاش
  const saveThumbnail = useCallback(async (messageId: string, data: VideoThumbnailData): Promise<void> => {
    try {
      // حفظ البيانات المنفصلة في المخازن الصحيحة
      await Promise.all([
        cacheManager.set('media', `thumb_${messageId}`, data.blob, 30 * 24 * 60 * 60 * 1000), // 30 يوم
        cacheManager.set('metadata', `thumb_meta_${messageId}`, {
          width: data.width,
          height: data.height,
          dataUrl: data.dataUrl,
          timestamp: Date.now()
        }, 30 * 24 * 60 * 60 * 1000) // 30 يوم
      ]);

      // تحديث الحالة المحلية
      thumbnailStates.set(messageId, { ...data, cached: true });
    } catch (error) {
      const errorMessage = `فشل في حفظ الصورة المصغرة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`;
      setError(messageId, errorMessage);
      console.error('خطأ في حفظ الصورة المصغرة:', error);
    }
  }, [thumbnailStates]);

  // استرجاع صورة مصغرة من الكاش
  const getCachedThumbnail = useCallback(async (messageId: string): Promise<VideoThumbnailData | null> => {
    try {
      const [blob, meta] = await Promise.all([
        cacheManager.get('media', `thumb_${messageId}`) as any,
        cacheManager.get('metadata', `thumb_meta_${messageId}`) as any
      ]);

      if (blob && meta && meta.width && meta.height && meta.dataUrl) {
        return {
          blob: blob,
          width: meta.width,
          height: meta.height,
          dataUrl: meta.dataUrl,
          cached: true
        };
      }

      return null;
    } catch (error) {
      console.error('خطأ في استرجاع الصورة المصغرة من الكاش:', error);
      return null;
    }
  }, []);

  // مسح صورة مصغرة من الكاش
  const clearThumbnail = useCallback(async (messageId: string): Promise<void> => {
    try {
      await Promise.all([
        cacheManager.delete('media', `thumb_${messageId}`),
        cacheManager.delete('metadata', `thumb_meta_${messageId}`)
      ]);
      thumbnailStates.delete(messageId);
      generatingStates.delete(messageId);
      errorStates.delete(messageId);
    } catch (error) {
      console.error('خطأ في مسح الصورة المصغرة:', error);
    }
  }, [thumbnailStates, generatingStates, errorStates]);

  // مسح جميع الصور المصغرة
  const clearAllThumbnails = useCallback(async (): Promise<void> => {
    try {
      // مسح الكاش من قاعدة البيانات
      const keys = await cacheManager.keys();
      for (const key of keys) {
        if (key.startsWith('media:thumb_') || key.startsWith('metadata:thumb_meta_')) {
          const [store, id] = key.split(':');
          if (store && id) {
            await cacheManager.delete(store, id);
          }
        }
      }

      // مسح الذاكرة المحلية
      thumbnailStates.clear();
      generatingStates.clear();
      errorStates.clear();
    } catch (error) {
      console.error('خطأ في مسح جميع الصور المصغرة:', error);
    }
  }, [thumbnailStates, generatingStates, errorStates]);

  // إدارة حالة التحميل
  const isGenerating = useCallback((messageId: string): boolean => {
    return generatingStates.get(messageId) || false;
  }, [generatingStates]);

  const setGenerating = useCallback((messageId: string, generating: boolean): void => {
    generatingStates.set(messageId, generating);
  }, [generatingStates]);

  // إدارة الأخطاء
  const getError = useCallback((messageId: string): string | null => {
    return errorStates.get(messageId) || null;
  }, [errorStates]);

  const setError = useCallback((messageId: string, error: string | null): void => {
    if (error) {
      errorStates.set(messageId, error);
    } else {
      errorStates.delete(messageId);
    }
  }, [errorStates]);

  return {
    thumbnailStates,
    getOrGenerateThumbnail,
    saveThumbnail,
    getCachedThumbnail,
    clearThumbnail,
    clearAllThumbnails,
    isGenerating,
    setGenerating,
    getError,
    setError
  };
}

// ثابت للاستخدام في التطبيق
export const videoThumbnailSystem = {
  useHook: useVideoThumbnailSystem
};