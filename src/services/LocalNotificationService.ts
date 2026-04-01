import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

export class LocalNotificationService {
  private static instance: LocalNotificationService;
  private notificationHandlers: Map<string, (data: any) => void> = new Map();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): LocalNotificationService {
    if (!LocalNotificationService.instance) {
      LocalNotificationService.instance = new LocalNotificationService();
    }
    return LocalNotificationService.instance;
  }

  private async initialize() {
    try {
      // طلب الأذونات
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        // إنشاء قناة إشعارات (لأندرويد)
        await LocalNotifications.createChannel({
          id: 'chat_alert_channel',
          name: 'تنبيهات الدردشة',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'chat_invite.mp3',
          lights: true,
          lightColor: '#FF5722'
        });

        // إعداد مستمع لأحداث الإشعارات
        this.setupNotificationListeners();
      }
    } catch (error) {
      console.error('خطأ في تهيئة الإشعارات المحلية:', error);
    }
  }

  private setupNotificationListeners() {
    // معالجة الضغط على الإشعار عند فتح التطبيق
    LocalNotifications.addListener('localNotificationActionPerformed', (notification: any) => {
      const { actionId, notification: { data } } = notification;
      
      if (data?.type === 'chat_alert') {
        const handler = this.notificationHandlers.get('chat_alert');
        if (handler) {
          handler(data);
        }
      }
    });
  }

  // إظهار إشعار الدردشة
  public async showChatAlert(alertData: {
    id: string;
    title: string;
    body: string;
    data: any;
  }) {
    try {
      const appState = await App.getState();
      
      // إذا كان التطبيق في الخلفية أو مغلق
      if (!appState.isActive) {
        await LocalNotifications.schedule({
          notifications: [{
            id: parseInt(alertData.id) || 1,
            title: alertData.title,
            body: alertData.body,
            channelId: 'chat_alert_channel',
            smallIcon: 'ic_notification',
            iconColor: '#4CAF50',
            extra: {
              ...alertData.data,
              type: 'chat_alert'
            },
            // إعدادات خاصة بالإشعار
            autoCancel: false,
            wakeup: true,
            priority: 1,
            // إعدادات الصوت
            sound: 'chat_invite.mp3',
            // إعدادات الاهتزاز
            vibrate: true,
            vibration: [1000, 1000, 1000, 1000, 1000],
            // إعدادات الإضاءة
            lights: [255, 87, 34, 300],
            // إعدادات الإشعار المستمر (Heads-up)
            ongoing: true,
            group: 'chat_alerts',
            groupSummary: true,
            // إعدادات الإشعارات الكاملة
            fullScreenIntent: true,
            visibility: 1,
            // أزرار الإجراءات
            actions: [
              { id: 'accept', title: 'قبول' },
              { id: 'decline', title: 'رفض' }
            ]
          } as any]
        });
      }
    } catch (error) {
      console.error('خطأ في عرض إشعار الدردشة:', error);
    }
  }

  // إلغاء إشعار
  public async cancelNotification(notificationId: string) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: parseInt(notificationId) }]
      });
    } catch (error) {
      console.error('خطأ في إلغاء الإشعار:', error);
    }
  }

  // إضافة معالج لأحداث الإشعارات
  public addNotificationHandler(type: string, handler: (data: any) => void) {
    this.notificationHandlers.set(type, handler);
    return () => this.notificationHandlers.delete(type);
  }
}

export const localNotificationService = LocalNotificationService.getInstance();
