//==========================================
// 🔧 EXIF Reader - قراءة بيانات EXIF من الصور
// ✅ مع معالجة كاملة للأخطاء و timeout
//==========================================

// @ts-ignore
import EXIF from './lib/exif-patched';

export interface ExifMetadata {
    width: number;
    height: number;
    orientation: number; // 1-8 حسب معيار EXIF
    make?: string;
    model?: string;
    hasGPS: boolean; // تحذير أمني
}

/**
 * قراءة بيانات EXIF من ملف صورة
 * ✅ مع timeout و معالجة كاملة للأخطاء
 */
export async function readExif(file: File): Promise<ExifMetadata> {
    const defaultResult: ExifMetadata = {
        width: 0,
        height: 0,
        orientation: 1,
        hasGPS: false
    };

    // ✅ Promise مع timeout (3 ثواني كحد أقصى)
    const exifPromise = new Promise<ExifMetadata>((resolve) => {
        try {
            // ✅ global error handler للمكتبة
            const originalError = window.onerror;

            window.onerror = (msg: any) => {
                if (msg && msg.toString().includes('exif')) {
                    console.warn('⚠️ [EXIF] خطأ تم اعتراضه:', msg);
                    resolve(defaultResult);
                    window.onerror = originalError;
                    return true;
                }
                return false;
            };

            EXIF.getData(file as any, function (this: any) {
                try {
                    const exif = EXIF.getAllTags(this);

                    resolve({
                        width: exif.PixelXDimension || exif.ImageWidth || 0,
                        height: exif.PixelYDimension || exif.ImageHeight || 0,
                        orientation: exif.Orientation || 1,
                        make: exif.Make,
                        model: exif.Model,
                        hasGPS: !!(exif.GPSLatitude || exif.GPSLongitude)
                    });
                } catch (error) {
                    console.warn('⚠️ [EXIF] خطأ في قراءة Tags:', error);
                    resolve(defaultResult);
                } finally {
                    window.onerror = originalError;
                }
            });
        } catch (error) {
            console.warn('⚠️ [EXIF] خطأ في getData:', error);
            resolve(defaultResult);
        }
    });

    // ✅ timeout بعد 3 ثواني
    const timeoutPromise = new Promise<ExifMetadata>((resolve) => {
        setTimeout(() => {
            console.warn('⚠️ [EXIF] انتهى الوقت (3s) - سيتم تجاهل EXIF');
            resolve(defaultResult);
        }, 3000);
    });

    // ✅ استخدام أيهما ينتهي أولاً
    return Promise.race([exifPromise, timeoutPromise]);
}
