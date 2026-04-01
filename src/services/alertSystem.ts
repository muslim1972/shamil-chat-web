// نظام تنبيه عاجل موحد - بديل عن GlobalCallAlertContext
import { supabase } from './supabase';

// دوال عامة لإدارة التنبيهات العاجلة عبر CustomEvent
export class AlertSystem {
  private static instance: AlertSystem;
  
  public static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  // إرسال تنبيه عبر CustomEvent (للتنبيهات من Push Notifications)
  public sendUrgentAlert(alertData: any): void {
    const event = new CustomEvent('urgent-alert-received', {
      detail: {
        ...alertData,
        timestamp: Date.now(),
        source: 'alert-system'
      }
    });
    
    window.dispatchEvent(event);
    
    console.log('🔔 AlertSystem: Urgent alert sent via CustomEvent:', alertData);
  }

  // إرسال طلب فتح محادثة عبر CustomEvent
  public openConversation(conversationId: string, senderId?: string): void {
    const event = new CustomEvent('open-conversation-from-alert', {
      detail: { conversationId, senderId }
    });
    
    window.dispatchEvent(event);
    
    console.log('🔔 AlertSystem: Opening conversation:', conversationId);
  }
}

// تصدير نسخة مفردة
export const alertSystem = AlertSystem.getInstance();