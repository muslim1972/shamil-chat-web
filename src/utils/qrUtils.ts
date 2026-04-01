/**
 * دوال مساعدة للتعامل مع رموز QR
 */
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import toast from 'react-hot-toast';

/**
 * توليد بيانات QR من معلومات المستخدم
 */
export const generateQRData = (username: string, email: string): string => {
    return JSON.stringify({
        type: 'shamil_user',
        username,
        email,
        generatedAt: new Date().toISOString()
    });
};

/**
 * تحويل Canvas إلى Data URL
 */
export const canvasToDataUrl = (canvas: HTMLCanvasElement): string => {
    return canvas.toDataURL('image/png');
};

/**
 * نسخ صورة QR للحافظة
 */
export const copyQRToClipboard = async (dataUrl: string): Promise<boolean> => {
    try {
        // تحويل Data URL إلى Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // استخدام Clipboard API
        if (navigator.clipboard && 'write' in navigator.clipboard) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            toast.success('تم نسخ رمز QR للحافظة ✅');
            return true;
        } else {
            // Fallback: نسخ النص
            toast.error('متصفحك لا يدعم نسخ الصور');
            return false;
        }
    } catch (error) {
        console.error('Error copying QR to clipboard:', error);
        toast.error('فشل نسخ رمز QR');
        return false;
    }
};

/**
 * مشاركة صورة QR عبر تطبيقات النظام
 */
export const shareQRImage = async (dataUrl: string, title: string = 'رمز QR الخاص بي'): Promise<void> => {
    try {
        if (Capacitor.isNativePlatform()) {
            // 📱 Mobile: حفظ الصورة مؤقتاً ثم مشاركتها
            const base64Data = dataUrl.split(',')[1];
            const fileName = `qr_code_${Date.now()}.png`;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });

            await Share.share({
                title,
                text: 'رمز QR الخاص بي من تطبيق شامل',
                url: result.uri,
                dialogTitle: 'مشاركة رمز QR',
            });
        } else {
            // 💻 Web: استخدام Web Share API
            if (navigator.share) {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], 'qr_code.png', { type: 'image/png' });

                await navigator.share({
                    title,
                    files: [file]
                });
            } else {
                // Fallback: نسخ للحافظة
                await copyQRToClipboard(dataUrl);
            }
        }
    } catch (error: any) {
        // تجاهل خطأ الإلغاء
        if (error?.message?.includes('cancel') || error?.message?.includes('abort')) {
            console.log('User cancelled share');
            return;
        }
        console.error('Share QR error:', error);
        toast.error('حدث خطأ أثناء المشاركة');
    }
};
