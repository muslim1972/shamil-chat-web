// Cache لبيانات المستخدمين الأساسية - للاختبار فقط
// يُحفظ فيه username و avatar_url لتجنب الجلب المستمر من قاعدة البيانات

import { cacheManager } from './CacheManager';

const USER_DATA_CACHE_KEY = 'user_data_cache';
const SHORT_CACHE_DURATION = 5 * 1000; // 5 ثوانٍ للاختبار السريع

export const saveUserData = async (userId: string, userData: {
  username: string;
  avatar_url: string | null;
}) => {
  try {
    const cacheData = {
      ...userData,
      cachedAt: Date.now()
    };
    
    // استخدام نظام CacheManager الموجود
    await cacheManager.set('messages', `${USER_DATA_CACHE_KEY}_${userId}`, cacheData);
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
};

export const getUserData = async (userId: string, supabase: any): Promise<{
  username: string;
  avatar_url: string | null;
} | null> => {
  try {
    // جلب من cache أولاً
    const cached = await cacheManager.get<{
      username: string;
      avatar_url: string | null;
      cachedAt: number;
    }>('messages', `${USER_DATA_CACHE_KEY}_${userId}`);
    
    // فحص انتهاء الصلاحية (5 ثواني للاختبار)
    if (cached && cached.cachedAt > Date.now() - SHORT_CACHE_DURATION) {
      return {
        username: cached.username,
        avatar_url: cached.avatar_url
      };
    }
    
    // إذا لم توجد في cache، جلب من قاعدة البيانات
    const { data, error } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.warn('User not found in DB:', userId);
      return null;
    }
    
    // حفظ في cache للاستخدام المستقبلي
    await saveUserData(userId, {
      username: data.username,
      avatar_url: data.avatar_url
    });
    
    return {
      username: data.username,
      avatar_url: data.avatar_url
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const updateCurrentUserCache = async (userId: string, userData: {
  username: string;
  avatar_url: string | null;
}) => {
  try {
    await saveUserData(userId, userData);
  } catch (error) {
    console.error('Error updating current user cache:', error);
  }
};