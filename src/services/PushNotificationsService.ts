import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { summarizeForNotification } from '../utils/messagePreview';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '../firebaseConfig';

// 🛑 رسالة تشخيصية للتأكد من تحميل الملف
if (typeof window !== 'undefined') {
  console.log('PushNotificationsService.ts is being loaded...');
  alert('PushNotificationsService Script Loaded'); 
}

// دعم Web Push Protocol API
const publicVapidKey = import.meta.env.VITE_PUBLIC_VAPID_KEY;

/**
 * خدمة إدارة الإشعارات باستخدام Capacitor Push Notifications
 * تدير تسجيل الأجهزة، طلب الأذونات، والتعامل مع الإشعارات
 */
export class PushNotificationsService {
  private static instance: PushNotificationsService;
  private isInitialized = false;
  private registrationToken: string | null = null;

  /**
   * الحصول على نسخة مفردة من الخدمة (Singleton)
   */
  public static getInstance(): PushNotificationsService {
    if (!PushNotificationsService.instance) {
      PushNotificationsService.instance = new PushNotificationsService();
    }
    return PushNotificationsService.instance;
  }

  /**
   * تهيئة خدمة الإشعارات
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      if (import.meta.env.DEV) console.log('PushNotificationsService is already initialized');
      return;
    }

    try {
      alert('Inside initialize()... checking platform');

      let platform = 'web';
      try {
        platform = Capacitor.getPlatform();
      } catch (e) {
        console.warn('Capacitor not available, defaulting to web');
      }
      
      alert('Platform detected: ' + platform);

      const origin = typeof location !== 'undefined' ? location.origin : '';
      const isNativeLike = (platform !== 'web') || (origin === 'https://localhost');

      if (!isNativeLike) {
        alert('Decided: WEB PATH. Calling initializeWebPushNotifications()...');
        await this.initializeWebPushNotifications();
        this.isInitialized = true;
        return;
      }

      alert('Decided: NATIVE PATH.');
      
      // التحقق من توفر مكتبة الإشعارات
      if (!PushNotifications || typeof PushNotifications.addListener !== 'function') {
        console.warn('PushNotifications plugin is not available');
        this.isInitialized = true;
        return;
      }

      await this.registerListeners();
      await this.requestPermissionsAndRegister();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PushNotificationsService:', error);
      alert('🚨 Main initialize error: ' + (error as any).message);
    }
  }

  /**
   * تسجيل مستمعي الأحداث للإشعارات مع دعم التنبيهات العاجلة
   */
  private async registerListeners(): Promise<void> {
    try {
      if (!PushNotifications || typeof PushNotifications.addListener !== 'function') {
        console.warn('PushNotifications plugin is not available for registering listeners');
        return;
      }

      // 1. مستمع استلام الإشعارات (التعديل الجوهري هنا)
      try {
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          try {
            if (import.meta.env.DEV) console.log('🔔 Push notification received in React:', notification);

            // [التعديل الحاسم]: التحقق من التنبيه العاجل وتجاهله محلياً
            // Use summarizer to create a concise body when possible
            try {
              const dataForSummary = notification.notification?.data || notification.data || notification;
              const summarized = summarizeForNotification(dataForSummary);
              if (summarized && notification.notification) {
                // attach summarized body for in-app handling/logging
                notification.notification.body = summarized;
              }
            } catch (e) {
              // ignore summarizer errors
            }

            const isAlert = this.isUrgentAlertNotification(notification);

            if (isAlert) {
              // إذا كنا على الموبايل (Native)، نتجاهل الإشعار تماماً
              // لأن الخدمة الخلفية (Java Service) استلمت الـ Data وستقوم بفتح الشاشة
              if (Capacitor.isNativePlatform()) {
                console.log('⛔ IGNORED Local Notification for Urgent Alert (Handled by Native Service)');
                return; // نخرج من الدالة ولا نعرض شيئاً
              }

              // أما إذا كان ويب، فنكمل المعالجة (اختياري)
              if (import.meta.env.DEV) console.log('Received urgent alert notification (Web/Dev)');
              this.handleUrgentAlertNotification(notification);
            } else {
              // إذا لم يكن عاجلاً (رسالة عادية)، اتركه يعمل كما هو
              console.log('✅ Processing normal notification locally');
            }

          } catch (error) {
            console.error('Error handling push notification received:', error);
          }
        });
      } catch (error) {
        console.error('Failed to register pushNotificationReceived listener:', error);
      }

      // 2. مستمع النقر على الإشعارات
      try {
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          try {
            if (import.meta.env.DEV) console.log('Push notification action performed:', notification);

            const isAlert = this.isUrgentAlertNotification(notification);
            if (isAlert) {
              if (import.meta.env.DEV) console.log('Urgent alert notification action performed');
              this.handleUrgentAlertAction(notification);
            } else {
              // التعامل مع النقر العادي (فتح المحادثة)
              const data = notification.notification.data;
              if (data && data.conversationId) {
                this.openConversationFromAlert(data.conversationId);
              }
            }
          } catch (error) {
            console.error('Error handling push notification action performed:', error);
          }
        });
      } catch (error) {
        console.error('Failed to register pushNotificationActionPerformed listener:', error);
      }

      // 3. مستمع تسجيل الجهاز
      try {
        await PushNotifications.addListener('registration', (token) => {
          try {
            if (import.meta.env.DEV) console.log('Device registration token:', token.value);
            this.registrationToken = token.value;
            this.saveTokenToDatabase(token.value);
          } catch (error) {
            console.error('Error handling registration:', error);
          }
        });
      } catch (error) {
        console.error('Failed to register registration listener:', error);
      }

      // 4. مستمع أخطاء التسجيل
      try {
        await PushNotifications.addListener('registrationError', (error) => {
          try {
            console.error('Registration error:', error);
          } catch (err) {
            console.error('Error handling registration error:', err);
          }
        });
      } catch (error) {
        console.error('Failed to register registrationError listener:', error);
      }
    } catch (error) {
      console.error('Error registering push notification listeners:', error);
    }
  }

  /**
   * طلب أذونات الإشعارات وتسجيل الجهاز
   */
  private async requestPermissionsAndRegister(): Promise<void> {
    try {
      if (!PushNotifications || typeof PushNotifications.requestPermissions !== 'function') {
        console.warn('PushNotifications plugin is not available for requesting permissions');
        return;
      }

      try {
        const permissionStatus = await PushNotifications.requestPermissions();

        if (permissionStatus.receive === 'granted') {
          console.log('Push notification permission granted');

          try {
            if (typeof PushNotifications.register === 'function') {
              await PushNotifications.register();
            } else {
              console.warn('PushNotifications.register is not available');
            }
          } catch (registerError) {
            console.error('Error registering device for push notifications:', registerError);
          }
        } else {
          console.warn('Push notification permission denied');
        }
      } catch (permissionError) {
        console.error('Error requesting push notification permissions:', permissionError);
      }
    } catch (error) {
      console.error('Error in requestPermissionsAndRegister:', error);
    }
  }

  /**
   * حفظ رمز التسجيل في قاعدة البيانات
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        if (import.meta.env.DEV) console.log('Cannot save push token on web platform');
        return;
      }

      const deviceInfo = await Device.getInfo();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('User not authenticated, cannot save push token');
        return;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: {
              token,
              platform: deviceInfo.platform,
              model: deviceInfo.model
            },
            endpoint: token,
            app_name: 'shamil_chat_pwa' // تمييز التطبيق الجديد
          },
          {
            onConflict: 'endpoint'
          }
        );

      if (error) {
        console.error('Error saving push token to database:', error);
      } else {
        if (import.meta.env.DEV) console.log('Push token saved to database successfully');
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  }

  /**
   * تهيئة إشعارات الويب
   */
  private async initializeWebPushNotifications(): Promise<void> {
    try {
      // تفعيل دائم لإشعارات الويب في الـ PWA
      if (typeof location !== 'undefined') {
          console.log('Initializing web push on:', location.hostname);
      }

      const originIsCapLocalhost = typeof location !== 'undefined' && location.origin === 'https://localhost';
      if (originIsCapLocalhost) {
        if (import.meta.env.DEV) console.log('Skipping web push init on Capacitor WebView');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications are not supported in this browser');
        return;
      }

      try {
        if (!publicVapidKey) {
          console.error('VAPID public key is not defined. Cannot subscribe to push notifications.');
          return;
        }

        // 1. تسجيل ملف firebase-messaging-sw.js المخصص
        alert('Step 1: Registering Service Worker...');
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // الانتظار حتى يصبح الجاهز
        alert('Step 2: Waiting for Service Worker to be ready...');
        const registration = await navigator.serviceWorker.ready;
        alert('Step 3: Service Worker is ready!');

        // 2. طلب الإذن
        alert('Step 4: Requesting Permission...');
        const permission = await Notification.requestPermission();
        alert('Step 5: Permission status is ' + permission);

        if (permission !== 'granted') {
          alert('⚠️ إذن الإشعارات مطلوب لتلقي التنبيهات. يرجى تفعيله.');
          return;
        }

        // الحصول على رمز FCM للويب
        const messaging = getMessaging(app);
        
        try {
          alert('Step 6: Requesting FCM Token from Firebase...');
          const fcmToken = await getToken(messaging, {
            vapidKey: publicVapidKey,
            serviceWorkerRegistration: registration
          });

          if (fcmToken) {
            alert('Step 7: FCM Token received! Saving to DB...');
            await this.saveTokenToDatabaseForWeb(fcmToken);
            alert('✅ مبروك! تم ربط جهازك بنظام الإشعارات بنجاح.');
          } else {
            alert('❌ حصلنا على استجابة فارغة (No Token)');
          }
        } catch (tokenError) {
          alert('🚨 فشل Firebase في الخطوة 6: ' + (tokenError as any).message);
        }
      } catch (error) {
        console.error('Error initializing web push notifications:', error);
      }
    } catch (error) {
      console.error('Error in initializeWebPushNotifications:', error);
    }
  }

  /**
   * تحويل مفتاح VAPID من Base64 URL-safe إلى Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * حفظ رمز إشعارات الويب في قاعدة البيانات
   */
  private async saveTokenToDatabaseForWeb(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('User not authenticated, cannot save push token');
        return;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            subscription: {
              token,
              platform: 'web',
              app: 'shamil_chat_pwa'
            },
            endpoint: token,
            app_name: 'shamil_chat_pwa',
          },
          {
            onConflict: 'endpoint',
          }
        );

      if (error) {
        console.error('Error saving web push token to database:', error);
      } else {
        if (import.meta.env.DEV) console.log('Web push token saved successfully');
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabaseForWeb:', error);
    }
  }

  /**
   * حذف اشتراك الجهاز من قاعدة البيانات
   */
  public async unregisterDevice(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        if (import.meta.env.DEV) console.log('Cannot unregister device on web platform');
        return;
      }

      if (!this.registrationToken) {
        console.warn('No registration token found, cannot unregister');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('User not authenticated, cannot unregister device');
        return;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', this.registrationToken);

      if (error) {
        console.error('Error unregistering device:', error);
      } else {
        if (import.meta.env.DEV) console.log('Device unregistered successfully');
        this.registrationToken = null;
      }
    } catch (error) {
      console.error('Error in unregisterDevice:', error);
    }
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  public getRegistrationToken(): string | null {
    return this.registrationToken;
  }

  // ==== التنبيهات العاجلة (Urgent Alerts) ====

  /**
   * التحقق من أن الإشعار هو تنبيه عاجل
   */
  private isUrgentAlertNotification(notification: any): boolean {
    try {
      const data = notification.data || notification.notification?.data;
      if (data && (data.isAlert === true || data.isAlert === 'true' || data.type === 'urgent_alert')) {
        return true;
      }

      const title = notification.title || notification.notification?.title;
      const body = notification.body || notification.notification?.body;

      if (title && (title.includes('تنبيه عاجل') || title.includes('محادثة مستعجلة') || title.includes('مكالمة'))) {
        return true;
      }

      if (body && (body.includes('محادثة مستعجلة') || body.includes('طلب محادثة عاجلة'))) {
        return true;
      }

      const tag = notification.tag;
      if (tag === 'urgent-alert') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking if notification is urgent alert:', error);
      return false;
    }
  }

  private handleUrgentAlertNotification(notification: any): void {
    try {
      if (import.meta.env.DEV) console.log('🔔 Processing urgent alert notification (Stage 2):', notification);
      const data = notification.data || notification.notification?.data;
      this.sendUrgentAlertToSystem(data || notification);
    } catch (error) {
      console.error('Error handling urgent alert notification:', error);
    }
  }

  private handleUrgentAlertAction(notification: any): void {
    try {
      if (import.meta.env.DEV) console.log('Processing urgent alert action:', notification);
      const data = notification.data || notification.notification?.data;

      if (data && data.conversationId) {
        this.openConversationFromAlert(data.conversationId, data.senderId);
      } else {
        this.openConversationsList();
      }
    } catch (error) {
      console.error('Error handling urgent alert action:', error);
    }
  }

  private sendUrgentAlertToSystem(alertData: any): void {
    try {
      const event = new CustomEvent('urgent-alert-received', {
        detail: {
          ...alertData,
          timestamp: Date.now(),
          source: 'push-notification'
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error sending urgent alert to system:', error);
    }
  }

  private openConversationFromAlert(conversationId: string, senderId?: string): void {
    try {
      if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
        if (import.meta.env.DEV) console.warn('⚠️ openConversationFromAlert: Invalid conversationId, skipping dispatch');
        return;
      }

      const event = new CustomEvent('open-conversation-from-alert', {
        detail: { conversationId, senderId }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error opening conversation from alert:', error);
    }
  }

  private openConversationsList(): void {
    try {
      const event = new CustomEvent('open-conversations-list');
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error opening conversations list:', error);
    }
  }

  /**
   * إرسال FCM حقيقي للتنبيهات العاجلة
   */
  public async sendUrgentFCMToDevice(deviceToken: string, senderData: any, messageData: any): Promise<boolean> {
    try {
      if (import.meta.env.DEV) console.log('📱 Sending real FCM to device:', deviceToken);

      const fcmData = {
        title: '📞 ' + (senderData?.username || 'مكالمة عاجلة'),
        body: 'يدعوك لمحادثة مستعجلة - انقر للرد',
        sound: 'default',
        priority: 'high',
        tag: 'urgent_alert',
        data: {
          type: 'urgent_alert',
          conversationId: messageData.conversation_id,
          senderId: messageData.sender_id,
          senderName: senderData?.username || 'مستخدم',
          isUrgentAlert: true,
          ...messageData.media_metadata
        },
        actions: [
          { action: 'open_chat', title: 'فتح المحادثة', icon: 'chat' },
          { action: 'decline', title: 'تجاهل', icon: 'close' }
        ]
      };

      const { error } = await supabase.functions.invoke('send-urgent-alert-fcm', {
        body: {
          device_token: deviceToken,
          notification_data: fcmData
        }
      });

      if (error) {
        console.error('❌ FCM sending error:', error);
        return false;
      }

      if (import.meta.env.DEV) console.log('✅ FCM sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Error sending FCM:', error);
      return false;
    }
  }

  /**
   * إرسال FCM لجميع المستخدمين في المحادثة
   */
  public async sendFCMToConversationMembers(conversationId: string, messageData: any): Promise<void> {
    try {
      if (import.meta.env.DEV) console.log('📱 Sending FCM to conversation members:', conversationId);

      const { data: senderData } = await supabase
        .from('users')
        .select('username')
        .eq('id', messageData.sender_id)
        .single();

      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', messageData.sender_id);

      if (members && members.length > 0) {
        const { data: tokens } = await supabase
          .from('push_subscriptions')
          .select('subscription, endpoint')
          .in('user_id', members.map(m => m.user_id));

        if (tokens) {
          for (const tokenData of tokens) {
            const sub: any = tokenData.subscription;
            let deviceToken: string | null = null;

            if (typeof sub === 'string') {
              deviceToken = sub;
            }
            else if (sub && typeof sub === 'object' && typeof sub.token === 'string') {
              deviceToken = sub.token;
            }
            else if (typeof tokenData.endpoint === 'string') {
              deviceToken = tokenData.endpoint;
            }

            if (deviceToken) {
              await this.sendUrgentFCMToDevice(deviceToken, senderData, messageData);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error sending FCM to conversation members:', error);
    }
  }
}

export const pushNotificationsService = PushNotificationsService.getInstance();