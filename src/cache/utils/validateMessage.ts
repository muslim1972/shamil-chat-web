import type { CachedMessage } from '../types/cacheTypes';
import { videoThumbnailSystem } from '../../hooks/useVideoThumbnailSystem';

// تحسين التحقق من الرسائل لتجنب التحميل الزائد
export async function validateMessage(
  message: CachedMessage,
  options: {
    downloadMedia?: boolean;
    generateThumbnail?: boolean;
    priority?: 'high' | 'normal' | 'low';
  } = {}
): Promise<CachedMessage> {
  
  // القيم الافتراضية
  const {
    downloadMedia = false,      // لا نحمل الوسائط افتراضياً
    generateThumbnail = false,   // لا نولد thumbnails افتراضياً
    priority = 'normal'
  } = options;
  
  // إذا كانت رسالة نصية، لا حاجة للتدقيق
  if (message.message_type === 'text' || message.message_type === 'forwarded_block') {
    return message;
  }

  let validated = { ...message };
  
  // تحميل mediaBlob فقط إذا طُلب ذلك صراحة
  if (downloadMedia && !validated.mediaBlob && validated.signedUrl) {
    try {
      // تحديد حجم التحميل حسب الأولوية
      const controller = new AbortController();
      const timeout = priority === 'high' ? 30000 : priority === 'low' ? 5000 : 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(validated.signedUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const blob = await response.blob();
        
        // التحقق من حجم الملف
        const maxSize = 10 * 1024 * 1024; // 10MB حد أقصى
        if (blob.size <= maxSize) {
          validated.mediaBlob = blob;
        } else {
          console.warn(`[Validate] Media too large: ${blob.size} bytes`);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[Validate] Download timeout for:', message.id);
      } else {
        console.error('[Validate] Failed to download media:', error);
      }
    }
  }

  // توليد thumbnail للفيديو فقط إذا طُلب
  if (generateThumbnail && validated.message_type === 'video') {
    if (validated.mediaBlob && !validated.thumbnailBlob && !validated.thumbnail) {
      try {
        // استخدام النظام المعزول الجديد للصور المصغرة
        // ملاحظة: هذا يتطلب React component context، لذا نترك التحقق من الكاش للواجهة
        // النظام الجديد يتعامل مع هذا في المستوى الأعلى
      } catch (error) {
        console.error('[Validate] Failed to generate thumbnail:', error);
      }
    }
  }

  return validated;
}

// التحقق من مجموعة رسائل بكفاءة
export async function validateMessages(
  messages: CachedMessage[],
  options: {
    maxConcurrent?: number;
    downloadMedia?: boolean;
    generateThumbnails?: boolean;
  } = {}
): Promise<CachedMessage[]> {
  
  const {
    maxConcurrent = 3,  // معالجة 3 رسائل في وقت واحد كحد أقصى
    downloadMedia = false,
    generateThumbnails = false
  } = options;
  
  // تقسيم الرسائل لدفعات للمعالجة المتوازية المحدودة
  const results: CachedMessage[] = [];
  
  for (let i = 0; i < messages.length; i += maxConcurrent) {
    const batch = messages.slice(i, i + maxConcurrent);
    
    const validatedBatch = await Promise.all(
      batch.map(msg => 
        validateMessage(msg, {
          downloadMedia,
          generateThumbnail: generateThumbnails,
          priority: i < 10 ? 'high' : 'normal' // أولوية عالية لأول 10 رسائل
        })
      )
    );
    
    results.push(...validatedBatch);
    
    // تأخير صغير بين الدفعات لتجنب الضغط
    if (i + maxConcurrent < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// دالة للتحقق من رسالة واحدة عند الحاجة (lazy validation)
export async function lazyValidateMessage(
  message: CachedMessage
): Promise<CachedMessage> {
  // فقط تحقق من وجود URL صالح
  const validated = { ...message };
  
  if (!validated.signedUrl && validated.message_type !== 'text') {
    // محاولة الحصول على URL من metadata
    const meta = (validated as any).media_metadata || {};
    const path = meta.path || meta.file_path || meta.storage_path;
    
    if (path) {
      // سيتم حل URL لاحقاً عند الحاجة
      (validated as any).pendingMediaPath = path;
    }
  }
  
  return validated;
}

// دالة لتنظيف الرسائل القديمة من الذاكرة
export function cleanupOldMessages(
  messages: CachedMessage[],
  keepCount: number = 50
): CachedMessage[] {
  // الاحتفاظ بآخر keepCount رسالة فقط
  if (messages.length <= keepCount) {
    return messages;
  }
  
  // ترتيب حسب التوقيت والاحتفاظ بالأحدث
  const sorted = [...messages].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const toKeep = sorted.slice(0, keepCount);
  const toRemove = sorted.slice(keepCount);
  
  // تنظيف blob URLs للرسائل المحذوفة
  toRemove.forEach(msg => {
    if ((msg as any).blobUrl) {
      URL.revokeObjectURL((msg as any).blobUrl);
    }
    if ((msg as any).thumbnailUrl) {
      URL.revokeObjectURL((msg as any).thumbnailUrl);
    }
  });
  
  return toKeep;
}