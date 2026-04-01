// src/components/chat/ImagePreviewBar.tsx
// شريط معاينة الصور المحددة قبل الإرسال

import React from 'react';
import { X } from 'lucide-react';
import type { SelectedImage } from '../../hooks/aiChat/useImageSelection';

interface ImagePreviewBarProps {
    images: SelectedImage[];
    onRemove: (index: number) => void;
    isProcessing?: boolean;
}

export const ImagePreviewBar: React.FC<ImagePreviewBarProps> = ({
    images,
    onRemove,
    isProcessing = false
}) => {
    if (images.length === 0) return null;

    return (
        <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {images.map((image, index) => (
                <div
                    key={index}
                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                >
                    <img
                        src={image.preview}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-full object-cover"
                    />
                    {!isProcessing && (
                        <button
                            onClick={() => onRemove(index)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                            aria-label="إزالة الصورة"
                        >
                            <X size={14} />
                        </button>
                    )}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        </div>
                    )}
                </div>
            ))}
            {isProcessing && (
                <div className="flex items-center justify-center px-3 text-sm text-gray-600 dark:text-gray-400">
                    جاري المعالجة...
                </div>
            )}
        </div>
    );
};
