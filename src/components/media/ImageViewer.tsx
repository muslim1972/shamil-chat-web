import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerProps {
    imageUrl: string;
    onClose: () => void;
}

/**
 * عارض صور احترافي - يعمل داخل التطبيق مع دعم زر الرجوع
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {

    // ✅ دعم زر الرجوع للموبايل
    useEffect(() => {
        const handleBackButton = (e: PopStateEvent) => {
            e.preventDefault();
            onClose();
        };

        // إضافة entry للـ history
        window.history.pushState({ imageViewer: true }, '');
        window.addEventListener('popstate', handleBackButton);

        return () => {
            window.removeEventListener('popstate', handleBackButton);
        };
    }, [onClose]);

    // ✅ إغلاق عند الضغط على Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={onClose}
        >
            {/* زر الإغلاق */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all z-10"
                aria-label="إغلاق"
            >
                <X size={24} className="text-white" />
            </button>

            {/* الصورة */}
            <img
                src={imageUrl}
                alt="عرض كامل"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};
