import { supabase } from './supabase';

/**
 * خدمة لتحديث بيانات المستخدم في الجداول (public.users, auth.users, public.profiles)
 */
export const UserService = {
  /**
   * تحديث اسم المستخدم في جميع الجداول (users, auth.users, profiles)
   * @param userId معرف المستخدم
   * @param newUsername اسم المستخدم الجديد
   * @returns وعد بالنتيجة
   */
  async updateUsername(userId: string, newUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. تحديث اسم المستخدم في جدول public.users
      const { error: publicUpdateError } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', userId);

      if (publicUpdateError) {
        console.error('Error updating username in public.users:', publicUpdateError);
        return { success: false, error: publicUpdateError.message };
      }

      // 2. تحديث اسم المستخدم في جدول public.profiles
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error updating username in public.profiles:', profileUpdateError);
        // إذا فشل تحديث جدول الملف الشخصي، نعود عن التغيير في جدول public.users
        await supabase
          .from('users')
          .update({ username: supabase.auth.getUser().then(({ data }) => data.user?.user_metadata.username) })
          .eq('id', userId);
        
        return { success: false, error: profileUpdateError.message };
      }

      // 3. تحديث اسم المستخدم في جدول auth.users باستخدام دالة supabase.auth.updateUser
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { username: newUsername }
      });

      if (authUpdateError) {
        console.error('Error updating username in auth.users:', authUpdateError);
        // إذا فشل تحديث جدول المصادقة، نعود عن التغيير في الجداول الأخرى
        await supabase
          .from('users')
          .update({ username: supabase.auth.getUser().then(({ data }) => data.user?.user_metadata.username) })
          .eq('id', userId);
        
        await supabase
          .from('profiles')
          .update({ username: supabase.auth.getUser().then(({ data }) => data.user?.user_metadata.username) })
          .eq('id', userId);
        
        return { success: false, error: authUpdateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error in updateUsername:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  },

  /**
   * تحديث البريد الإلكتروني في كلا الجدولين
   * @param newEmail البريد الإلكتروني الجديد
   * @returns وعد بالنتيجة
   */
  async updateEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      // تحديث البريد الإلكتروني في جدول المصادقة
      // هذا سيؤدي تلقائيًا إلى تحديث جدول public.users إذا تم إعداد المشغلات (triggers) بشكل صحيح
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) {
        console.error('Error updating email:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error in updateEmail:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  },

  /**
   * تحديث رابط الصورة الشخصية في الجداول (users و profiles)
   * @param userId معرف المستخدم
   * @param avatarUrl رابط الصورة الشخصية الجديد
   * @returns وعد بالنتيجة
   */
  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. تحديث رابط الصورة الشخصية في جدول public.users
      const { error: userError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating avatar URL in users:', userError);
        return { success: false, error: userError.message };
      }

      // 2. تحديث رابط الصورة الشخصية في جدول public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating avatar URL in profiles:', profileError);
        // إذا فشل تحديث جدول الملف الشخصي، نعود عن التغيير في جدول users
        await supabase
          .from('users')
          .update({ avatar_url: '' })
          .eq('id', userId);
        
        return { success: false, error: profileError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error in updateAvatarUrl:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  },

  /**
   * رفع صورة شخصية جديدة وتحديث الرابط في الجداول
   * @param userId معرف المستخدم
   * @param file ملف الصورة المراد رفعها
   * @returns وعد بالنتيجة
   */
  async uploadAvatar(userId: string, file: File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    try {
      // 1. رفع الملف إلى التخزين
      const fileExt = file.name.split('.').pop();
      // إنشاء اسم ملف عشوائي لتجنب التعارض
      const randomFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      // إنشاء مسار الملف مع وضع معرف المستخدم كمجلد
      // (لا نضيف avatars مرة أخرى لأن اسم الحاوية هو avatars بالفعل)
      const filePath = `${userId}/${randomFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // 2. الحصول على الرابط العام للملف المرفوع
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. تحديث رابط الصورة في الجداول
      const updateResult = await this.updateAvatarUrl(userId, publicUrl);
      
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      return { success: true, avatarUrl: publicUrl };
    } catch (error) {
      console.error('Unexpected error in uploadAvatar:', error);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    }
  },

  /**
   * تحديث رمز QR في الجداول (profiles و users)
   * @param userId معرف المستخدم
   * @param qrDataUrl بيانات الـ QR بصيغة Base64
   * @returns وعد بالنتيجة
   */
  async updateUserQR(userId: string, qrDataUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. تحديث رمز QR في جدول public.profiles
      // نستخدم update بدلاً من upsert لتجنب مشاكل RLS المتعلقة بالإدخال الجديد
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_qr: qrDataUrl })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating QR in profiles table:', profileError);
        return { success: false, error: 'فشل تحديث رمز QR في جدول الملف الشخصي' };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error in updateUserQR:', error);
      return { success: false, error: 'حدث خطأ غير متوقع أثناء حفظ رمز QR' };
    }
  },

  /**
   * تحديث رقم الهاتف في جدول users
   * @param userId معرف المستخدم
   * @param phoneNumber رقم الهاتف الجديد
   * @returns وعد بالنتيجة
   */
  async updatePhoneNumber(userId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone_number: phoneNumber })
        .eq('id', userId);

      if (error) {
        console.error('Error updating phone number:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error in updatePhoneNumber:', error);
      return { success: false, error: 'حدث خطأ غير متوقع أثناء تحديث رقم الهاتف' };
    }
  }
};
