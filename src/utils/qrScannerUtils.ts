/**
 * دوال مساعدة لمسح وقراءة رموز QR
 */
import jsQR from 'jsqr';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface QRUserData {
    type: string;
    username?: string;
    email?: string;
    generatedAt?: string;
}

export interface SearchResult {
    found: boolean;
    userId?: string;
    username?: string;
    avatar_url?: string;
    error?: string;
}

/**
 * قراءة رمز QR من ملف صورة
 */
export const scanQRFromImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('فشل إنشاء canvas'));
                        return;
                    }

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        resolve(code.data);
                    } else {
                        resolve(null);
                    }
                };

                img.onerror = () => reject(new Error('فشل تحميل الصورة'));
                img.src = e.target?.result as string;
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
};

/**
 * تحليل بيانات QR واستخراج معلومات المستخدم
 */
export const parseQRData = (data: string): QRUserData | null => {
    try {
        // محاولة تحليل JSON (رموز QR من تطبيق شامل)
        const parsed = JSON.parse(data);
        if (parsed.type === 'shamil_user') {
            return parsed as QRUserData;
        }
        return null;
    } catch {
        // إذا لم يكن JSON، قد يكون نص عادي (اسم مستخدم أو بريد)
        if (data.includes('@')) {
            return { type: 'raw', email: data };
        }
        return { type: 'raw', username: data };
    }
};

/**
 * البحث عن مستخدم باستخدام اسم المستخدم أو البريد الإلكتروني
 */
export const searchUserByQRData = async (qrData: QRUserData): Promise<SearchResult> => {
    try {
        // 1. البحث باسم المستخدم أولاً
        if (qrData.username) {
            const { data: userByUsername, error: usernameError } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .eq('username', qrData.username)
                .single();

            if (!usernameError && userByUsername) {
                return {
                    found: true,
                    userId: userByUsername.id,
                    username: userByUsername.username,
                    avatar_url: userByUsername.avatar_url
                };
            }
        }

        // 2. إذا لم يُوجد باسم المستخدم، البحث بالبريد الإلكتروني
        if (qrData.email) {
            const { data: userByEmail, error: emailError } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .eq('email', qrData.email)
                .single();

            if (!emailError && userByEmail) {
                return {
                    found: true,
                    userId: userByEmail.id,
                    username: userByEmail.username,
                    avatar_url: userByEmail.avatar_url
                };
            }
        }

        // لم يتم العثور على المستخدم
        return {
            found: false,
            error: qrData.username
                ? `لم يتم العثور على مستخدم بالاسم: ${qrData.username}`
                : `لم يتم العثور على مستخدم بالبريد: ${qrData.email}`
        };

    } catch (error: any) {
        console.error('Search user error:', error);
        return {
            found: false,
            error: 'حدث خطأ أثناء البحث عن المستخدم'
        };
    }
};

/**
 * معالجة QR كاملة: من الصورة إلى المستخدم
 */
export const processQRImage = async (file: File): Promise<SearchResult> => {
    const loadingToast = toast.loading('جاري قراءة رمز QR...');

    try {
        // 1. قراءة QR من الصورة
        const qrContent = await scanQRFromImage(file);

        if (!qrContent) {
            toast.dismiss(loadingToast);
            toast.error('لم يتم العثور على رمز QR في الصورة');
            return { found: false, error: 'لم يتم العثور على رمز QR في الصورة' };
        }

        // 2. تحليل البيانات
        const qrData = parseQRData(qrContent);

        if (!qrData || (!qrData.username && !qrData.email)) {
            toast.dismiss(loadingToast);
            toast.error('رمز QR غير صالح أو لا يحتوي على بيانات مستخدم');
            return { found: false, error: 'رمز QR غير صالح' };
        }

        toast.dismiss(loadingToast);
        toast.loading('جاري البحث عن المستخدم...');

        // 3. البحث عن المستخدم
        const result = await searchUserByQRData(qrData);

        toast.dismiss();

        if (result.found) {
            toast.success(`تم العثور على: ${result.username}`);
        } else {
            toast.error(result.error || 'لم يتم العثور على المستخدم');
        }

        return result;

    } catch (error: any) {
        toast.dismiss(loadingToast);
        console.error('Process QR error:', error);

        if (error.message?.includes('تحميل الصورة')) {
            toast.error('فشل تحميل الصورة. تأكد من أن الملف صورة صالحة.');
        } else if (error.message?.includes('قراءة الملف')) {
            toast.error('فشل قراءة الملف. جرب ملف آخر.');
        } else {
            toast.error('حدث خطأ غير متوقع أثناء معالجة الصورة');
        }

        return { found: false, error: error.message };
    }
};
