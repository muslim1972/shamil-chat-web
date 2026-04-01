import { useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import type { Conversation } from '../../types';
import { CacheStrategy } from '../core/CacheStrategy';
import { syncConversations } from '../utils/syncWithDatabase';
import { CACHE_CONFIG } from '../core/CacheConfig';

interface UseConversationsCacheReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  stopPreloading: () => void;
}

// تحسين الأداء على الموبايل
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const MOBILE_PRELOAD_DELAY = CACHE_CONFIG.PRELOAD_DELAY_MS;
const DESKTOP_PRELOAD_DELAY = 5000;
const BATCH_SIZE = CACHE_CONFIG.CONVERSATIONS_BATCH_SIZE;


import { getNonDistantUserIds } from '../../utils/shamliNotificationFilter';

const fetchAndCacheConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // جلب المحادثات الأساسية أولاً
    const { data, error: dbError } = await supabase.rpc('get_user_conversations', {
      p_user_id: userId,
    });

    if (dbError) throw dbError;

    // 🌌 جلب قائمة المستخدمين غير البعيدين (فلترة شملي)
    // هذا يشمل: الثابتون + الخلان + دائرة الضوء
    // البعيدون (نجمة واحدة أو لا اتصال) غير موجودين في هذه القائمة
    const nonDistantUserIds = await getNonDistantUserIds(userId);
    const nonDistantSet = new Set(nonDistantUserIds);

    // جمع معرفات المستخدمين بكفاءة
    // 🌌 مع فلترة البعيدين من قائمة المعرفات التي سنجلب بياناتها
    const userIds = new Set<string>();

    // فلترة البيانات الأولية للمحادثات
    const filteredData = (data || []).filter((conv: any) => {
      // المحادثات الجماعية تظهر دائماً
      if (conv.participants && conv.participants.length > 2) return true;

      // المحادثات الفردية
      const otherId = conv.participants?.find((id: string) => id !== userId);

      // إذا لم نجد طرف آخر (غريب)، أو كان الطرف الآخر "بعيداً"، نخفي المحادثة
      if (!otherId) return false;

      // هل المستخدم الآخر في قائمة "غير البعيدين"؟
      if (nonDistantSet.has(otherId)) return true;

      // المستخدم بعيد -> إخفاء المحادثة
      console.log(`🌌 [Conversations] Hiding distant conversation: ${conv.id} with user ${otherId}`);
      return false;
    });

    filteredData.forEach((conv: any) => {
      if (conv.participants && Array.isArray(conv.participants)) {
        conv.participants.forEach((id: string) => {
          if (id !== userId) userIds.add(id);
        });
      }
    });

    // ✅ جلب عدد الرسائل غير المقروءة بدقة (باستخدام الدالة الجديدة v2 التي تعتمد على auth.uid)
    let unreadCountsMap = new Map<string, number>();
    try {
      const { data: unreadData, error: unreadError } = await supabase.rpc('get_unread_message_counts_v2');

      if (!unreadError && unreadData) {
        console.log('[Conversations] Unread counts (v2):', unreadData);
        unreadData.forEach((item: any) => {
          unreadCountsMap.set(item.conversation_id, item.unread_count);
        });
      } else if (unreadError) {
        console.warn('[Conversations] Error fetching unread counts:', unreadError);
      }
    } catch (e) {
      console.error('[Conversations] Unexpected error fetching unread counts:', e);
    }

    // جلب بيانات المستخدمين مرة واحدة فقط
    let usersMap = new Map<string, any>();
    if (userIds.size > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', Array.from(userIds));

      if (usersError) {
        console.error('Error fetching users data:', usersError);
      } else if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.id, user);
        });
      }
    }

    // تحويل البيانات للشكل المطلوب
    // ✅ تحسين: جلب آخر رسالة لكل المحادثات المفلترة دفعة واحدة
    const conversationIds = filteredData.map((conv: any) => conv.id);

    // Batch fetch لآخر رسالة لكل محادثة
    let lastMessagesMap = new Map<string, any>();
    if (conversationIds.length > 0) {
      try {
        const { data: allLastMessages, error: lastMsgsError } = await supabase
          .from('messages')
          .select('id, content, message_type, caption, media_metadata, conversation_id, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });

        if (!lastMsgsError && allLastMessages) {
          // Group by conversation_id - احتفظ بأحدث رسالة فقط لكل محادثة
          allLastMessages.forEach((msg: any) => {
            if (!lastMessagesMap.has(msg.conversation_id)) {
              lastMessagesMap.set(msg.conversation_id, msg);
            }
          });
        }
      } catch (e) {
        console.error('[Conversations] Error fetching last messages:', e);
      }
    }

    const freshConversations: Conversation[] = filteredData.map((conv: any) => {
      const otherUserId = conv.participants?.find((id: string) => id !== userId);
      const otherUser = otherUserId ? usersMap.get(otherUserId) : null;

      // الحصول على آخر رسالة من الـ Map
      const lastMessageMeta = lastMessagesMap.get(conv.id) || null;

      // الحصول على عدد الرسائل غير المقروءة من الـ Map الجديد
      // نستخدم 0 كقيمة افتراضية إذا لم يوجد
      const unreadCount = unreadCountsMap.get(conv.id) || 0;

      return {
        id: conv.id,
        name: otherUser?.username || conv.other_username || 'مستخدم',
        participants: conv.participants,
        lastMessage: conv.last_message,
        lastMessageMeta,
        timestamp: conv.updated_at,
        unread: unreadCount > 0,
        unreadCount: unreadCount,
        archived: false,
        avatar_url: otherUser?.avatar_url,
      };
    });

    // مزامنة مع الكاش المحلي
    const cached = await CacheStrategy.getConversations(userId);
    const { synced } = syncConversations(cached, freshConversations);

    // حفظ في الكاش
    await CacheStrategy.saveConversations(userId, synced);

    return synced;
  } catch (error) {
    console.error('[Conversations] Fetch error:', error);
    // في حالة الخطأ، حاول إرجاع الكاش المحلي
    const cached = await CacheStrategy.getConversations(userId);
    if (cached.length > 0) {
      return cached;
    }
    throw error;
  }
};

export const useConversationsCache = (): UseConversationsCacheReturn => {
  const { user } = useAuth();
  const preloadAbortRef = useRef<AbortController | null>(null);
  const isPreloadingRef = useRef(false);
  const preloadTimerRef = useRef<number | null>(null);

  // استخدام React Query للكاش والتحديث التلقائي
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch
  } = useQuery<Conversation[], Error>({
    queryKey: ['conversations', user?.id],
    queryFn: ({ queryKey }) => fetchAndCacheConversations(String(queryKey[1] || '')),
    enabled: !!user?.id,
    staleTime: 30000, // 30 ثانية قبل اعتبار البيانات قديمة
    gcTime: 5 * 60 * 1000, // 5 دقائق في الكاش
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchInterval: false, // لا تحديث تلقائي دوري
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // تحميل مسبق ذكي للمحادثات
  const startPreloading = useCallback(async (convs: Conversation[]) => {
    if (isPreloadingRef.current || !convs.length) return;

    isPreloadingRef.current = true;
    preloadAbortRef.current = new AbortController();

    // تم حذف رسائل الكونسول لتحسين الأداء

    // تحميل على دفعات صغيرة
    for (let i = 0; i < convs.length; i += BATCH_SIZE) {
      if (preloadAbortRef.current?.signal.aborted) {
        break;
      }

      const batch = convs.slice(i, i + BATCH_SIZE);

      // تحميل دفعة المحادثات
      await Promise.all(batch.map(async (_conv) => {
        if (preloadAbortRef.current?.signal.aborted) return;

        try {
          // هنا يمكنك إضافة منطق التحميل المسبق للرسائل
          // مثلاً: تحميل آخر 5 رسائل من كل محادثة

          // تأخير صغير بين كل محادثة لعدم إرهاق الشبكة
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // تم حذف رسالة الخطأ لتحسين الأداء
        }
      }));

      // تأخير بين الدفعات
      if (!preloadAbortRef.current?.signal.aborted && i + BATCH_SIZE < convs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    isPreloadingRef.current = false;
    // تم حذف رسالة الكونسول لتحسين الأداء
  }, []);

  // جدولة التحميل المسبق بذكاء
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      // تحديد التأخير حسب نوع الجهاز
      const delay = isMobile() ? MOBILE_PRELOAD_DELAY : DESKTOP_PRELOAD_DELAY;

      // إلغاء أي جدولة سابقة
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
      }

      // جدولة التحميل المسبق
      preloadTimerRef.current = window.setTimeout(() => {
        // التحقق من حالة الشبكة قبل البدء
        if (navigator.onLine && !document.hidden) {
          startPreloading(conversations);
        }
      }, delay);

      return () => {
        if (preloadTimerRef.current) {
          clearTimeout(preloadTimerRef.current);
        }
      };
    }
  }, [conversations, startPreloading]);

  // Real-time للأرشفة والتحديثات
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants.cs.{${user.id}}`
        },
        (payload) => {
          // تم حذف رسالة الكونسول لتحسين الأداء

          // تحديث ذكي حسب نوع الحدث
          if (payload.eventType === 'INSERT') {
            // محادثة جديدة - تحديث فوري
            refetch();
          } else if (payload.eventType === 'UPDATE') {
            // تحديث محادثة - تحديث بتأخير قصير
            setTimeout(() => refetch(), 500);
          } else if (payload.eventType === 'DELETE') {
            // حذف محادثة - تحديث فوري
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // مراقبة حالة الشبكة
  useEffect(() => {
    // ✅ Ref لتجنب التكرار
    let visibilityDebounce: number | null = null;

    const handleOnline = () => {
      // تم حذف رسالة الكونسول لتحسين الأداء
      refetch();
    };

    const handleVisibilityChange = () => {
      // ✅ إضافة debounce لتجنب refetch متكرر
      if (!document.hidden && navigator.onLine) {
        if (visibilityDebounce) clearTimeout(visibilityDebounce);
        visibilityDebounce = window.setTimeout(() => {
          if (!document.hidden) {
            refetch();
          }
        }, 1000); // تأخير 1 ثانية
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounce) clearTimeout(visibilityDebounce);
    };
  }, [refetch]);

  // إيقاف التحميل المسبق
  const stopPreloading = useCallback(() => {
    if (preloadAbortRef.current && !preloadAbortRef.current.signal.aborted) {
      // تم حذف رسالة الكونسول لتحسين الأداء
      preloadAbortRef.current.abort();
      isPreloadingRef.current = false;
    }

    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }
  }, []);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      stopPreloading();
    };
  }, [stopPreloading]);

  return {
    conversations,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => {
      stopPreloading(); // إيقاف أي تحميل مسبق جاري
      refetch();
    },
    stopPreloading,
  };
};