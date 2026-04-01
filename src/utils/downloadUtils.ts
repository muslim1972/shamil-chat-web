import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import toast from 'react-hot-toast';
import { MediaScanner } from '../plugins/MediaScanner';

export type StorageLocation = 'documents' | 'cache' | 'external' | 'gallery';

/**
 * تحميل ملف وسائط إلى موقع تخزين محدد
 */
export const downloadMediaFile = async (
    url: string,
    fileName: string,
    storageLocation: StorageLocation = 'documents'
) => {
    const loadingToast = toast.loading('جاري التحميل...');
    try {
        // تحديد الامتداد إذا لم يكن موجوداً
        let finalName = fileName;
        if (!finalName.includes('.')) {
            // محاولة استخراج الامتداد من الرابط
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
            if (ext.length < 5) {
                finalName = `${finalName}.${ext}`;
            }
        }

        if (Capacitor.isNativePlatform()) {
            // 📱 Mobile Implementation
            const response = await fetch(url);
            const blob = await response.blob();
            const base64Index = await blobToBase64(blob);

            // حذف prefix data:image/...;base64,
            const base64Data = base64Index.split(',')[1];

            // تحديد موقع التخزين
            let directory: Directory;
            let locationName: string;
            let path: string;

            switch (storageLocation) {
                case 'documents':
                    directory = Directory.Documents;
                    locationName = 'المستندات';
                    path = `ShamilDownloads/${finalName}`;
                    break;
                case 'cache':
                    directory = Directory.Cache;
                    locationName = 'ذاكرة التطبيق';
                    path = finalName;
                    break;
                case 'external':
                    directory = Directory.External;
                    locationName = 'البطاقة الخارجية';
                    path = `ShamilDownloads/${finalName}`;
                    break;
                case 'gallery':
                    // Android 10+: الحفظ في Documents ثم استخدام MediaScanner
                    // لأن External Storage محمي
                    directory = Directory.Documents;
                    locationName = 'المعرض';
                    path = `ShamilGallery/${finalName}`;
                    break;
                default:
                    directory = Directory.Documents;
                    locationName = 'المستندات';
                    path = `ShamilDownloads/${finalName}`;
            }

            console.log('[Download] Saving to:', { storageLocation, directory, path });

            try {
                const result = await Filesystem.writeFile({
                    path,
                    data: base64Data,
                    directory,
                    recursive: true
                });

                console.log('[Download] File saved:', result);

                // إذا كان الحفظ للمعرض، شغل Media Scanner
                if (storageLocation === 'gallery' && result.uri) {
                    try {
                        console.log('[Download] Running MediaScanner for:', result.uri);
                        await MediaScanner.scanFile({ path: result.uri });
                        console.log('[Download] MediaScanner completed');
                        toast.success(`✅ تم الحفظ في المعرض`, { id: loadingToast, duration: 3000 });
                    } catch (scanError) {
                        console.warn('[Download] MediaScanner failed:', scanError);
                        toast.success(`✅ تم الحفظ (قد تحتاج إعادة تشغيل الجهاز ليظهر)`, { id: loadingToast, duration: 3000 });
                    }
                } else {
                    toast.success(`✅ تم الحفظ في: ${locationName}`, { id: loadingToast, duration: 3000 });
                }
            } catch (e: any) {
                console.error(`[Download] Save to ${storageLocation} failed:`, e);

                // Fallback: محاولة الحفظ في Cache كخيار احتياطي
                if (storageLocation !== 'cache') {
                    try {
                        console.log('[Download] Trying fallback to Cache...');
                        const cacheResult = await Filesystem.writeFile({
                            path: finalName,
                            data: base64Data,
                            directory: Directory.Cache
                        });
                        console.log('[Download] Cache save succeeded:', cacheResult);
                        toast.success('⚠️ تم الحفظ في ذاكرة التطبيق (احتياطي)', { id: loadingToast });
                    } catch (fallbackError) {
                        console.error('[Download] Cache fallback also failed:', fallbackError);
                        throw fallbackError;
                    }
                } else {
                    throw e;
                }
            }

        } else {
            // 💻 Web Implementation
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = finalName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(downloadUrl);
            toast.dismiss(loadingToast);
            toast.success('تم بدء التحميل');
        }
    } catch (error) {
        console.error('Download error:', error);
        toast.error('❌ حدث خطأ أثناء التحميل', { id: loadingToast });
    }
};

/**
 * مشاركة ملف وسائط عبر تطبيقات النظام
 */
export const shareMediaFile = async (url: string, title: string = 'مشاركة من تطبيق شامل') => {
    try {
        if (Capacitor.isNativePlatform()) {
            // 📱 استخدام Capacitor Share API للموبايل
            await Share.share({
                title,
                text: title,
                url,
                dialogTitle: 'مشاركة الوسائط',
            });
        } else {
            // 💻 استخدام Web Share API للمتصفح
            if (navigator.share) {
                await navigator.share({
                    title,
                    url
                });
            } else {
                // Fallback: نسخ الرابط
                await navigator.clipboard.writeText(url);
                toast.success('تم نسخ الرابط إلى الحافظة 📋');
            }
        }
    } catch (error: any) {
        // تجاهل خطأ الإلغاء (عندما يلغي المستخدم المشاركة)
        if (error?.message?.includes('cancel') || error?.message?.includes('abort')) {
            console.log('User cancelled share');
            return;
        }
        console.error('Share error:', error);
        toast.error('حدث خطأ أثناء المشاركة');
    }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
    });
};
