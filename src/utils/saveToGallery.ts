/**
 * دالة لحفظ الصور في معرض الجهاز
 * تستخدم @capacitor/filesystem على الموبايل
 * وتحميل مباشر على الويب
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import toast from 'react-hot-toast';

export interface SaveToGalleryResult {
    success: boolean;
    path?: string;
    error?: string;
}

/**
 * حفظ صورة في معرض الجهاز
 * @param imageUrl رابط الصورة (يمكن أن يكون blob URL أو http URL أو base64)
 * @param fileName اسم الملف (اختياري)
 */
export async function saveImageToGallery(
    imageUrl: string,
    fileName?: string
): Promise<SaveToGalleryResult> {
    try {
        if (Capacitor.isNativePlatform()) {
            return await saveToGalleryNative(imageUrl, fileName);
        } else {
            return await saveToGalleryWeb(imageUrl, fileName);
        }
    } catch (error: any) {
        console.error('Save to gallery error:', error);
        return {
            success: false,
            error: error.message || 'فشل حفظ الصورة'
        };
    }
}

/**
 * حفظ للموبايل باستخدام Filesystem
 * يحفظ في مجلد Downloads أو Documents الذي يظهر في أدوات إدارة الملفات
 */
async function saveToGalleryNative(
    imageUrl: string,
    fileName?: string
): Promise<SaveToGalleryResult> {
    try {
        // تحويل الصورة إلى base64
        let base64Data: string;

        if (imageUrl.startsWith('data:')) {
            // إزالة البادئة data:image/xxx;base64,
            base64Data = imageUrl.split(',')[1];
        } else {
            // جلب الصورة وتحويلها
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            base64Data = await blobToBase64(blob);
            // إزالة البادئة
            if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
            }
        }

        // تحديد اسم الملف
        const name = fileName || `shamil_${Date.now()}.png`;

        // محاولة الحفظ في عدة مسارات
        const directories = [
            { dir: Directory.External, name: 'External' },
            { dir: Directory.Documents, name: 'Documents' },
            { dir: Directory.Data, name: 'Data' }
        ];

        let savedPath: string | undefined;

        for (const { dir, name: dirName } of directories) {
            try {
                // إنشاء مجلد Shamil إذا لم يكن موجوداً
                try {
                    await Filesystem.mkdir({
                        path: 'Shamil',
                        directory: dir,
                        recursive: true
                    });
                } catch {
                    // المجلد موجود أصلاً
                }

                // حفظ الملف
                const result = await Filesystem.writeFile({
                    path: `Shamil/${name}`,
                    data: base64Data,
                    directory: dir,
                    recursive: true
                });

                savedPath = result.uri;
                console.log(`Saved to ${dirName}:`, savedPath);
                break;

            } catch (e) {
                console.log(`Failed to save to ${dirName}:`, e);
                continue;
            }
        }

        if (savedPath) {
            toast.success('تم حفظ الصورة ✓\nابحث في مجلد Shamil');
            return { success: true, path: savedPath };
        } else {
            throw new Error('فشل الحفظ في جميع المسارات');
        }

    } catch (error: any) {
        console.error('Native save error:', error);
        return {
            success: false,
            error: error.message || 'فشل الحفظ'
        };
    }
}

/**
 * حفظ للويب عبر التحميل المباشر
 */
async function saveToGalleryWeb(
    imageUrl: string,
    fileName?: string
): Promise<SaveToGalleryResult> {
    try {
        let blob: Blob;

        if (imageUrl.startsWith('data:')) {
            // تحويل base64 إلى blob
            const response = await fetch(imageUrl);
            blob = await response.blob();
        } else {
            // جلب الصورة
            const response = await fetch(imageUrl);
            blob = await response.blob();
        }

        // إنشاء رابط تحميل
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `shamil_${Date.now()}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        toast.success('تم تحميل الصورة ✓');
        return { success: true };

    } catch (error: any) {
        console.error('Web save error:', error);
        return {
            success: false,
            error: error.message || 'فشل التحميل'
        };
    }
}

/**
 * تحويل Blob إلى base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('فشل تحويل الصورة'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
