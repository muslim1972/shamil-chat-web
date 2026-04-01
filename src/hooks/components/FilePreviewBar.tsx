// src/hooks/aiChat/components/FilePreviewBar.tsx
// شريط معاينة الملفات المختارة (صور + ملفات نصية + PDF)

import React from 'react';
import { X, FileText, FileType2 } from 'lucide-react';
import type { SelectedFile } from '../aiChat/useFileSelection';

interface FilePreviewBarProps {
    files: SelectedFile[];
    onRemove: (index: number) => void;
    isProcessing?: boolean;
}

export const FilePreviewBar: React.FC<FilePreviewBarProps> = ({
    files,
    onRemove,
    isProcessing
}) => {
    if (files.length === 0) return null;

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (file: SelectedFile) => {
        switch (file.type) {
            case 'text':
                return <FileText className="w-6 h-6 text-green-500" />;
            case 'pdf':
                return <FileType2 className="w-6 h-6 text-red-500" />;
            case 'document':
                return <FileText className="w-6 h-6 text-blue-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {files.map((file, index) => (
                <div
                    key={`${file.name}-${index}`}
                    className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 ${isProcessing
                        ? 'border-blue-400 animate-pulse'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}
                    style={{ width: file.type === 'image' ? '70px' : '120px', height: '70px' }}
                >
                    {/* المحتوى */}
                    {file.type === 'image' ? (
                        <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-gray-700 p-1">
                            {getFileIcon(file)}
                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center mt-1">
                                {file.name.length > 12 ? file.name.slice(0, 10) + '...' : file.name}
                            </span>
                            <span className="text-[8px] text-gray-400">
                                {formatSize(file.size)}
                            </span>
                        </div>
                    )}

                    {/* زر الإزالة */}
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg hover:bg-red-600 transition-colors"
                        disabled={isProcessing}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default FilePreviewBar;
