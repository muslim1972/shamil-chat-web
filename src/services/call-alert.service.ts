import { supabase } from '../services/supabase';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { localNotificationService } from './LocalNotificationService';

// تعريف واجهة البيانات المطلوبة للإشعارات
interface NotificationData {
  type: string;
  alertId: string;
  conversationId: string;
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  message?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

export interface CallAlertData {
  alertId: string;
  conversationId: string;
  from: UserInfo;
  message?: string;
  timestamp: number;
  showAlert?: boolean; // تحديد ما إذا كان يجب عرض التنبيه مباشرة
}

type NotificationAction = {
  actionId: string;
  alertId: string;
  conversationId: string;
};

class CallAlertService {
  private static instance: CallAlertService;
  private activeAlerts: Map<string, CallAlertData> = new Map();
  private alertHandlers: Array<(data: CallAlertData) => void> = [];
  private pushNotificationHandlers: Array<(data: NotificationAction) => void> = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): CallAlertService {
    if (!CallAlertService.instance) {
      CallAlertService.instance = new CallAlertService();
    }
    return CallAlertService.instance;
  }

  private async initialize() {
    try {
      // تسجيل معالج لضغطات الإشعارات
      const unsubscribe = localNotificationService.addNotificationHandler('chat_alert', (data: any) => {
        if (data?.alertId) {
          this.handleNotificationAction({
            notification: {
              extra: data
            },
            actionId: data.action
          });
        }
      });

      // تنظيف عند إلغاء الاشتراك
      return () => unsubscribe();
    } catch (error) {
      console.error('خطأ في تهيئة الإشعارات:', error);
    }
  }

  // الاشتراك في استقبال التنبيهات
  public onCallAlert(handler: (data: CallAlertData) => void) {
    this.alertHandlers.push(handler);
    return () => {
      this.alertHandlers = this.alertHandlers.filter(h => h !== handler);
    };
  }

  // إرسال دعوة دردشة
  public async sendChatInvite(conversationId: string, recipientId: string, message?: string): Promise<string | null> {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user?.id) {
        console.error('User not authenticated');
        return null;
      }

      const alertId = `invite_${Date.now()}`;
      const alertData: CallAlertData = {
        alertId,
        conversationId,
        from: {
          id: user.user.id,
          name: user.user.user_metadata?.full_name || 'مستخدم',
          avatar: user.user.user_metadata?.avatar_url
        },
        message,
        timestamp: Date.now()
      };

      // إرسال الدعوة إلى قاعدة البيانات
      const { error } = await supabase
        .from('chat_invites')
        .insert([
          {
            id: alertId,
            conversation_id: conversationId,
            sender_id: user.user.id,
            recipient_id: recipientId,
            message: message,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // إضافة التنبيه إلى القائمة النشطة
      this.activeAlerts.set(alertId, alertData);
      this.notifyAlertHandlers(alertData);

      return alertId;
    } catch (error) {
      console.error('Error sending chat invite:', error);
      return null;
    }
  }

  // معالجة دعوة واردة
  public async handleIncomingInvite(alertData: CallAlertData) {
    try {
      // التحقق من عدم وجود دعوة نشطة لنفس المحادثة
      const existingAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.conversationId === alertData.conversationId);
      
      if (existingAlert) {
        console.log('تم العثور على دعوة نشطة لنفس المحادثة، سيتم تحديثها');
        this.activeAlerts.delete(existingAlert.alertId);
      }

      // التحقق من عدم وجود دعوة بنفس المعرف
      if (this.activeAlerts.has(alertData.alertId)) {
        console.log('تم استلام دعوة مكررة بنفس المعرف');
        return;
      }

      // حفظ الدعوة
      this.activeAlerts.set(alertData.alertId, alertData);
      console.log('تم حفظ الدعوة الجديدة:', alertData.alertId);

      // إخطار المشتركين بالدعوة الجديدة
      this.notifyAlertHandlers(alertData);

      // التحقق من حالة التطبيق
      const appState = await App.getState();
      console.log('حالة التطبيق:', appState);

      // إذا كان التطبيق في الخلفية أو مغلق
      if (!appState.isActive) {
        console.log('إظهار إشعار محلي لأن التطبيق في الخلفية');
        await this.showLocalNotification(alertData);
      } else {
        console.log('التطبيق في الواجهة، سيتم عرض التنبيه مباشرة');
        // بدء الرنين إذا كان التطبيق مفتوح
        this.notifyAlertHandlers({
          ...alertData,
          showAlert: true
        });
      }
    } catch (error) {
      console.error('خطأ في معالجة الدعوة الواردة:', error);
    }
  }

  // قبول الدعوة
  public async acceptInvite(alertId: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) return false;

      // تحديث حالة الدعوة إلى مقبولة
      const { error } = await supabase
        .from('chat_invites')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      // فتح المحادثة
      window.location.href = `/chat/${alert.conversationId}`;

      // إغلاق التنبيه
      this.activeAlerts.delete(alertId);
      return true;
    } catch (error) {
      console.error('Error accepting invite:', error);
      return false;
    }
  }

  // رفض الدعوة
  public async declineInvite(alertId: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) return false;

      // تحديث حالة الدعوة إلى مرفوضة
      const { error } = await supabase
        .from('chat_invites')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      // إغلاق التنبيه
      this.activeAlerts.delete(alertId);
      return true;
    } catch (error) {
      console.error('Error declining invite:', error);
      return false;
    }
  }

  // إلغاء الدعوة
  public async cancelInvite(alertId: string): Promise<boolean> {
    if (!this.activeAlerts.has(alertId)) return false;

    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) return false;

      // تحديث حالة الدعوة إلى ملغاة
      const { error } = await supabase
        .from('chat_invites')
        .update({ 
          status: 'cancelled',
          responded_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      // إرسال إشعار للمستلم
      await this.sendPushNotification({
        to: alert.from.id,
        title: 'تم إلغاء الدعوة',
        body: `تم إلغاء دعوة الدردشة من ${alert.from.name}`,
        data: {
          type: 'invite_cancelled',
          alertId,
          conversationId: alert.conversationId
        }
      });

      // إغلاق التنبيه
      this.activeAlerts.delete(alertId);
      return true;
    } catch (error) {
      console.error('Error cancelling invite:', error);
      return false;
    }
  }

  // إظهار إشعار محلي
  private async showLocalNotification(alertData: CallAlertData) {
    try {
      const notificationId = alertData.alertId.replace(/\D/g, '').slice(-9) || '1';
      const notificationTitle = 'دعوة دردشة جديدة';
      const notificationBody = `دعوة دردشة من ${alertData.from.name}`;
      
      // إرسال الإشعار المحلي
      await localNotificationService.showChatAlert({
        id: notificationId,
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: 'chat_alert',
          alertId: alertData.alertId,
          conversationId: alertData.conversationId,
          from: alertData.from,
          message: alertData.message,
          timestamp: Date.now()
        }
      });

      // إضافة معالج للأزرار
      const unsubscribe = localNotificationService.addNotificationHandler('chat_alert', (data: any) => {
        if (data.alertId === alertData.alertId) {
          if (data.action === 'accept') {
            this.acceptInvite(alertData.alertId);
          } else if (data.action === 'decline') {
            this.declineInvite(alertData.alertId);
          }
          unsubscribe(); // إلغاء الاشتراك بعد معالجة الإجراء
        }
      });
      
      // إلغاء الإشعار بعد 30 ثانية إذا لم يتم الرد
      setTimeout(() => {
        localNotificationService.cancelNotification(notificationId);
        unsubscribe();
      }, 30000);
      
    } catch (error) {
      console.error('خطأ في عرض الإشعار المحلي:', error);
    }
  }

  // معالجة إجراءات الإشعارات
  private handleNotificationAction(notification: any) {
    try {
      const extra = notification.notification?.extra || notification;
      const { alertId, conversationId, actionId } = extra;
      
      if (!alertId) {
        console.warn('لا يوجد معرف تنبيه في بيانات الإشعار');
        return;
      }

      // إرسال الحدث لجميع المشتركين
      this.pushNotificationHandlers.forEach(handler => {
        try {
          handler({
            actionId: actionId || 'default',
            alertId,
            conversationId
          });
        } catch (error) {
          console.error('خطأ في معالج الإشعار:', error);
        }
      });

      // إذا كان الإجراء هو قبول أو رفض، قم بإغلاق الإشعار
      if (actionId === 'accept' || actionId === 'decline') {
        const notificationId = alertId.replace(/\D/g, '').slice(-9) || '1';
        localNotificationService.cancelNotification(notificationId);
      }
    } catch (error) {
      console.error('خطأ في معالجة إجراء الإشعار:', error);
    }
  }

  // إرسال إشعار دفعي
  private async sendPushNotification(notification: {
    to: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    try {
      // إرسال الإشعار عبر FCM
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: notification.to,
          title: notification.title,
          body: notification.body,
          data: notification.data
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // محاولة إرسال إشعار محلي كبديل
      try {
        await (LocalNotifications as any).schedule({
          notifications: [{
            title: notification.title,
            body: notification.body,
            id: Math.floor(Math.random() * 10000),
            extra: notification.data,
            channelId: 'chat_invites',
            smallIcon: 'ic_notification',
            iconColor: '#4CAF50'
          }]
        });
      } catch (localError) {
        console.error('Error showing local notification as fallback:', localError);
      }
      
      return null;
    }
  }

  // إخطار جميع المشتركين بتحديث الحالة
  private notifyAlertHandlers(data: CallAlertData) {
    for (const handler of this.alertHandlers) {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in alert handler:', error);
      }
    }
  }

  // التحقق من وجود تنبيه نشط لمحادثة معينة
  public hasActiveAlert(conversationId: string): boolean {
    return Array.from(this.activeAlerts.values()).some(
      alert => alert.conversationId === conversationId
    );
  }

  // الحصول على جميع التنبيهات النشطة
  public getActiveAlerts(): CallAlertData[] {
    return Array.from(this.activeAlerts.values());
  }

  // مسح جميع التنبيهات
  public clearAllAlerts() {
    this.activeAlerts.clear();
  }
}

export const callAlertService = CallAlertService.getInstance();
