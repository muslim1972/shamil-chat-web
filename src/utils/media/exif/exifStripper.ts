// ==========================================
// 🛡️ EXIF Stripper - حذف بيانات EXIF الحساسة
// ==========================================

import piexif from 'piexifjs';

/**
 * تحويل File إلى Data URL
 */
async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * تحويل Data URL إلى File
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

/**
 * حذف بيانات EXIF الحساسة (GPS, Camera, Date)
 * مع الاحتفاظ بـ Orientation فقط للعرض الصحيح
 */
export async function stripExif(file: File): Promise<File> {
    // ✅ piexifjs تدعم فقط JPEG - تخطي الأنواع الأخرى مثل PNG
    if (file.type !== 'image/jpeg' && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
        return file;
    }

    try {
        const dataUrl = await fileToDataURL(file);

        // قراءة EXIF الحالي
        let orientation = 1;
        try {
            const exifObj = piexif.load(dataUrl);
            orientation = exifObj['0th']?.[piexif.ImageIFD.Orientation] || 1;
        } catch {
            // إذا لم يوجد EXIF، استخدم القيمة الافتراضية
        }

        // إنشاء EXIF نظيف يحتوي على Orientation فقط
        const cleanExif = {
            '0th': {
                [piexif.ImageIFD.Orientation]: orientation
            }
        };

        const exifBytes = piexif.dump(cleanExif);
        const newDataUrl = piexif.insert(exifBytes, dataUrl);

        return dataURLtoFile(newDataUrl, file.name);
    } catch (error) {
        console.warn('فشل في حذف EXIF، استخدام الملف الأصلي:', error);
        return file; // fallback للملف الأصلي
    }
}
