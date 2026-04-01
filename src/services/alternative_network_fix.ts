// ملف إصلاح إضافي لمعالجة مشاكل الاتصال بشكل أفضل
import { supabase } from './supabase';
import { createClient, type AuthFlowType } from '@supabase/supabase-js';

// دالة لإنشاء عميل Supabase بديل مع إعدادات مختلفة
export const createAlternativeSupabaseClient = () => {

  // إعدادات بديلة للتعامل مع مشاكل الشبكة
  const alternativeAuthOptions: any = {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    debug: false,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce' as AuthFlowType,
    // إعدادات fetch مختلفة
    fetch: (url: string, options: RequestInit = {}) => {
      // إضافة مهلة أطول للطلبات
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 ثانية

      // نسخ الخيارات وتعديلها
      const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          // إضافة رؤوس إضافية قد تساعد في الاتصال
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };

      return fetch(url, fetchOptions)
        .then(response => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          throw error;
        });
    }
  };

  // إنشاء عميل جديد بالإعدادات البديلة
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vrsuvebfqubzejpmoqqe.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc3V2ZWJmcXViemVqcG1vcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjEzODIsImV4cCI6MjA3MDA5NzM4Mn0.Mn0GUTVR_FlXBlA2kDkns31wSysWxwG7u7DEWNdF08Q';

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    { auth: alternativeAuthOptions }
  );
};

// دالة لتسجيل الدخول باستخدام العميل البديل
export const signInWithAlternativeClient = async (email: string, password: string) => {
  try {
    const alternativeClient = createAlternativeSupabaseClient();
    const response = await alternativeClient.auth.signInWithPassword({ email, password });

    // إذا نجحت المصادقة، قم بتحديث العميل الأصلي
    if (response.data.user && !response.error) {
      // نسخ بيانات الجلسة إلى العميل الأصلي
      const { data: { session } } = await alternativeClient.auth.getSession();
      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
      }
    }

    return response;
  } catch (error: any) {
    console.log('فشل تسجيل الدخول بالعميل البديل:', error);
    return { error: { message: error.message } };
  }
};

// دالة لإنشاء حساب باستخدام العميل البديل
export const signUpWithAlternativeClient = async (email: string, password: string, options: any) => {
  try {
    console.log('محاولة إنشاء الحساب باستخدام العميل البديل...');
    const alternativeClient = createAlternativeSupabaseClient();
    const response = await alternativeClient.auth.signUp({ email, password, options });

    console.log('نتيجة إنشاء الحساب بالعميل البديل:', response);
    
    // إذا نجح إنشاء الحساب، قم بتحديث العميل الأصلي
    if (response.data && response.data.user && !response.error) {
      console.log('تم إنشاء الحساب بنجاح، جاري تحديث الجلسة...');
      // نسخ بيانات الجلسة إلى العميل الأصلي
      try {
        const { data: { session } } = await alternativeClient.auth.getSession();
        if (session) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
          console.log('تم تحديث الجلسة بنجاح');
        }
      } catch (sessionError: any) {
        console.error('خطأ في تحديث الجلسة:', sessionError);
      }
    }

    return response;
  } catch (error: any) {
    console.log('فشل إنشاء الحساب بالعميل البديل:', error);
    return { error: { message: error.message } };
  }
};

// دالة للتحقق من إمكانية الوصول لخوادم Supabase
export const testSupabaseConnectivity = async () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vrsuvebfqubzejpmoqqe.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc3V2ZWJmcXViemVqcG1vcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjEzODIsImV4cCI6MjA3MDA5NzM4Mn0.Mn0GUTVR_FlXBlA2kDkns31wSysWxwG7u7DEWNdF08Q';

    // محاولة الوصول مباشرة لخادم Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};
