// src/hooks/aiChat/useImageSelection.ts
import { useState, useCallback } from 'react';
import { prepareImagesForAI } from '../../utils/media/compression/imageCompression';

export interface SelectedImage {
    file: File;
    preview: string; // data URL للمعاينة
    base64?: string; // Base64 بعد المعالجة
}

/** Hook لإدارة اختيار ومعالجة الصور */
export function useImageSelection(maxImages: number = 4) {
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** اختيار وإضافة صور جديدة */
    const selectImages = useCallback(async (files: FileList | File[]) => {
        setError(null);
        const fileArray = Array.from(files);
        // التحقق من العدد
        if (selectedImages.length + fileArray.length > maxImages) {
            setError(`يمكنك إرسال ${maxImages} صور كحد أقصى`);
            return;
        }
        const newImages: SelectedImage[] = [];
        for (const file of fileArray) {
            if (!file.type.startsWith('image/')) {
                setError('يجب اختيار ملفات صور فقط');
                continue;
            }
            const preview = URL.createObjectURL(file);
            newImages.push({ file, preview });
        }
        setSelectedImages(prev => [...prev, ...newImages]);
    }, [selectedImages.length, maxImages]);

    /** إزالة صورة */
    const removeImage = useCallback((index: number) => {
        setSelectedImages(prev => {
            const image = prev[index];
            if (image?.preview) {
                URL.revokeObjectURL(image.preview);
            }
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    /** مسح جميع الصور */
    const clearImages = useCallback(() => {
        selectedImages.forEach(img => {
            if (img.preview) {
                URL.revokeObjectURL(img.preview);
            }
        });
        setSelectedImages([]);
        setError(null);
    }, [selectedImages]);

    /** معالجة الصور (ضغط وتحويل إلى Base64) */
    const processImages = useCallback(async (): Promise<string[]> => {
        if (selectedImages.length === 0) return [];
        setIsProcessing(true);
        setError(null);
        try {
            const files = selectedImages.map(img => img.file);
            const base64Images = await prepareImagesForAI(files);
            setSelectedImages(prev =>
                prev.map((img, i) => ({ ...img, base64: base64Images[i] }))
            );
            return base64Images;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'فشل معالجة الصور';
            setError(msg);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [selectedImages]);

    return {
        selectedImages,
        selectImages,
        removeImage,
        clearImages,
        processImages,
        isProcessing,
        error,
        hasImages: selectedImages.length > 0
    };
}
