import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedCallAlert } from '../context/OptimizedCallAlertContext';

/**
 * Hook متقدم لإدارة نظام إيقاظ الشاشة (المرحلة 3)
 * يتكامل مع Android Fullscreen Alert و Edge Functions
 */
export function useFullscreenAlert() {
  const navigate = useNavigate();
  const { showIncomingAlert, setOnAcceptAction } = useOptimizedCallAlert();

  // تفعيل التنبيه العاجل مع إيقاظ الشاشة
  const triggerUrgentWakeupAlert = useCallback((alertData: any) => {
    try {
      console.log('🎯 Triggering urgent wakeup alert:', alertData);

      // 1. إرسال لAndroid Fullscreen Alert
      if (window.Android && window.Android.showFullscreenAlert) {
        window.Android.showFullscreenAlert({
          sender_name: alertData.from?.name || 'مجهول',
          call_id: alertData.callId,
          conversation_id: alertData.conversationId,
          sender_id: alertData.from?.id
        });
      }

      // 2. إرسال للنظام العام (fallback)
      const event = new CustomEvent('urgent-alert-received', {
        detail: {
          ...alertData,
          timestamp: Date.now(),
          source: 'fullscreen-wakeup',
          type: 'wakeup'
        }
      });
      
      window.dispatchEvent(event);

      // 3. عرض التنبيه في React أيضاً (طبقة إضافية)
      setTimeout(() => {
        showIncomingAlert({
          sender_id: alertData.from?.id,
          conversation_id: alertData.conversationId,
          content: 'دعوة لمحادثة مستعجلة !!',
          message_type: 'alert',
          media_metadata: {
            is_alert: true,
            call_id: alertData.callId,
            type: 'alert',
            source: 'fullscreen-wakeup'
          }
        });
      }, 1000);

      console.log('✅ Urgent wakeup alert triggered successfully');
      
    } catch (error) {
      console.error('❌ Error triggering urgent wakeup alert:', error);
    }
  }, [showIncomingAlert]);

  // استقبال استجابة من Fullscreen Alert
  const handleFullscreenAlertResponse = useCallback((response: any) => {
    try {
      console.log('📱 Fullscreen alert response received:', response);

      const { conversationId, accepted } = response;

      if (accepted && conversationId) {
        // فتح المحادثة فوراً
        navigate(`/chat/${conversationId}`);
        
        // إرسال حدث للنظام
        window.dispatchEvent(new CustomEvent('conversation-opened-from-alert', {
          detail: { conversationId, source: 'fullscreen-wakeup' }
        }));
      }

      // إرسال للنظام العام
      const event = new CustomEvent('fullscreen-alert-response', {
        detail: response
      });
      window.dispatchEvent(event);

      console.log('✅ Fullscreen alert response handled');
      
    } catch (error) {
      console.error('❌ Error handling fullscreen alert response:', error);
    }
  }, [navigate]);

  // إعداد التفاعل مع أزرار التنبيه
  const setupAlertInteraction = useCallback(() => {
    // دالة الموافقة على التنبيه
    const onAcceptAlert = (conversationId: string) => {
      console.log('💬 Accepting alert - opening conversation:', conversationId);
      navigate(`/chat/${conversationId}`);
    };

    // تسجيل الدالة
    setOnAcceptAction(onAcceptAlert);

    // إعداد JavaScript bridge لـ Android
    if (window.Android) {
      window.Android.onCallResponse = (data: any) => {
        handleFullscreenAlertResponse(data);
      };
    }

    // إعداد JavaScript bridge العام
    if (window.ShamilApp) {
      window.ShamilApp.callAlertResponse = (data: any) => {
        handleFullscreenAlertResponse(data);
      };
    }

    console.log('🔗 Fullscreen alert interaction setup completed');
  }, [navigate, setOnAcceptAction, handleFullscreenAlertResponse]);

  // تهيئة النظام عند بدء التشغيل
  useEffect(() => {
    setupAlertInteraction();

    // تنظيف الموارد عند إلغاء التعيين
    return () => {
      if (window.Android) {
        window.Android.onCallResponse = null as any;
      }
      if (window.ShamilApp) {
        window.ShamilApp.callAlertResponse = undefined;
      }
    };
  }, [setupAlertInteraction]);

  // طلب أذونات Wake Lock
  const requestWakeLockPermissions = useCallback(async () => {
    try {
      if (window.Android && window.Android.requestWakeLockPermissions) {
        await window.Android.requestWakeLockPermissions();
        console.log('✅ Wake Lock permissions requested');
      } else {
        console.log('ℹ️ Android Wake Lock not available');
      }
    } catch (error) {
      console.error('❌ Error requesting Wake Lock permissions:', error);
    }
  }, []);

  // فحص دعم Fullscreen Alert
  const isFullscreenAlertSupported = useCallback(() => {
    return !!(window.Android && window.Android.showFullscreenAlert);
  }, []);

  // فحص دعم Wake Lock
  const isWakeLockSupported = useCallback(() => {
    return !!(navigator && 'wakeLock' in navigator);
  }, []);

  return {
    // الدوال الأساسية
    triggerUrgentWakeupAlert,
    handleFullscreenAlertResponse,
    setupAlertInteraction,
    
    // أذونات وفحص الدعم
    requestWakeLockPermissions,
    isFullscreenAlertSupported,
    isWakeLockSupported,
    
    // الإحصائيات والمعلومات
    getAlertStatistics: () => ({
      isFullscreenSupported: isFullscreenAlertSupported(),
      isWakeLockSupported: isWakeLockSupported(),
      platform: navigator.platform || 'unknown'
    })
  };
}