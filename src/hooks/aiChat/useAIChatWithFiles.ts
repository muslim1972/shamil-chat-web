// src/hooks/aiChat/useAIChatWithFiles.ts
// Hook موحد يدمج جميع وظائف AI + الملفات (صور + نصوص + PDF)

import { useCallback } from 'react';
import { useAIConversationDetector } from './useAIConversationDetector';
import { useFileSelection, type FileType } from './useFileSelection';
import { useSendAIWithImages } from './useSendAIWithImages';

/**
 * Hook موحد يدمج جميع وظائف AI + الملفات
 * يستخدم في ChatScreen لإضافة دعم الملفات للمحادثات AI
 */
export function useAIChatWithFiles(conversationId: string, userId?: string) {
    // 1. كشف محادثات AI
    const isAIConversation = useAIConversationDetector(conversationId);

    // 2. إدارة اختيار الملفات (صور + نصوص + PDF)
    const fileSelection = useFileSelection(4); // max 4 files

    // 3. إرسال الرسائل مع الصور
    const { sendWithImages, sendTextOnly, isSending } = useSendAIWithImages(
        conversationId,
        userId
    );

    /**
     * معالج موحد للإرسال - يتعامل مع النص والملفات
     */
    const handleSend = useCallback(async (text: string) => {
        console.log('[🔍 AI SEND DEBUG] handleSend called with:', {
            text,
            hasFiles: fileSelection.hasFiles,
            filesCount: fileSelection.selectedFiles.length,
            isAIConversation
        });

        try {
            if (fileSelection.hasFiles) {
                // معالجة الملفات
                const { images, texts } = await fileSelection.processFiles();

                console.log('[🔍 AI SEND DEBUG] Files processed:', {
                    imagesCount: images.length,
                    textsCount: texts.length
                });

                // دمج محتوى الملفات النصية مع النص المُرسل
                let combinedText = text.trim();

                for (const textFile of texts) {
                    // تحديد طول المحتوى (max 10000 حرف لكل ملف)
                    const maxContentLength = 10000;
                    let fileContent = textFile.content;

                    // تنظيف المحتوى من الرموز الثنائية
                    fileContent = fileContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

                    if (fileContent.length > maxContentLength) {
                        fileContent = fileContent.substring(0, maxContentLength) + '\n\n... [تم اقتطاع المحتوى - الملف طويل جداً]';
                    }

                    // دمج مع النص
                    combinedText += `\n\n📄 **محتوى الملف: ${textFile.name}**\n\`\`\`\n${fileContent}\n\`\`\``;
                }

                console.log('[🔍 AI SEND DEBUG] Combined text length:', combinedText.length);

                // إرسال الصور مع النص المدمج
                if (images.length > 0) {
                    const imageFiles = fileSelection.selectedFiles
                        .filter(f => f.type === 'image')
                        .map(f => f.file);
                    await sendWithImages(combinedText, imageFiles);
                } else if (combinedText.trim()) {
                    // إرسال النص المدمج فقط
                    await sendTextOnly(combinedText);
                }

                fileSelection.clearFiles();
            } else {
                // إرسال نص فقط
                await sendTextOnly(text);
            }
            console.log('[🔍 AI SEND DEBUG] Send completed successfully');
        } catch (error) {
            console.error('[🔍 AI SEND DEBUG] Error sending AI message:', error);
            throw error;
        }
    }, [fileSelection, sendWithImages, sendTextOnly, isAIConversation, conversationId, userId]);

    /**
     * فتح نافذة اختيار الملفات حسب النوع
     */
    const openFilePicker = useCallback((type: FileType) => {
        if (!isAIConversation) return;
        fileSelection.openFilePicker(type);
    }, [isAIConversation, fileSelection]);

    return {
        // حالة المحادثة
        isAIConversation,

        // إدارة الملفات
        selectedFiles: fileSelection.selectedFiles,
        hasFiles: fileSelection.hasFiles,
        hasImages: fileSelection.hasImages,
        hasTexts: fileSelection.hasTexts,
        isProcessing: fileSelection.isProcessing,
        fileError: fileSelection.error,

        // أكشنز
        openFilePicker,
        removeFile: fileSelection.removeFile,
        clearFiles: fileSelection.clearFiles,
        handleSend,

        // حالة الإرسال
        isSending
    };
}
