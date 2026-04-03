
import { useCallback, useState } from 'react';
import type { Message } from '../types';
import { supabase } from '../services/supabase';
import { getUserData } from '../services/UserDataCache';
// تم إيقاف tusUpload والاستبدال بـ R2
// import { tusUpload } from '../utils/tusUpload';
import { toast } from 'react-hot-toast';
import { processMediaForSending, cleanupProcessingResult } from '../utils/media/pipeline/mediaProcessor';
import { ChatR2Service } from '../services/ChatR2Service';

export function useSend(
  conversationId: string | null | undefined,
  user: { id: string; email?: string; user_metadata?: any } | null
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const finalizeOptimistic = useCallback((clientId: string, serverId: string, updates: any = {}) => {
    setOptimisticMessages(prev => prev.map(m => (m as any).client_id === clientId ? { ...m, status: 'sent', server_id: serverId, ...updates } as any : m));
  }, []);

  const sendText = useCallback(async (text: string, replyToMessage?: Message) => {
    if (!text.trim() || !conversationId || !user) return;
    const clientId = `c_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)} `;
    const tempId = `temp_${Date.now()}_${Math.random()} `;
    const userData = await getUserData(user.id, supabase);
    const username = userData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'أنت';
    const avatarUrl = userData?.avatar_url || user.user_metadata?.avatar_url || null;

    const metaData = {
      sender_username: username,
      sender_avatar_url: avatarUrl,
      client_id: clientId,
      app_name: 'shamil_chat_pwa', // ✨ تمييز مصدر الرسالة للإشعارات
      ...(replyToMessage ? {
        reply_snapshot: {
          id: replyToMessage.id,
          text: replyToMessage.text || replyToMessage.content || '',
          message_type: replyToMessage.message_type,
          sender_username: replyToMessage.sender?.username || (replyToMessage as any).sender_username || 'مستخدم'
        }
      } : {})
    };

    const optimistic: any = {
      id: tempId,
      conversationId,
      text: text.trim(),
      senderId: user.id,
      timestamp: new Date().toISOString(),
      message_type: 'text',
      status: 'sending',
      sender: { id: user.id, username, avatar_url: avatarUrl },
      media_metadata: metaData,
      client_id: clientId,
      reply_to: replyToMessage?.id, // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id
      reply_to_message: replyToMessage, // For optimistic UI
    };
    setOptimisticMessages(prev => [...prev, optimistic]);

    // ✅ التحقق من صحة UUID لتجنب أخطاء قاعدة البيانات عند الرد على رسائل تفاؤلية (Temp ID)
    const isReplyUUID = replyToMessage?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyToMessage.id);

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text.trim(),
      message_type: 'text',
      reply_to: isReplyUUID ? replyToMessage.id : null, // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id
      media_metadata: metaData,
    }).select().single();

    if (!error && data) finalizeOptimistic(clientId, data.id, { text: text.trim() });
    else setOptimisticMessages(prev => prev.map(m => (m as any).client_id === clientId ? { ...m, status: 'failed' } as any : m));
  }, [conversationId, user, finalizeOptimistic]);

  const sendAudio = useCallback(async (audioBlob: Blob, duration: number, caption?: string) => {
    if (!conversationId || !user) return;
    setIsUploading(true); setUploadProgress(0);
    try {
      const clientId = `c_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)} `;

      // ✅ 1. رفع الصوت إلى R2 (conv-audios)
      const uploadResult = await ChatR2Service.uploadFile(
        audioBlob,
        'conv-audios',
        user.id,
        (progress) => setUploadProgress(progress)
      );

      // البيانات المسترجعة من الرفع
      const filePath = uploadResult.publicUrl; // نستخدم الرابط العام مباشرة
      const fileKey = uploadResult.fileKey;

      setUploadProgress(100);

      const userData = await getUserData(user.id, supabase);
      const username = userData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'أنت';
      const avatarUrl = userData?.avatar_url || user.user_metadata?.avatar_url || null;

      const tempId = `temp_audio_${Date.now()}_${Math.random()} `;

      // ✅ تحديث Metadata ليشمل provider: r2
      const mediaMetadata = {
        path: filePath, // للاحتفاظ بالتوافق
        key: fileKey,
        bucket: 'conv-audios',
        provider: 'r2',
        mime: 'audio/ogg',
        size: audioBlob.size,
        client_id: clientId,
        sender_username: username,
        sender_avatar_url: avatarUrl,
        source: 'recorder',
        is_recording: true,
        duration: duration, // إضافة المدة
        app_name: 'shamil_chat_pwa', // ✨ تمييز مصدر الرسالة للإشعارات
        ...(caption ? { caption: caption.trim() } : {}),
      };

      const optimistic: any = {
        id: tempId,
        conversationId,
        text: filePath,
        senderId: user.id,
        timestamp: new Date().toISOString(),
        message_type: 'audio',
        status: 'sending',
        sender: { id: user.id, username, avatar_url: avatarUrl },
        media_metadata: mediaMetadata,
        client_id: clientId,
      };
      setOptimisticMessages(prev => [...prev, optimistic]);

      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: filePath,
        message_type: 'audio',
        media_metadata: mediaMetadata,
      }).select().single();

      if (!error && data) finalizeOptimistic(clientId, data.id, { text: filePath, content: filePath, media_metadata: mediaMetadata });
      else setOptimisticMessages(prev => prev.map(m => (m as any).client_id === clientId ? { ...m, status: 'failed' } as any : m));
    } catch (e: any) {
      console.error("Audio Upload error:", e);
      toast.error("فشل رفع التسجيل الصوتي");
    } finally { setIsUploading(false); setUploadProgress(0); }
  }, [conversationId, user, finalizeOptimistic]);

  // ✅ إرسال صورة من File مباشرة (للصق من الحافظة)
  const sendImageFile = useCallback(async (file: File) => {
    if (!conversationId || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('نوع الملف غير مدعوم. يرجى لصق صورة فقط.');
      return;
    }

    setIsUploading(true); setUploadProgress(0);
    let processingResult: any = null;

    try {
      const clientId = `c_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      let fileToUpload: File = file;
      let metadataAdditions: any = {};

      // معالجة الصورة (ضغط + تجريد EXIF)
      try {
        processingResult = await processMediaForSending(file, 'image');
        processingResult.warnings.forEach((warning: string) => toast.success(warning, { duration: 3000, icon: '🔒' }));
        fileToUpload = processingResult.finalFile;
        metadataAdditions = {
          width: processingResult.metadata.width,
          height: processingResult.metadata.height,
          blurhash: processingResult.metadata.blurhash,
          orientation: processingResult.metadata.orientation,
        };
      } catch (err) {
        console.warn('Image processing failed, uploading original', err);
      }

      const userData = await getUserData(user.id, supabase);
      const username = userData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'أنت';
      const avatarUrl = userData?.avatar_url || user.user_metadata?.avatar_url || null;
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const localPreviewUrl = processingResult?.localPreview?.localObjectUrl || URL.createObjectURL(file);

      const initialMetadata = {
        mime: fileToUpload.type,
        size: fileToUpload.size,
        client_id: clientId,
        sender_username: username,
        sender_avatar_url: avatarUrl,
        provider: 'r2',
        bucket: 'conv-images',
        source: 'clipboard', // مصدر: الحافظة
        app_name: 'shamil_chat_pwa', // ✨ تمييز مصدر الرسالة للإشعارات
        ...metadataAdditions,
      };

      const optimistic: any = {
        id: tempId,
        conversationId,
        text: localPreviewUrl,
        senderId: user.id,
        timestamp: new Date().toISOString(),
        message_type: 'image',
        status: 'sending',
        sender: { id: user.id, username, avatar_url: avatarUrl },
        media_metadata: initialMetadata,
        client_id: clientId,
        localUrl: localPreviewUrl,
        thumbnail: processingResult?.localPreview?.thumbnailDataUrl,
      };

      setOptimisticMessages(prev => [...prev, optimistic]);

      // الرفع إلى R2
      const uploadResult = await ChatR2Service.uploadFile(
        fileToUpload,
        'conv-images',
        user.id,
        (progress) => setUploadProgress(progress)
      );

      setUploadProgress(100);

      const finalMetadata = {
        ...initialMetadata,
        path: uploadResult.publicUrl,
        key: uploadResult.fileKey,
      };

      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: uploadResult.publicUrl,
        message_type: 'image',
        media_metadata: finalMetadata,
      }).select().single();

      if (!error && data) {
        finalizeOptimistic(clientId, data.id, {
          text: uploadResult.publicUrl,
          content: uploadResult.publicUrl,
          localUrl: uploadResult.publicUrl,
          media_metadata: finalMetadata
        });
        if (processingResult) cleanupProcessingResult(processingResult);
        if (!processingResult && localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        toast.success('تم إرسال الصورة بنجاح ✅');
      } else {
        throw error || new Error('Insert failed');
      }

    } catch (e: any) {
      console.error("Paste Image Upload error:", e);
      toast.error("فشل إرسال الصورة: " + (e.message || "خطأ غير معروف"));
      if (processingResult) cleanupProcessingResult(processingResult);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [conversationId, user, finalizeOptimistic]);

  const pickAndSendMedia = useCallback(async (type: 'image' | 'video' | 'audio' | 'document') => {
    if (!conversationId || !user) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*, .mpeg' : '*/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true); setUploadProgress(0);

      let processingResult: any = null;

      try {
        const clientId = `c_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)} `;

        let bucketName: 'conv-images' | 'conv-videos' | 'conv-audios' | 'conv-documents';
        let fileToUpload: File = file;
        let metadataAdditions: any = {};

        // ✅ تحديد الباكيت ومعالجة الملفات
        if (type === 'image') {
          bucketName = 'conv-images';
          // معالجة الصور (ضغط + تجريد EXIF)
          try {
            processingResult = await processMediaForSending(file, 'image');
            processingResult.warnings.forEach((warning: string) => toast.success(warning, { duration: 3000, icon: '🔒' }));
            fileToUpload = processingResult.finalFile;
            metadataAdditions = {
              width: processingResult.metadata.width,
              height: processingResult.metadata.height,
              blurhash: processingResult.metadata.blurhash,
              orientation: processingResult.metadata.orientation,
            };
          } catch (err) {
            console.warn('Image processing failed, uploading original', err);
          }
        } else if (type === 'video') {
          bucketName = 'conv-videos';
          // معالجة الفيديو (فقط استخراج metadata حالياً لأن الضغط معقد)
          try {
            processingResult = await processMediaForSending(file, 'video');
            fileToUpload = processingResult.finalFile; // قد يكون الأصلي
          } catch (err: any) {
            if (err.message?.includes('15')) {
              toast.error(err.message);
              throw err;
            }
          }
        } else if (type === 'audio') {
          bucketName = 'conv-audios';
        } else {
          bucketName = 'conv-documents';
        }

        // ✅ عرض Optimistic (فوري)
        const userData = await getUserData(user.id, supabase);
        const username = userData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'أنت';
        const avatarUrl = userData?.avatar_url || user.user_metadata?.avatar_url || null;
        const tempId = `temp_${Date.now()}_${Math.random()} `;

        // إنشاء رابط محلي مؤقت للعرض
        const localPreviewUrl = processingResult?.localPreview?.localObjectUrl || URL.createObjectURL(file);

        // تجهيز Metadata المبدئي (بدون رابط R2 بعد)
        const initialMetadata = {
          mime: fileToUpload.type,
          size: fileToUpload.size,
          client_id: clientId,
          sender_username: username,
          sender_avatar_url: avatarUrl,
          provider: 'r2', // سنستخدم R2
          bucket: bucketName,
          app_name: 'shamil_chat_pwa', // ✨ تمييز مصدر الرسالة للإشعارات
          ...metadataAdditions,
          ...(type === 'audio' ? { source: 'picker' } : {}),
        };

        const optimistic: any = {
          id: tempId,
          conversationId,
          text: localPreviewUrl, // عرض محلي مؤقت
          senderId: user.id,
          timestamp: new Date().toISOString(),
          message_type: type === 'document' ? 'file' : type,
          status: 'sending',
          sender: { id: user.id, username, avatar_url: avatarUrl },
          media_metadata: initialMetadata,
          client_id: clientId,
          localUrl: localPreviewUrl, // للعرض الفوري
          thumbnail: processingResult?.localPreview?.thumbnailDataUrl,
        };

        setOptimisticMessages(prev => [...prev, optimistic]);

        // ✅ الرفع إلى R2
        const uploadResult = await ChatR2Service.uploadFile(
          fileToUpload,
          bucketName,
          user.id,
          (progress) => setUploadProgress(progress)
        );

        setUploadProgress(100);

        // ✅ البيانات النهائية بعد الرفع
        const finalFilePath = uploadResult.publicUrl;
        const finalFileKey = uploadResult.fileKey;

        // تحديث Metadata بالرابط الحقيقي
        const finalMetadata = {
          ...initialMetadata,
          path: finalFilePath,
          key: finalFileKey,
        };

        // ✅ حفظ في قاعدة البيانات
        const { data, error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: finalFilePath,
          message_type: type === 'document' ? 'file' : type,
          media_metadata: finalMetadata,
        }).select().single();

        if (!error && data) {
          finalizeOptimistic(clientId, data.id, {
            text: finalFilePath,
            content: finalFilePath,
            localUrl: finalFilePath,
            media_metadata: finalMetadata
          });

          // ✅ معالجة Thumbnail للفيديو (بعد النجاح)
          if (type === 'video' && processingResult) {
            (async () => {
              try {
                const { generateVideoThumbnail } = await import('../utils/media');
                // توليد thumbnail محلي
                const thumbResult = await generateVideoThumbnail(file, 0.5);
                if (thumbResult?.dataUrl) {
                  // يمكننا هنا رفع الـ thumbnail أيضاً إلى R2 (conv-images) أو تخزينه كـ base64 إذا كان صغيراً
                  // حالياً سنستخدم base64 في الـ RPC كما كان سابقاً للحفاظ على التوافق، أو رفعه مستقبلاً
                  // التوافق الحالي: update_message_thumbnail يخزن base64 في حقل thumbnail أو ما شابه

                  const { error: updateError } = await supabase.rpc('update_message_thumbnail', {
                    p_message_id: data.id,
                    p_thumbnail_data: thumbResult.dataUrl
                  });
                  if (!updateError) {
                    window.dispatchEvent(new CustomEvent('message-update', {
                      detail: {
                        conversationId,
                        action: 'update',
                        data: { id: data.id, media_metadata: { ...finalMetadata, thumbnail_data: thumbResult.dataUrl } }
                      }
                    }));
                  }
                }
              } catch (err) { console.warn('Thumbnail generation failed', err); }
            })();
          }

          // ✅ تنظيف
          if (processingResult) cleanupProcessingResult(processingResult);
          // إذا لم يكن هناك processingResult (مثل المستندات)، يجب تنظيف localPreviewUrl الذي أنشأناه يدوياً
          if (!processingResult && localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);

        } else {
          throw error || new Error('Insert failed');
        }

      } catch (e: any) {
        console.error("Upload error:", e);
        if (!e.message?.includes('15')) {
          toast.error("فشل الرفع: " + (e.message || "خطأ غير معروف"));
        }
        if (processingResult) cleanupProcessingResult(processingResult);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };
    input.click();
  }, [conversationId, user, finalizeOptimistic]);

  return { isUploading, uploadProgress, sendText, sendAudio, sendImageFile, pickAndSendMedia, optimisticMessages, setOptimisticMessages };
}