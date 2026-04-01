// ==========================================
// 📊 Background Thumbnail Service
// خدمة توليد الصور المصغرة في الخلفية (بدون Worker)
// ==========================================

import { supabase } from './supabase';

class BackgroundThumbnailService {
    private processingQueue: Set<string> = new Set();

    /**
     * توليد thumbnail في الخلفية (بدون Worker - main thread بعد تأخير)
     */
    async generateThumbnailInBackground(messageId: string, videoPath: string) {
        if (this.processingQueue.has(messageId)) {
            console.log('⏭️ تخطي - جاري المعالجة:', messageId);
            return;
        }

        this.processingQueue.add(messageId);

        // ✅ زيادة التأخير لضمان اكتمال رفع الفيديو
        setTimeout(async () => {
            try {
                console.log('📥 جلب الفيديو للرسالة:', messageId);

                // جلب signed URL من Supabase
                const path = videoPath.startsWith('public/') ? videoPath : `public/${videoPath}`;
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('call-files') // Ensure this bucket name is correct
                    .createSignedUrl(path, 900); // URL valid for 15 minutes

                if (urlError || !urlData?.signedUrl) {
                    throw new Error('فشل في إنشاء signed URL: ' + (urlError?.message || 'unknown'));
                }

                // جلب الفيديو كـ blob
                const response = await fetch(urlData.signedUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const blob = await response.blob();

                console.log('🎬 توليد thumbnail للرسالة:', messageId);

                // ✅ تحويل Blob إلى File (generateVideoThumbnail يتوقع File)
                const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });

                // ✅ توليد في main thread (async - لا يؤثر على UI)
                const { generateVideoThumbnail } = await import('../utils/media');
                const result = await generateVideoThumbnail(file, 0.5);

                if (result && result.dataUrl) {
                    console.log('💾 حفظ thumbnail في DB للرسالة:', messageId);
                    await this.saveThumbnailToDB(messageId, result.dataUrl, videoPath);
                    console.log('✅ اكتمل توليد وحفظ thumbnail للرسالة:', messageId);
                }
            } catch (error: any) {
                console.warn('⚠️ فشل توليد thumbnail للرسالة', messageId + ':', error.message);
            } finally {
                this.processingQueue.delete(messageId);
            }
        }, 2000); // ✅ تقليل التأخير من 5 إلى 2 ثانية لسرعة أفضل
    }

    /**
     * حفظ thumbnail في قاعدة البيانات وإرسال CustomEvent
     */
    private async saveThumbnailToDB(messageId: string, thumbnailDataUrl: string, videoPath: string) {
        try {
            console.log('🔍 [saveThumbnailToDB] بدء الحفظ للرسالة:', messageId);

            // قراءة conversation_id فقط
            const { data: currentMessage, error: fetchError } = await supabase
                .from('messages')
                .select('conversation_id')
                .eq('id', messageId)
                .single();

            if (fetchError) {
                console.error('❌ فشل جلب الرسالة:', fetchError);
                throw fetchError;
            }

            const conversationId = currentMessage?.conversation_id;

            console.log('💾 [saveThumbnailToDB] استدعاء Database Function...');

            // ✅ استخدام Database Function بدلاً من UPDATE مباشر (لتجاوز RLS)
            const { data: result, error } = await supabase.rpc('update_message_thumbnail', {
                p_message_id: messageId,
                p_thumbnail_data: thumbnailDataUrl
            });

            if (error) {
                console.error('❌ خطأ في Database Function:', error);
                throw error;
            }

            console.log('✅ [saveThumbnailToDB] تم الحفظ بنجاح في DB:', {
                messageId,
                hasResult: !!result,
                thumbnailSaved: !!result?.thumbnail_data
            });

            // ✅ إرسال CustomEvent مباشرة
            if (conversationId) {
                console.log('📤 إرسال CustomEvent للمحادثة:', conversationId);
                window.dispatchEvent(new CustomEvent('message-update', {
                    detail: {
                        conversationId,
                        action: 'update',
                        data: {
                            id: messageId,
                            media_metadata: result, // النتيجة من Database Function
                            ...(videoPath && { text: videoPath })
                        }
                    }
                }));
            }
        } catch (error) {
            console.error('❌ فشل حفظ thumbnail:', error);
            throw error;
        }
    }
}

// Singleton
export const thumbnailService = new BackgroundThumbnailService();
