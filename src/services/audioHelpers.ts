import { supabase } from './supabase';

/**
 * تنظيف المسار من المسافات والمسارات المكررة
 */
function cleanPath(path: string): string {
  return path
    .trim() // إزالة المسافات من البداية والنهاية
    .replace(/\s+/g, '') // إزالة جميع المسافات
    .replace(/public\/public\//g, 'public/') // إزالة التكرار
    .replace(/\/+/g, '/'); // إزالة الشرطات المتعددة
}

/**
 * إنشاء رابط موقّع لملف صوتي لمدة قصيرة (15 دقيقة)
 * يستخدم عند الحاجة فقط عندما لا يتوفر mediaBlob في الكاش.
 */
export async function createSignedAudioUrl(path: string, expiresIn: number = 900): Promise<string | null> {
  try {
    const rawPath = cleanPath(path);
    const filePath = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;
    const { data, error } = await supabase.storage
      .from('call-files')
      .createSignedUrl(filePath, expiresIn);
    if (error) {
      console.error('createSignedAudioUrl error:', error);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (e) {
    console.error('createSignedAudioUrl exception:', e);
    return null;
  }
}
