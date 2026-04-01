// Hook لجلب الإشعارات من كل التطبيقات الفرعية
// يجمع الإشعارات من: المحادثات، ShamaGram، المتاجر، AI Chat
// 🌌 يدعم فلترة شملي - يحجب المحتوى عن البعيدين (المدار الرابع)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { summarizeMessage } from '../utils/messagePreview';
import { getNonDistantUserIds, shouldReceiveNotification } from '../utils/shamliNotificationFilter';

// أنواع التطبيقات الفرعية
export type NotificationSource =
    | 'conversations'
    | 'shagram'
    | 'nadara'
    | 'haja'
    | 'ai-chat'
    | 'shamatube';

// نوع الإشعار
export interface Notification {
    id: string;
    source: NotificationSource;
    sourceIcon: string;
    sourceColor: string;
    title: string;
    body: string;
    timestamp: string;
    isRead: boolean;
    metadata?: {
        conversationId?: string;
        postId?: string;
        orderId?: string;
        videoId?: string;
        avatarUrl?: string;
        imageUrl?: string;
        notificationId?: string; // ID الإشعار في جدول notifications لتحديث حالة القراءة
        actionType?: string; // نوع الإشعار (like, comment, new_post)
    };
}

// إحصائيات الإشعارات حسب التطبيق
export interface NotificationStats {
    conversations: number;
    shagram: number;
    nadara: number;
    haja: number;
    aiChat: number;
    shamatube: number;
    total: number;
}

// تكوين مصادر الإشعارات
const SOURCE_CONFIG: Record<NotificationSource, { icon: string; color: string; label: string }> = {
    conversations: { icon: '💬', color: 'from-blue-500 to-indigo-600', label: 'المحادثات' },
    shagram: { icon: '📷', color: 'from-pink-500 to-rose-600', label: 'ShamaGram' },
    nadara: { icon: '🥬', color: 'from-green-500 to-emerald-600', label: 'نضارة' },
    haja: { icon: '🛒', color: 'from-blue-500 to-teal-500', label: 'حاجة بألف' },
    'ai-chat': { icon: '🤖', color: 'from-indigo-500 to-purple-600', label: 'الذكاء الاصطناعي' },
    shamatube: { icon: '🎬', color: 'from-red-500 to-orange-600', label: 'ShamaTube' },
};

interface UseNotificationsOptions {
    filter?: NotificationSource | 'all';
    limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
    const { filter = 'all', limit = 50 } = options;
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // حساب stats ديناميكياً من notifications (يتحدث تلقائياً عند تغيير notifications)
    const stats = useMemo<NotificationStats>(() => {
        const counts: NotificationStats = {
            conversations: 0,
            shagram: 0,
            nadara: 0,
            haja: 0,
            aiChat: 0,
            shamatube: 0,
            total: 0,
        };

        // حساب الإشعارات غير المقروءة فقط
        notifications.forEach(notification => {
            if (!notification.isRead) {
                switch (notification.source) {
                    case 'conversations':
                        counts.conversations++;
                        break;
                    case 'shagram':
                        counts.shagram++;
                        break;
                    case 'nadara':
                        counts.nadara++;
                        break;
                    case 'haja':
                        counts.haja++;
                        break;
                    case 'ai-chat':
                        counts.aiChat++;
                        break;
                    case 'shamatube':
                        counts.shamatube++;
                        break;
                }
            }
        });

        // حساب الإجمالي (نطرح total لأنه موجود في Object.values)
        counts.total = counts.conversations + counts.shagram + counts.nadara + counts.haja + counts.aiChat + counts.shamatube;

        return counts;
    }, [notifications]);

    // جلب الإشعارات
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;

        setLoading(true);
        const allNotifications: Notification[] = [];

        try {
            // 1. جلب الرسائل الجديدة (المحادثات)
            if (filter === 'all' || filter === 'conversations') {
                // جلب الرسائل
                const { data: messages, error: messagesError } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        message_type,
                        caption,
                        media_metadata,
                        created_at,
                        sender_id,
                        conversation_id,
                        sender:users!messages_sender_id_fkey(username, avatar_url)
                    `)
                    .neq('sender_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50); // جلب أكثر لأننا سنفلتر بعد ذلك

                if (messagesError) {
                    console.error('[useNotifications] Error fetching messages:', messagesError);
                }

                if (messages && messages.length > 0) {
                    // جلب سجلات القراءة للمستخدم الحالي
                    const messageIds = messages.map(m => m.id);
                    const { data: reads } = await supabase
                        .from('message_reads')
                        .select('message_id')
                        .eq('user_id', user.id)
                        .in('message_id', messageIds);

                    const readMessageIds = new Set(reads?.map(r => r.message_id) || []);

                    const config = SOURCE_CONFIG.conversations;
                    // فقط الرسائل غير المقروءة
                    const unreadMessages = messages.filter(msg => !readMessageIds.has(msg.id));

                    unreadMessages.slice(0, 10).forEach((msg: any) => {
                        // استخدام summarizeMessage لتحديد نوع الرسالة بدلاً من عرض الرابط الخام
                        const messageBody = summarizeMessage({
                            message_type: msg.message_type,
                            content: msg.content,
                            caption: msg.caption,
                            media_metadata: msg.media_metadata,
                        }, false) || 'رسالة جديدة';

                        allNotifications.push({
                            id: `msg-${msg.id}`,
                            source: 'conversations',
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            title: msg.sender?.username || 'مستخدم',
                            body: messageBody,
                            timestamp: msg.created_at,
                            isRead: false,
                            metadata: {
                                conversationId: msg.conversation_id,
                                avatarUrl: msg.sender?.avatar_url,
                            },
                        });
                    });
                }
            }

            // 2. جلب منشورات ShamaGram الجديدة (مع فلترة شملي)
            if (filter === 'all' || filter === 'shagram') {
                // 🌌 جلب قائمة المستخدمين في المدارات القريبة
                const nonDistantUserIds = await getNonDistantUserIds(user.id);

                const lastVisit = localStorage.getItem('shagram_last_visit');
                let query = supabase
                    .from('posts')
                    .select(`
                        id,
                        caption,
                        created_at,
                        user_id,
                        image_url,
                        user:users(username, avatar_url)
                    `)
                    .neq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20); // زيادة الحد لأننا سنفلتر

                if (lastVisit) {
                    query = query.gt('created_at', lastVisit);
                }

                // 🌌 فلترة على مستوى قاعدة البيانات إذا وجدت اتصالات
                if (nonDistantUserIds.length > 0) {
                    query = query.in('user_id', nonDistantUserIds);
                }

                const { data: posts, error: postsError } = await query;

                if (postsError) {
                    console.error('[useNotifications] Error fetching posts:', postsError);
                }

                if (posts && posts.length > 0) {
                    const config = SOURCE_CONFIG.shagram;
                    // 🌌 فلترة إضافية للتأكد (في حالة عدم وجود اتصالات، لا نعرض شيء)
                    const filteredPosts = nonDistantUserIds.length > 0 ? posts : [];

                    filteredPosts.slice(0, 10).forEach((post: any) => {
                        allNotifications.push({
                            id: `post-${post.id}`,
                            source: 'shagram',
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            title: `${post.user?.username || 'مستخدم'} نشر صورة جديدة`,
                            body: post.caption?.substring(0, 80) || '',
                            timestamp: post.created_at,
                            isRead: false,
                            metadata: {
                                postId: post.id,
                                avatarUrl: post.user?.avatar_url,
                                imageUrl: post.image_url,
                            },
                        });
                    });
                }

                // 2.1 جلب إشعارات الإعجابات والتعليقات من جدول notifications
                const { data: shagramNotifications, error: shagramNotifsError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('recipient_id', user.id)
                    .eq('entity_type', 'shagram_post')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (shagramNotifsError) {
                    console.error('[useNotifications] Error fetching shagram notifications:', shagramNotifsError);
                }

                if (shagramNotifications && shagramNotifications.length > 0) {
                    const config = SOURCE_CONFIG.shagram;

                    // جلب بيانات المرسلين
                    const senderIds = shagramNotifications
                        .map(n => n.sender_id)
                        .filter((id): id is string => id !== null);

                    const { data: senders } = await supabase
                        .from('users')
                        .select('id, username, avatar_url')
                        .in('id', senderIds);

                    const sendersMap = new Map(senders?.map(s => [s.id, s]) || []);

                    shagramNotifications.forEach((notif: any) => {
                        const sender = sendersMap.get(notif.sender_id);
                        // تحديد النص الذكي حسب نوع الإشعار (مأخوذ من body)
                        let title = notif.body || notif.title || '';

                        allNotifications.push({
                            id: `notif-shagram-${notif.id}`,
                            source: 'shagram',
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            title: title,
                            body: notif.action_type === 'like' ? '❤️' : notif.action_type === 'comment' ? '💬' : '',
                            timestamp: notif.created_at,
                            isRead: notif.is_read,
                            metadata: {
                                postId: notif.entity_id,
                                avatarUrl: sender?.avatar_url,
                                imageUrl: notif.metadata?.image_url,
                                notificationId: notif.id, // لحفظ ID للتحديث لاحقاً
                                actionType: notif.action_type, // نوع الإشعار
                            },
                        });
                    });
                }
            }

            // 3. جلب فيديوهات ShamaTube الجديدة (مع فلترة شملي)
            if (filter === 'all' || filter === 'shamatube') {
                // 🌌 إعادة استخدام قائمة المستخدمين القريبين (إذا لم تُجلب من قبل)
                const shamatubeNonDistantIds = await getNonDistantUserIds(user.id);

                const lastVisit = localStorage.getItem('shamatube_last_visit');
                let query = supabase
                    .from('shamatube_videos')
                    .select('id, title, thumbnail_url, created_at, user_id')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (lastVisit) {
                    query = query.gt('created_at', lastVisit);
                }

                // 🌌 فلترة على مستوى قاعدة البيانات
                if (shamatubeNonDistantIds.length > 0) {
                    query = query.in('user_id', shamatubeNonDistantIds);
                }

                const { data: videos } = await query;

                if (videos && shamatubeNonDistantIds.length > 0) {
                    const config = SOURCE_CONFIG.shamatube;
                    videos.slice(0, 5).forEach((video: any) => {
                        allNotifications.push({
                            id: `video-${video.id}`,
                            source: 'shamatube',
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            title: 'فيديو جديد في ShamaTube',
                            body: video.title?.substring(0, 80) || '',
                            timestamp: video.created_at,
                            isRead: false,
                            metadata: {
                                videoId: video.id,
                                imageUrl: video.thumbnail_url,
                            },
                        });
                    });
                }
            }

            // ترتيب حسب الوقت
            allNotifications.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // تطبيق حالة القراءة المحفوظة من localStorage
            const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
            const deletedNotifications = JSON.parse(localStorage.getItem('deleted_notifications') || '[]');

            // فلترة الإشعارات المحذوفة وتطبيق حالة القراءة
            const filteredNotifications = allNotifications.filter(n => !deletedNotifications.includes(n.id));
            filteredNotifications.forEach(notification => {
                if (readNotifications.includes(notification.id)) {
                    notification.isRead = true;
                }
            });

            setNotifications(filteredNotifications.slice(0, limit));
        } catch (error) {
            console.error('[useNotifications] Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, filter, limit]);

    // تحميل الإشعارات عند التحميل الأول
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // الاشتراك المباشر في Supabase (نفس نمط HomeDashboard الذي يعمل بنجاح)
    useEffect(() => {
        if (!user?.id) return;

        console.log('[useNotifications] Setting up direct Supabase subscription...');

        // دالة مساعدة لإنشاء إشعار من حدث خام
        const createNotificationFromEvent = async (
            eventType: 'like' | 'comment' | 'post' | 'video' | 'message',
            payload: any
        ): Promise<Notification | null> => {
            try {
                const newData = payload.new;
                if (!newData) return null;

                // جلب بيانات المستخدم صاحب الحدث
                let actorId = newData.user_id || newData.sender_id;
                if (!actorId || actorId === user.id) return null; // تجاهل أحداثي الشخصية

                const { data: userData } = await supabase
                    .from('users')
                    .select('username, avatar_url')
                    .eq('id', actorId)
                    .single();

                const username = userData?.username || 'مستخدم';
                const avatar = userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorId}`;

                // تحديد نوع المصدر والرسالة
                let source: NotificationSource;
                let title = '';
                let subtitle = '';
                let postId = '';

                switch (eventType) {
                    case 'like':
                        source = 'shagram';
                        title = `${username} أعجب بمنشورك`;
                        subtitle = '❤️ إعجاب جديد';
                        postId = newData.post_id;
                        break;
                    case 'comment':
                        source = 'shagram';
                        title = `${username} علق على منشورك`;
                        subtitle = newData.content?.substring(0, 50) || '💬 تعليق جديد';
                        postId = newData.post_id;
                        break;
                    case 'post':
                        source = 'shagram';
                        title = `${username} نشر منشوراً جديداً`;
                        subtitle = newData.content?.substring(0, 50) || '📷 منشور جديد';
                        postId = newData.id;
                        break;
                    case 'video':
                        source = 'shamatube';
                        title = `${username} رفع فيديو جديد`;
                        subtitle = newData.title || '🎬 فيديو جديد';
                        break;
                    case 'message':
                        source = 'conversations';
                        title = `رسالة من ${username}`;
                        // استخدام summarizeMessage للرسائل الفورية أيضاً
                        subtitle = summarizeMessage({
                            message_type: newData.message_type,
                            content: newData.content,
                            caption: newData.caption,
                            media_metadata: newData.media_metadata,
                        }, false) || '💬 رسالة جديدة';
                        break;
                    default:
                        return null;
                }

                const config = SOURCE_CONFIG[source];
                const notification: Notification = {
                    id: `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    source,
                    title,
                    body: subtitle,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    sourceIcon: config.icon,
                    sourceColor: config.color,
                    metadata: {
                        postId,
                        actionType: eventType,
                        avatarUrl: avatar,
                    },
                };

                return notification;
            } catch (error) {
                console.error('[useNotifications] Error creating notification from event:', error);
                return null;
            }
        };

        // إضافة إشعار جديد للقائمة (Optimistic Update - نفس نمط HomeDashboard)
        const addNotification = (notification: Notification) => {
            console.log('[useNotifications] ✅ Adding realtime notification:', notification.title);
            setNotifications(prev => {
                // تجنب التكرار
                if (prev.some(n => n.id === notification.id)) return prev;
                // إضافة في البداية
                return [notification, ...prev].slice(0, limit);
            });
        };

        // الاشتراك في الجداول (نفس أسلوب HomeDashboard)
        const channel = supabase
            .channel(`notifications-realtime-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'post_likes' },
                async (payload) => {
                    // التحقق: هل هذا الإعجاب على منشور لي؟
                    const { data: post } = await supabase
                        .from('posts')
                        .select('user_id')
                        .eq('id', payload.new.post_id)
                        .single();

                    if (post?.user_id === user.id) {
                        const notif = await createNotificationFromEvent('like', payload);
                        if (notif) addNotification(notif);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'post_comments' },
                async (payload) => {
                    const { data: post } = await supabase
                        .from('posts')
                        .select('user_id')
                        .eq('id', payload.new.post_id)
                        .single();

                    if (post?.user_id === user.id) {
                        const notif = await createNotificationFromEvent('comment', payload);
                        if (notif) addNotification(notif);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                async (payload) => {
                    // إظهار إشعار المنشورات الجديدة (من الآخرين فقط)
                    if (payload.new.user_id !== user.id) {
                        // 🌌 فلترة شملي - التحقق من أن المستخدم ليس بعيداً
                        const shouldShow = await shouldReceiveNotification(user.id, payload.new.user_id);
                        if (!shouldShow) {
                            console.log('[useNotifications] 🌌 Post from distant user filtered:', payload.new.user_id);
                            return;
                        }

                        const notif = await createNotificationFromEvent('post', payload);
                        if (notif) addNotification(notif);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=neq.${user.id}` },
                async (payload) => {
                    const notif = await createNotificationFromEvent('message', payload);
                    if (notif) addNotification(notif);
                }
            )
            // ✅ شاماتيوب - فيديوهات جديدة (مع فلترة شملي)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'shamatube_videos' },
                async (payload) => {
                    // إظهار إشعار الفيديوهات الجديدة (من الآخرين فقط)
                    if (payload.new.user_id !== user.id) {
                        // 🌌 فلترة شملي - التحقق من أن المستخدم ليس بعيداً
                        const shouldShow = await shouldReceiveNotification(user.id, payload.new.user_id);
                        if (!shouldShow) {
                            console.log('[useNotifications] 🌌 Video from distant user filtered:', payload.new.user_id);
                            return;
                        }

                        const notif = await createNotificationFromEvent('video', payload);
                        if (notif) addNotification(notif);
                    }
                }
            )
            // ✅ شاماتيوب - تعليقات جديدة
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'shamatube_comments' },
                async (payload) => {
                    // التحقق: هل هذا التعليق على فيديو لي؟
                    const { data: video } = await supabase
                        .from('shamatube_videos')
                        .select('user_id')
                        .eq('id', payload.new.video_id)
                        .single();

                    if (video?.user_id === user.id && payload.new.user_id !== user.id) {
                        // إنشاء إشعار للتعليق على فيديو
                        const actorId = payload.new.user_id;
                        const { data: userData } = await supabase
                            .from('users')
                            .select('username, avatar_url')
                            .eq('id', actorId)
                            .single();

                        const username = userData?.username || 'مستخدم';
                        const avatar = userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorId}`;
                        const config = SOURCE_CONFIG['shamatube'];

                        const notification: Notification = {
                            id: `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            source: 'shamatube',
                            title: `${username} علق على فيديوك`,
                            body: payload.new.content?.substring(0, 50) || '💬 تعليق جديد',
                            timestamp: new Date().toISOString(),
                            isRead: false,
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            metadata: {
                                videoId: payload.new.video_id,
                                actionType: 'comment',
                                avatarUrl: avatar,
                            },
                        };
                        addNotification(notification);
                    }
                }
            )
            // ✅ شاماتيوب - إعجابات (reactions) على الفيديوهات
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'shamatube_emotions' },
                async (payload) => {
                    // التحقق: هل هذا الإعجاب على فيديو لي؟
                    const { data: video } = await supabase
                        .from('shamatube_videos')
                        .select('user_id')
                        .eq('id', payload.new.video_id)
                        .single();

                    if (video?.user_id === user.id && payload.new.user_id !== user.id) {
                        // إنشاء إشعار للإعجاب على فيديو
                        const actorId = payload.new.user_id;
                        const { data: userData } = await supabase
                            .from('users')
                            .select('username, avatar_url')
                            .eq('id', actorId)
                            .single();

                        const username = userData?.username || 'مستخدم';
                        const avatar = userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${actorId}`;
                        const config = SOURCE_CONFIG['shamatube'];
                        const emotionType = payload.new.emotion_type || '❤️';

                        const notification: Notification = {
                            id: `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            source: 'shamatube',
                            title: `${username} تفاعل مع فيديوك`,
                            body: `${emotionType} إعجاب على فيديوك`,
                            timestamp: new Date().toISOString(),
                            isRead: false,
                            sourceIcon: config.icon,
                            sourceColor: config.color,
                            metadata: {
                                videoId: payload.new.video_id,
                                actionType: 'like',
                                avatarUrl: avatar,
                            },
                        };
                        addNotification(notification);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[useNotifications] ✅ Direct Supabase subscription active!');
                }
            });

        return () => {
            console.log('[useNotifications] Cleaning up subscription...');
            supabase.removeChannel(channel);
        };
    }, [user?.id, limit]);

    // تأشير إشعار كمقروء
    const markAsRead = useCallback(async (notificationId: string) => {
        // العثور على الإشعار للحصول على notificationId من metadata
        const notification = notifications.find(n => n.id === notificationId);

        // إذا كان الإشعار من جدول notifications، حدّث قاعدة البيانات
        if (notification?.metadata?.notificationId) {
            try {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notification.metadata.notificationId);
            } catch (error) {
                console.error('[markAsRead] Error updating notification in database:', error);
            }
        }

        // تحديث محلي
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );

        // حفظ في localStorage للإشعارات الأخرى (messages, posts, etc)
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        if (!readNotifications.includes(notificationId)) {
            readNotifications.push(notificationId);
            localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
        }
    }, [notifications]);

    // تأشير الكل كمقروء
    const markAllAsRead = useCallback(() => {
        const allIds = notifications.map(n => n.id);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        // حفظ في localStorage
        const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const newReadNotifications = [...new Set([...readNotifications, ...allIds])];
        localStorage.setItem('read_notifications', JSON.stringify(newReadNotifications));
    }, [notifications]);

    // حذف إشعار
    const removeNotification = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));

        // حفظ في localStorage لعدم إظهاره مجدداً
        const deletedNotifications = JSON.parse(localStorage.getItem('deleted_notifications') || '[]');
        if (!deletedNotifications.includes(notificationId)) {
            deletedNotifications.push(notificationId);
            localStorage.setItem('deleted_notifications', JSON.stringify(deletedNotifications));
        }
    }, []);

    // تجميع الإشعارات حسب اليوم
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        notifications.forEach(notification => {
            const date = new Date(notification.timestamp);
            let key: string;

            if (date.toDateString() === today.toDateString()) {
                key = 'اليوم';
            } else if (date.toDateString() === yesterday.toDateString()) {
                key = 'أمس';
            } else {
                key = date.toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' });
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(notification);
        });

        return groups;
    }, [notifications]);

    // آخر إشعار
    const latestNotification = useMemo(() => notifications[0] || null, [notifications]);

    return {
        notifications,
        groupedNotifications,
        latestNotification,
        stats,
        loading,
        refresh: fetchNotifications,
        markAsRead,
        markAllAsRead,
        removeNotification,
        sourceConfig: SOURCE_CONFIG,
    };
}
