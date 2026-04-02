// src/hooks/aiChat/useFileSelection.ts
// هوك موحد لاختيار ومعالجة الملفات (صور + نصوص + PDF + Docs)

import { useState, useCallback } from 'react';
import { prepareImagesForAI } from '../../utils/media/compression/imageCompression';
// import mammoth from 'mammoth'; // Removed for optimization

/** أنواع الملفات المدعومة */
export type FileType = 'image' | 'text' | 'pdf' | 'document';

/** الامتدادات المدعومة لكل نوع */
export const SUPPORTED_EXTENSIONS: Record<FileType, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    text: ['txt', 'md', 'json', 'xml', 'csv', 'js', 'ts', 'py', 'html', 'css', 'log'],
    pdf: ['pdf'],
    document: ['doc', 'docx', 'rtf']
};

/** MIME types لكل نوع */
export const ACCEPT_MIME: Record<FileType, string> = {
    image: 'image/*',
    text: '.txt,.md,.json,.xml,.csv,.js,.ts,.py,.html,.css,.log',
    pdf: 'application/pdf',
    document: '.doc,.docx,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

/** ملف مختار */
export interface SelectedFile {
    file: File;
    type: FileType;
    preview: string; // URL للمعاينة (للصور) أو أيقونة
    content?: string; // المحتوى النصي (للملفات النصية)
    base64?: string; // Base64 (للصور)
    name: string;
    size: number;
}

/** الحصول على نوع الملف من الامتداد */
export function getFileType(file: File): FileType | null {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
        if (extensions.includes(ext)) {
            return type as FileType;
        }
    }

    // التحقق من MIME type للصور
    if (file.type.startsWith('image/')) {
        return 'image';
    }

    return null;
}

/** قراءة محتوى ملف نصي - (Disabled) */
export async function readTextFile(_file: File): Promise<string> {
    throw new Error('Feature disabled');
}

/** قراءة محتوى ملف Word (.docx) - (Disabled) */
export async function readDocxFile(_file: File): Promise<string> {
    throw new Error('Feature disabled');
}

/** قراءة محتوى ملف PDF - (Disabled) */
export async function readPdfFile(_file: File): Promise<string> {
    throw new Error('Feature disabled');
}

/** Hook لإدارة اختيار ومعالجة الملفات */
export function useFileSelection(maxFiles: number = 4) {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** فتح نافذة اختيار الملفات */
    const openFilePicker = useCallback((type: FileType) => {
        console.log('[📁 FILE PICKER] Opening picker for type:', type);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = ACCEPT_MIME[type];
        input.multiple = true;

        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            console.log('[📁 FILE PICKER] Files selected:', files?.length || 0);
            if (files && files.length > 0) {
                const fileArray = Array.from(files);
                console.log('[📁 FILE PICKER] Processing files:', fileArray.map(f => f.name));

                // استخدام functional update لتجنب Stale Closure
                setError(null);

                const newFiles: SelectedFile[] = [];

                for (const file of fileArray) {
                    const fileType = type || getFileType(file);

                    if (!fileType) {
                        setError(`نوع الملف غير مدعوم: ${file.name}`);
                        continue;
                    }

                    // التحقق من الحجم
                    const maxSize = fileType === 'image' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
                    if (file.size > maxSize) {
                        setError(`حجم الملف كبير جداً: ${file.name}`);
                        continue;
                    }

                    let preview = '';
                    let content: string | undefined;

                    if (fileType === 'image') {
                        preview = URL.createObjectURL(file);
                    } else if (fileType === 'text') {
                        try {
                            content = await readTextFile(file);
                            preview = '📄';
                        } catch {
                            setError(`فشل قراءة الملف: ${file.name}`);
                            continue;
                        }
                    } else if (fileType === 'pdf') {
                        preview = '📕';
                        // PDF: استخراج النص باستخدام pdfjs-dist
                        try {
                            content = await readPdfFile(file);
                        } catch {
                            content = `[فشل قراءة ملف PDF: ${file.name}]`;
                        }
                    } else if (fileType === 'document') {
                        preview = '📝';
                        // Document: استخراج النص باستخدام mammoth
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        if (ext === 'docx') {
                            try {
                                content = await readDocxFile(file);
                            } catch {
                                content = `[فشل قراءة ملف Word: ${file.name}]`;
                            }
                        } else {
                            // ملفات doc/rtf - محاولة قراءة كنص
                            try {
                                content = await readTextFile(file);
                            } catch {
                                content = `[ملف Word غير مدعوم: ${file.name}]`;
                            }
                        }
                    }

                    newFiles.push({
                        file,
                        type: fileType,
                        preview,
                        content,
                        name: file.name,
                        size: file.size
                    });
                }

                console.log('[📁 FILE PICKER] New files to add:', newFiles.length);

                // استخدام functional update
                setSelectedFiles(prev => {
                    const total = prev.length + newFiles.length;
                    if (total > maxFiles) {
                        setError(`يمكنك إرسال ${maxFiles} ملفات كحد أقصى`);
                        return prev;
                    }
                    console.log('[📁 FILE PICKER] Updated selectedFiles:', [...prev, ...newFiles].length);
                    return [...prev, ...newFiles];
                });
            }
        };

        input.click();
    }, [maxFiles]);

    /** إضافة ملفات جديدة */
    const selectFiles = useCallback(async (files: File[], expectedType?: FileType) => {
        setError(null);

        // التحقق من العدد
        if (selectedFiles.length + files.length > maxFiles) {
            setError(`يمكنك إرسال ${maxFiles} ملفات كحد أقصى`);
            return;
        }

        const newFiles: SelectedFile[] = [];

        for (const file of files) {
            const type = expectedType || getFileType(file);

            if (!type) {
                setError(`نوع الملف غير مدعوم: ${file.name}`);
                continue;
            }

            // التحقق من الحجم (10MB للنصوص، 15MB للصور)
            const maxSize = type === 'image' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                setError(`حجم الملف كبير جداً: ${file.name}`);
                continue;
            }

            let preview = '';
            let content: string | undefined;

            if (type === 'image') {
                preview = URL.createObjectURL(file);
            } else {
                // للملفات النصية: قراءة المحتوى
                if (type === 'text') {
                    try {
                        content = await readTextFile(file);
                        preview = '📄'; // أيقونة
                    } catch {
                        setError(`فشل قراءة الملف: ${file.name}`);
                        continue;
                    }
                } else if (type === 'pdf') {
                    preview = '📕';
                    // TODO: استخراج نص PDF لاحقاً
                } else if (type === 'document') {
                    preview = '📝';
                    // TODO: استخراج نص Docs لاحقاً
                }
            }

            newFiles.push({
                file,
                type,
                preview,
                content,
                name: file.name,
                size: file.size
            });
        }

        setSelectedFiles(prev => [...prev, ...newFiles]);
    }, [selectedFiles.length, maxFiles]);

    /** إزالة ملف */
    const removeFile = useCallback((index: number) => {
        setSelectedFiles(prev => {
            const file = prev[index];
            if (file?.type === 'image' && file.preview.startsWith('blob:')) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    /** مسح جميع الملفات */
    const clearFiles = useCallback(() => {
        selectedFiles.forEach(f => {
            if (f.type === 'image' && f.preview.startsWith('blob:')) {
                URL.revokeObjectURL(f.preview);
            }
        });
        setSelectedFiles([]);
        setError(null);
    }, [selectedFiles]);

    /** معالجة الملفات للإرسال */
    const processFiles = useCallback(async () => {
        if (selectedFiles.length === 0) return { images: [], texts: [] };

        setIsProcessing(true);
        setError(null);

        try {
            const images: string[] = [];
            const texts: { name: string; content: string }[] = [];

            // فصل الملفات حسب النوع
            const imageFiles = selectedFiles.filter(f => f.type === 'image');
            // جميع الملفات التي لها محتوى نصي (text, document, pdf)
            const textFiles = selectedFiles.filter(f =>
                (f.type === 'text' || f.type === 'document' || f.type === 'pdf') && f.content
            );

            console.log('[📁 PROCESS FILES] Images:', imageFiles.length, 'Texts:', textFiles.length);

            // معالجة الصور
            if (imageFiles.length > 0) {
                const files = imageFiles.map(f => f.file);
                const base64Images = await prepareImagesForAI(files);
                images.push(...base64Images);

                // تحديث الحالة مع Base64
                setSelectedFiles(prev =>
                    prev.map((f) => {
                        const imgIndex = imageFiles.findIndex(img => img.file === f.file);
                        if (imgIndex >= 0 && base64Images[imgIndex]) {
                            return { ...f, base64: base64Images[imgIndex] };
                        }
                        return f;
                    })
                );
            }

            // تجميع النصوص
            for (const textFile of textFiles) {
                if (textFile.content) {
                    texts.push({
                        name: textFile.name,
                        content: textFile.content
                    });
                }
            }

            return { images, texts };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'فشل معالجة الملفات';
            setError(msg);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [selectedFiles]);

    return {
        selectedFiles,
        selectFiles,
        openFilePicker,
        removeFile,
        clearFiles,
        processFiles,
        isProcessing,
        error,
        hasFiles: selectedFiles.length > 0,
        hasImages: selectedFiles.some(f => f.type === 'image'),
        hasTexts: selectedFiles.some(f => f.type === 'text')
    };
}
