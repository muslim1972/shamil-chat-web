/**
 * Hook مخصص لتوليد الصور المصغرة للفيديو
 * يعمل مع نظام الحماية المتطور
 */

import { useCallback } from 'react';
import { generateVideoThumbnail } from '../utils/media';
import { useModuleProtection } from './useModuleProtection';
import { useVideoThumbnailSystem } from './useVideoThumbnailSystem';

export interface UseVideoThumbnailGenerationReturn {
  generateThumbnailForMessage: (messageId: string, videoFile?: File) => Promise<string | null>;
  generateThumbnailFromUrl: (messageId: string, videoUrl: string) => Promise<string | null>;
  isGeneratingMessage: (messageId: string) => boolean;
  hasError: (messageId: string) => boolean;
  getError: (messageId: string) => string | null;
}

export function useVideoThumbnailGeneration(): UseVideoThumbnailGenerationReturn {
  const {
    getOrGenerateThumbnail,
    isGenerating: systemGenerating,
    getError: systemGetError,
    setError: systemSetError
  } = useVideoThumbnailSystem();
  
  const { isModuleProtected } = useModuleProtection();

  const generateThumbnailForMessage = useCallback(async (
    messageId: string,
    videoFile?: File
  ): Promise<string | null> => {
    // التحقق من حماية الوحدة
    if (isModuleProtected('video-thumbnail')) {
      console.warn('وحدة الصور المصغرة محمية - لا يمكن التعديل');
      return null;
    }

    try {
      if (!videoFile) {
        throw new Error('لم يتم توفير ملف فيديو');
      }

      const thumbnailData = await getOrGenerateThumbnail(messageId, videoFile);
      if (thumbnailData) {
        systemSetError(messageId, null);
        return thumbnailData.dataUrl;
      } else {
        const error = systemGetError(messageId);
        if (error) {
          systemSetError(messageId, error);
        }
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      systemSetError(messageId, errorMessage);
      console.error('فشل في توليد الصورة المصغرة:', error);
      return null;
    }
  }, [getOrGenerateThumbnail, systemGetError, systemSetError, isModuleProtected]);

  const generateThumbnailFromUrl = useCallback(async (
    messageId: string,
    videoUrl: string
  ): Promise<string | null> => {
    // التحقق من حماية الوحدة
    if (isModuleProtected('video-thumbnail')) {
      console.warn('وحدة الصور المصغرة محمية - لا يمكن التعديل');
      return null;
    }

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`فشل في تحميل الفيديو: ${response.status}`);
      }

      const videoBlob = await response.blob();
      const videoFile = new File([videoBlob], 'video.mp4', { type: 'video/mp4' });

      const thumbnailData = await getOrGenerateThumbnail(messageId, videoFile);
      if (thumbnailData) {
        systemSetError(messageId, null);
        return thumbnailData.dataUrl;
      } else {
        const error = systemGetError(messageId);
        if (error) {
          systemSetError(messageId, error);
        }
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      systemSetError(messageId, errorMessage);
      console.error('فشل في تحميل الفيديو لتوليد الصورة المصغرة:', error);
      return null;
    }
  }, [getOrGenerateThumbnail, systemGetError, systemSetError, isModuleProtected]);

  return {
    generateThumbnailForMessage,
    generateThumbnailFromUrl,
    isGeneratingMessage: systemGenerating,
    hasError: (messageId: string) => systemGetError(messageId) !== null,
    getError: systemGetError
  };
}