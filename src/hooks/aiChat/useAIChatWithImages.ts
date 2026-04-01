// src/hooks/aiChat/useAIChatWithImages.ts
import { useCallback } from 'react';
import { useAIConversationDetector } from './useAIConversationDetector';
import { useImageSelection } from './useImageSelection';
import { useSendAIWithImages } from './useSendAIWithImages';

/**
 * Hook موحد يدمج جميع وظائف AI + الصور
 * يستخدم في ChatScreen لإضافة دعم الصور للمحادثات AI
 */
export function useAIChatWithImages(conversationId: string, userId?: string) {
    // 1. كشف محادثات AI
    const isAIConversation = useAIConversationDetector(conversationId);

    // 2. إدارة اختيار الصور (فقط إذا كانت محادثة AI)
    const imageSelection = useImageSelection(4); // max 4 images

    // 3. إرسال الرسائل مع الصور
    const { sendWithImages, sendTextOnly, isSending } = useSendAIWithImages(
        conversationId,
        userId
    );

    /**
     * معالج موحد للإرسال - يتعامل مع النص والصور
     */
    const handleSend = useCallback(async (text: string) => {
        console.log('[🔍 AI SEND DEBUG] handleSend called with:', {
            text,
            hasImages: imageSelection.hasImages,
            selectedImagesCount: imageSelection.selectedImages.length,
            isAIConversation
        });
        try {
            if (imageSelection.hasImages) {
                console.log('[🔍 AI SEND DEBUG] Processing images...');
                // إرسال مع صور - معالجتها أولاً
                await imageSelection.processImages();
                console.log('[🔍 AI SEND DEBUG] Images processed, sending...');
                await sendWithImages(text, imageSelection.selectedImages.map((img: { file: File }) => img.file));
                console.log('[🔍 AI SEND DEBUG] Images sent, clearing...');
                imageSelection.clearImages();
            } else {
                console.log('[🔍 AI SEND DEBUG] No images, sending text only...');
                // إرسال نص فقط
                await sendTextOnly(text);
            }
            console.log('[🔍 AI SEND DEBUG] Send completed successfully');
        } catch (error) {
            console.error('[🔍 AI SEND DEBUG] Error sending AI message:', error);
            throw error;
        }
    }, [imageSelection, sendWithImages, sendTextOnly, isAIConversation]);

    /**
     * فتح نافذة اختيار الصور
     */
    const openImagePicker = useCallback(() => {
        if (!isAIConversation) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                await imageSelection.selectImages(files);
            }
        };
        input.click();
    }, [isAIConversation, imageSelection]);

    return {
        // حالة المحادثة
        isAIConversation,

        // إدارة الصور
        selectedImages: imageSelection.selectedImages,
        hasImages: imageSelection.hasImages,
        isProcessingImages: imageSelection.isProcessing,
        imageError: imageSelection.error,

        // أكشنز
        openImagePicker,
        removeImage: imageSelection.removeImage,
        clearImages: imageSelection.clearImages,
        handleSend,

        // حالة الإرسال
        isSending
    };
}
