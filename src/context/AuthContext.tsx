import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { enhancedSignIn, enhancedSignUp } from '../services/network_fix';
import { signInWithAlternativeClient, signUpWithAlternativeClient } from '../services/alternative_network_fix';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { updateCurrentUserCache } from '../services/UserDataCache';

// نوع بيانات الـ profile من جدول users
export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  session: Session | null;
  supabase: SupabaseClient<any, "public", any>;
  user: User | null;
  userProfile: UserProfile | null; // بيانات المستخدم الكاملة من جدول users
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
  checkPhoneNumberExists: (userId: string) => Promise<{ exists: boolean; phoneNumber?: string }>;
  linkPhoneNumber: (phoneNumber: string, userId: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // جلب الـ profile من جدول users
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Failed to fetch user profile:', error);
        return null;
      }

      return profile as UserProfile;
    } catch (err) {
      console.error('[AuthContext] Exception fetching user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (isMounted) {
          if (error) {
            console.error('[AuthContext] Error getting session:', error.message);
            // إذا كان الخطأ بسبب رمز تحديث غير صالح، قم بتسجيل الخروج لتنظيف الحالة
            if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
              console.log('[AuthContext] Invalid refresh token detected. Signing out...');
              await supabase.auth.signOut();
              // مسح أي بيانات متبقية في التخزين المحلي
              localStorage.removeItem('supabase.shamil.token');
            }

            setSession(null);
            setUser(null);
            setUserProfile(null);
          } else {
            setSession(data.session);
            setUser(data.session?.user ?? null);

            // جلب الـ profile من جدول users
            if (data.session?.user) {
              const profile = await fetchUserProfile(data.session.user.id);
              if (isMounted) {
                setUserProfile(profile);
              }
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] Unexpected error during session fetch:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);

        // جلب الـ profile عند تغيير حالة المصادقة
        if (session?.user) {
          // استخدام IIFE لتجنب مشاكل async callback
          (async () => {
            try {
              const profile = await fetchUserProfile(session.user.id);
              if (isMounted) {
                setUserProfile(profile);
              }

              // تهيئة Cache للمستخدم الحالي عند تسجيل الدخول
              updateCurrentUserCache(session.user.id, {
                username: profile?.username || session.user.user_metadata?.username || 'User',
                avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || null
              }).catch(error => {
                console.error('[AuthContext] Failed to initialize user cache:', error);
              });
            } catch (err) {
              console.error('[AuthContext] Error in auth state change:', err);
            }
          })();
        } else {
          setUserProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // محاولة تسجيل الدخول باستخدام العميل الأصلي أولاً
    let response = await enhancedSignIn(email, password);

    // إذا فشل العميل الأصلي، جرب العميل البديل
    if (response.error && response.error.message.includes('Cannot connect to server')) {
      console.log('محاولة تسجيل الدخول باستخدام العميل البديل...');
      alert('جاري محاولة الاتصال بطريقة بديلة...');

      try {
        response = await signInWithAlternativeClient(email, password);
      } catch (altError: any) {
        console.log('فشل العميل البديل أيضاً:', altError);
        response = { error: { message: 'فشل جميع محاولات الاتصال بالخادم' } };
      }
    }

    // التحقق من وجود خاصية data في الاستجابة قبل الوصول إليها
    const data = 'data' in response ? response.data : null;
    const error = response.error;
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('بدء عملية إنشاء حساب جديد...');

    // محاولة إنشاء الحساب باستخدام العميل الأصلي أولاً
    console.log('محاولة إنشاء الحساب باستخدام العميل الأصلي...');
    let response = await enhancedSignUp(
      email,
      password,
      { data: { username: name } }
    );



    // إذا فشل العميل الأصلي، جرب العميل البديل
    if (response.error &&
      (response.error.message.includes('Cannot connect to server') ||
        response.error.message.includes('Network request failed') ||
        response.error.message.includes('fetch'))) {
      console.log('محاولة إنشاء الحساب باستخدام العميل البديل...');
      alert('جاري محاولة الاتصال بطريقة بديلة...');

      try {
        response = await signUpWithAlternativeClient(
          email,
          password,
          { data: { username: name } }
        );
        console.log('نتيجة المحاولة الثانية:', response);
      } catch (altError: any) {
        console.log('فشل العميل البديل أيضاً:', altError);
        response = { error: { message: 'فشل جميع محاولات الاتصال بالخادم' } };
      }
    }

    // التحقق من وجود خاصية data في الاستجابة قبل الوصول إليها
    const data = 'data' in response ? response.data : null;
    const error = response.error;

    if (error) {
      console.error('خطأ نهائي في إنشاء الحساب:', error);
      throw error;
    }

    console.log('تم إنشاء الحساب بنجاح:', data);
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const checkPhoneNumberExists = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('phone_number')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking phone number:', error);
        return { exists: false };
      }

      return {
        exists: !!data?.phone_number,
        phoneNumber: data?.phone_number
      };
    } catch (error) {
      console.error('Error in checkPhoneNumberExists:', error);
      return { exists: false };
    }
  };

  const linkPhoneNumber = async (phoneNumber: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone_number: phoneNumber })
        .eq('id', userId);

      if (error) {
        console.error('Error linking phone number:', error);
        return { success: false, error: error.message };
      }

      // Update local user state if needed (though it's fetched from cache mostly)
      if (user) {
        // Optimistic update or refetch could happen here
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in linkPhoneNumber:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    session,
    supabase,
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    checkPhoneNumberExists,
    linkPhoneNumber,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};