// src/hooks/aiChat/useSendAIWithImages.ts
import { useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { prepareImagesForAI } from '../../utils/media/compression/imageCompression';

/** Hook لإرسال رسائل نصية + صور لمحادثات AI */
export function useSendAIWithImages(conversationId: string, userId?: string) {
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** إرسال رسالة نصية فقط (بدون صور) */
    const sendTextOnly = useCallback(async (text: string) => {
        if (!userId || !text.trim()) return;
        try {
            const { error: insertError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: userId,
                    content: text.trim(),
                    message_type: 'text'
                });
            if (insertError) throw insertError;
        } catch (err) {
            console.error('Error sending text message:', err);
            throw err;
        }
    }, [conversationId, userId]);

    /** إرسال رسالة مع صور */
    const sendWithImages = useCallback(async (text: string, images: File[]) => {
        if (!userId) {
            throw new Error('User not authenticated');
        }
        setIsSending(true);
        setError(null);
        try {
            // 1. معالجة وضغط الصور
            console.log(`📸 معالجة ${images.length} صورة...`);
            const base64Images = await prepareImagesForAI(images);

            // 2. إرسال الصور أولاً (لضمان وجودها في DB قبل تفعيل AI)
            for (let i = 0; i < base64Images.length; i++) {
                const { error: imgError } = await supabase
                    .from('messages')
                    .insert({
                        conversation_id: conversationId,
                        sender_id: userId,
                        content: `صورة ${i + 1}`,
                        message_type: 'image',
                        media_metadata: {
                            base64_data: base64Images[i],
                            mime: 'image/webp',
                            source: 'ai_chat'
                        }
                    });
                if (imgError) {
                    console.error(`Error sending image ${i + 1}:`, imgError);
                    throw imgError;
                }
            }

            // 3. إرسال النص أخيراً (يُفعّل AI trigger بعد وجود الصور)
            if (text.trim()) {
                await sendTextOnly(text);
            }
            console.log('✅ تم إرسال الرسالة مع الصور بنجاح');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'فشل إرسال الرسالة';
            setError(errorMsg);
            console.error('Error in sendWithImages:', err);
            throw err;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, userId, sendTextOnly]);

    return { sendWithImages, sendTextOnly, isSending, error };
}
