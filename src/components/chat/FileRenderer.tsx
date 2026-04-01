import React, { memo } from 'react';
import { FileIcon, Download } from 'lucide-react';
import { getFilenameFromPath } from '../../utils/fileHelpers';

interface FileRendererProps {
    text: string;
    localUrl: string | null;
}

/**
 * مكون عرض الملفات
 * يعرض أيقونة الملف واسمه مع زر التحميل
 */
export const FileRenderer: React.FC<FileRendererProps> = memo(({
    text,
    localUrl,
}) => {
    const filename = getFilenameFromPath(text);

    // حالة التحميل
    if (!localUrl) {
        return (
            <div className="flex items-center p-2 bg-gray-200 rounded-lg opacity-90 gap-2">
                <FileIcon className="w-6 h-6 text-gray-500" />
                <span className="truncate text-sm font-medium text-gray-600 flex-1">
                    {filename}
                </span>
            </div>
        );
    }

    return (
        <a
            href={localUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
            <FileIcon className="w-6 h-6 mr-2 text-gray-600" />
            <span className="truncate text-sm font-medium text-gray-800">
                {filename}
            </span>
            <Download className="w-5 h-5 ml-auto text-gray-500" />
        </a>
    );
});

FileRenderer.displayName = 'FileRenderer';
