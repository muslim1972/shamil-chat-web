import { useCallback, useEffect } from 'react';

/**
 * Hook لإدارة Push Notifications التفاعلية
 * يربط OptimizedCallAlertContext مع PushNotificationsService
 */
export function useInteractiveNotifications() {
  
  // إرسال إشعار Push تفاعلي عند التنبيه
  const sendInteractivePushAlert = useCallback(async (alertData: {
    conversationId: string;
    senderId: string;
    senderName: string;
    callId: string;
  }) => {
    try {
      console.log('📱 Sending interactive push notification:', alertData);
      
      // إنشاء بيانات الإشعار التفاعلي
      const notificationData = {
        title: `📞 ${alertData.senderName}`,
        body: 'دعوة لمحادثة مستعجلة - انقر للرد',
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'urgent-alert',
        requireInteraction: true, // يتطلب تفاعل المستخدم
        data: {
          conversationId: alertData.conversationId,
          senderId: alertData.senderId,
          callId: alertData.callId,
          isAlert: true,
          action: 'open_chat'
        },
        actions: [
          {
            action: 'open_chat',
            title: 'فتح المحادثة',
            icon: '/icons/chat.png'
          },
          {
            action: 'dismiss',
            title: 'تجاهل',
            icon: '/icons/close.png'
          }
        ]
      };

      // إرسال الإشعار عبر Custom Event
      window.dispatchEvent(new CustomEvent('send-push-notification', {
        detail: notificationData
      }));

      console.log('✅ Interactive push notification sent');
      
    } catch (error) {
      console.error('❌ Error sending interactive push notification:', error);
    }
  }, []);

  // استقبال تفاعل المستخدم مع الإشعار
  const handleNotificationAction = useCallback((action: string, data: any) => {
    try {
      console.log('🔄 Notification action received:', action, data);
      
      if (action === 'open_chat' && data.conversationId) {
        // إرسال حدث لفتح المحادثة
        window.dispatchEvent(new CustomEvent('open-chat-from-notification', {
          detail: {
            conversationId: data.conversationId,
            from: data.senderId
          }
        }));
        
        console.log('✅ Chat opening requested');
        
      } else if (action === 'dismiss') {
        console.log('📱 Notification dismissed');
      }
      
    } catch (error) {
      console.error('❌ Error handling notification action:', error);
    }
  }, []);

  // إعداد مستمعي الأحداث
  useEffect(() => {
    // استقبال طلبات إرسال الإشعارات
    const handleSendPushNotification = (event: CustomEvent) => {
      console.log('📱 Push notification request received:', event.detail);
      // هنا يمكن ربطه بـ PushNotificationsService
    };

    window.addEventListener('send-push-notification', handleSendPushNotification as EventListener);

    return () => {
      window.removeEventListener('send-push-notification', handleSendPushNotification as EventListener);
    };
  }, []);

  return {
    sendInteractivePushAlert,
    handleNotificationAction
  };
}