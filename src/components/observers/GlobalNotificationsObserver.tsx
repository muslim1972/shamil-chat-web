import React, { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { pushNotificationsService } from '../../services/PushNotificationsService';

export const GlobalNotificationsObserver: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // تهيئة خدمة إشعارات الدفع (Push)
    pushNotificationsService.initialize().catch(err => {
        console.error('[GlobalObserver] Failed to init PushNotifications:', err);
    });

    // منع إنشاء قناة مكررة
    if (channelRef.current) return;

    const notify = (source: string) => {
      // طباعة للتتبع
      console.log(`[GlobalObserver] Realtime update detected from: ${source}`);
      // إطلاق الحدث العام ليقوم useNotifications بالتحديث
      window.dispatchEvent(new Event('global-notification-refresh'));
    };

    console.log('[GlobalObserver] Initializing subscription for user:', userId);

    const channel = supabase
      .channel(`global-notifications-observer-${userId}`)

      // 1. الإشعارات الرسمية (التي تصل لجدول notifications)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => notify('notifications')
      )

      // 2. المحتوى الجديد
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => notify('posts')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shamatube_videos' },
        () => notify('shamatube_videos')
      )

      // 3. التفاعلات الخام (لضمان الاستجابة اللحظية مثل شاغرام وشاماتيوب)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        () => notify('post_likes')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        () => notify('post_comments')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shamatube_comments' },
        () => notify('shamatube_comments')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'article_likes' },
        () => notify('article_likes')
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'article_comments' },
        () => notify('article_comments')
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[GlobalObserver] ✅ Subscribed to ALL notification sources');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return null;
};
