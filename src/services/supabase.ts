import { createClient } from '@supabase/supabase-js';

// استخدم متغيرات البيئة أو قيم افتراضية للتطوير
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vrsuvebfqubzejpmoqqe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc3V2ZWJmcXViemVqcG1vcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjEzODIsImV4cCI6MjA3MDA5NzM4Mn0.Mn0GUTVR_FlXBlA2kDkns31wSysWxwG7u7DEWNdF08Q';

// إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'supabase.shamil.token', // <-- !! فقط أضف هذا السطر !!
  }
});

// دالة لإعادة تعيين الجلسة بالكامل
export const resetSession = async () => {
  try {
    const keys = Object.keys(localStorage);
    const supabaseKeys = keys.filter(key =>
      key.includes('supabase.auth') ||
      key.includes('sb-') ||
      key.includes('@supabase')
    );

    if (supabaseKeys.length > 0) {
      supabaseKeys.forEach(key => localStorage.removeItem(key));
      // تم تنظيف ذاكرة التخزين المؤقت للمصادقة
    }

    await supabase.auth.signOut({ scope: 'local' });

    return true;
  } catch (error) {
    console.error('خطأ في إعادة تعيين الجلسة:', error);
    return false;
  }
};

