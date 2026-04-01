import { supabase } from './supabase';

export interface R2UploadResult {
    fileKey: string;
    publicUrl: string;
    bucket: 'conv-audios' | 'conv-documents' | 'conv-images' | 'conv-videos';
}

export type ChatBucketName = 'conv-audios' | 'conv-documents' | 'conv-images' | 'conv-videos';

export const ChatR2Service = {
    /**
     * رفع ملف إلى Cloudflare R2 الخاص بالمحادثات
     * @param file الملف المراد رفعه
     * @param bucketName اسم الباكيت (conv-videos, conv-images, conv-audios, conv-documents)
     * @param userId معرف المستخدم
     * @param onProgress دالة تتبع التقدم (اختياري)
     */
    async uploadFile(
        file: File | Blob,
        bucketName: ChatBucketName,
        userId: string,
        onProgress?: (progress: number) => void
    ): Promise<R2UploadResult> {
        try {
            // 1. طلب Signed URL من Edge Function
            const payload = {
                name: (file as File).name || `blob_${Date.now()}`,
                mimeType: file.type || 'application/octet-stream',
                bucketName,
                userId,
            };

            console.log('🚀 ChatR2Service: Requesting Upload URL', payload);

            const { data, error } = await supabase.functions.invoke('chat-r2-upload', {
                body: payload,
            });

            if (error) {
                // محاولة استخراج رسالة الخطأ من الرد إذا كانت متوفرة
                try {
                    const errorBody = error.context ? await error.context.json() : null;
                    console.error('❌ Edge Function Error Details:', errorBody);
                    if (errorBody && errorBody.error) throw new Error(errorBody.error);
                } catch (jsonErr) { }

                throw error;
            }
            if (!data?.uploadUrl) throw new Error('فشل الحصول على رابط الرفع');

            console.log('✅ ChatR2Service: Signed URL Received', data);

            const { uploadUrl, fileKey, publicUrl } = data;

            // 2. رفع الملف مباشرة باستخدام XMLHttpRequest (لدعم شريط التقدم)
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        onProgress(Math.round(percentComplete));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve({
                            fileKey,
                            publicUrl,
                            bucket: bucketName,
                        });
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));

                xhr.send(file);
            });

        } catch (error: any) {
            console.error('R2 Upload Error:', error);
            throw new Error(`فشل رفع الملف: ${error.message || 'خطأ غير معروف'}`);
        }
    },

    /**
     * حذف ملف من Cloudflare R2
     * @param fileKey مفتاح الملف
     * @param bucketName اسم الباكيت
     */
    async deleteFile(fileKey: string, bucketName: ChatBucketName): Promise<void> {
        try {
            const { error } = await supabase.functions.invoke('shagram-r2-delete', {
                body: {
                    fileKey,
                    bucketName,
                },
            });

            if (error) throw error;
        } catch (error) {
            console.error('R2 Delete Error:', error);
            // لا نرمي خطأ هنا حتى لا نوقف عملية الحذف من قاعدة البيانات إذا فشل حذف الملف
        }
    }
};
