// ملف لإصلاح مشكلة المصادقة تلقائياً عند بدء التطبيق

// دالة لتنظيف ذاكرة التخزين المؤقت للمصادقة
export const clearAuthCache = async () => {
  try {
    // الحصول على جميع المفاتيح في localStorage
    const keys = Object.keys(localStorage);

    // تصفية المفاتيح المتعلقة بالمصادقة في Supabase
    const supabaseKeys = keys.filter(key =>
      key.includes('supabase.auth') ||
      key.includes('sb-') ||
      key.includes('@supabase')
    );

    // حذف المفاتيح المتعلقة بالمصادقة
    if (supabaseKeys.length > 0) {
      supabaseKeys.forEach(key => localStorage.removeItem(key));
      console.log('تم تنظيف ذاكرة التخزين المؤقت للمصادقة:', supabaseKeys);
    } else {
      // حذف المفاتيح القديمة للتأكد
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      console.log('تم تنظيف مفاتيح المصادقة القديمة');
    }

    return true;
  } catch (error) {
    console.error('خطأ في تنظيف ذاكرة التخزين المؤقت:', error);
    return false;
  }
};

// دالة للتحقق من وجود خطأ في الجلسة وإصلاحه تلقائياً
export const autoFixAuthSession = async () => {
  try {
    // التحقق من وجود جلسة صالحة
    const sessionStr = localStorage.getItem('supabase.auth.token');
    if (!sessionStr) {
      console.log('لا توجد جلسة مخزنة، لا حاجة للإصلاح');
      return false;
    }

    try {
      // محاولة تحليل بيانات الجلسة
      const session = JSON.parse(sessionStr);
      const expiresAt = session?.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);

      // التحقق مما إذا كانت الجلسة منتهية الصلاحية
      if (expiresAt < now) {
        console.log('الجلسة منتهية الصلاحية، جاري تنظيف الذاكرة المؤقتة...');
        await clearAuthCache();
        return true;
      }
    } catch (parseError) {
      console.error('خطأ في تحليل بيانات الجلسة:', parseError);
      // في حالة وجود خطأ في تحليل البيانات، قم بتنظيف الذاكرة المؤقتة
      await clearAuthCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('خطأ في التحقق من الجلسة:', error);
    return false;
  }
};

// دالة لإصلاح مشكلة "Auth session missing!"
export const fixMissingAuthSession = async () => {
  try {
    // تنظيف ذاكرة التخزين المؤقت للمصادقة
    await clearAuthCache();
    console.log('تم تنظيف ذاكرة التخزين المؤقت لإصلاح مشكلة "Auth session missing!"');
    return true;
  } catch (error) {
    console.error('خطأ في إصلاح مشكلة "Auth session missing!":', error);
    return false;
  }
};
