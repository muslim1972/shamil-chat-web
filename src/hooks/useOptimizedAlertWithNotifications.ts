import { useCallback } from 'react';
import { useOptimizedCallAlert } from '../context/OptimizedCallAlertContext';

/**
 * Hook لربط OptimizedCallAlertContext مع PushNotifications للتطبيق في الخلفية
 * يضيف دعم إرسال Push Notification عندما يكون التطبيق في الخلفية
 */
export function useOptimizedAlertWithNotifications() {
  const {
    showIncomingAlert,
    closeAlert,
    sendAlert,
    setOnAcceptAction,
    alertData,
    isRinging,
    isOutgoing,
    isBusy,
    GlobalCallAlert
  } = useOptimizedCallAlert();

  // إرسال تنبيه مع دعم Push Notification
  const sendAlertWithNotification = useCallback(async (conversationId: string) => {
    try {
      console.log('📱 Sending alert with push notification support');
      
      // إرسال التنبيه الأساسي
      const success = await sendAlert(conversationId);
      
      if (success) {
        // إرسال Push Notification للحالة في الخلفية
        const alertData = {
          conversationId,
          callId: `call-${Date.now()}`,
          timestamp: Date.now()
        };

        // إرسال حدث لتوليد Push Notification
        window.dispatchEvent(new CustomEvent('send-alert-push-notification', {
          detail: {
            title: '📞 طلب محادثة عاجلة',
            body: 'تم إرسال طلب محادثة عاجلة',
            data: {
              type: 'urgent_alert',
              ...alertData
            }
          }
        }));

        console.log('✅ Alert sent with push notification support');
      }

      return success;
    } catch (error) {
      console.error('❌ Error sending alert with notification:', error);
      return false;
    }
  }, [sendAlert]);

  // استقبال تنبيه مع دعم Push Notification
  const showIncomingAlertWithNotification = useCallback((message: any) => {
    try {
      console.log('📱 Processing incoming alert with notification support');
      
      // عرض التنبيه الأساسي
      showIncomingAlert(message);

      // إرسال Push Notification للحالة في الخلفية
      if (message.sender_id && message.content === 'دعوة لمحادثة مستعجلة !!') {
        window.dispatchEvent(new CustomEvent('incoming-alert-push-notification', {
          detail: {
            title: '📞 محادثة عاجلة',
            body: `${message.sender_name || 'مستخدم'} يدعوك لمحادثة مستعجلة`,
            data: {
              type: 'incoming_urgent_alert',
              conversationId: message.conversation_id,
              senderId: message.sender_id,
              senderName: message.sender_name || 'مستخدم',
              callId: message.media_metadata?.call_id,
              messageId: message.id
            }
          }
        }));

        console.log('✅ Incoming alert processed with push notification');
      }
    } catch (error) {
      console.error('❌ Error processing incoming alert with notification:', error);
    }
  }, [showIncomingAlert]);

  return {
    // الوظائف الأساسية
    showIncomingAlert: showIncomingAlertWithNotification,
    closeAlert,
    sendAlert: sendAlertWithNotification,
    setOnAcceptAction,
    alertData,
    isRinging,
    isOutgoing,
    isBusy,
    GlobalCallAlert,
    
    // وظائف إضافية
    showIncomingAlertBasic: showIncomingAlert,
    sendAlertBasic: sendAlert
  };
}