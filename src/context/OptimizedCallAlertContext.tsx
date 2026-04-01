import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { getUserData } from '../services/UserDataCache';
import CallAlertUI from '../components/call/CallAlert';
import { Capacitor } from '@capacitor/core';
import { globalAudioManager } from '../services/GlobalAudioManager';
import { RingbackToneGenerator } from '../services/RingbackToneGenerator';

export interface CallAlertData {
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  conversationId: string;
  callId: string;
}

interface OptimizedCallAlertContextType {
  showIncomingAlert: (message: any) => void;
  closeAlert: () => void;
  sendAlert: (conversationId: string) => Promise<boolean>;
  alertData: CallAlertData | null;
  isRinging: boolean;
  isOutgoing: boolean;
  isBusy: boolean; // 🔧 State Machine status
  setOnAcceptAction: (action: (conversationId: string) => void) => void;
  GlobalCallAlert: React.FC<{ onAccept?: () => void; onDecline?: () => void }>;
}

const OptimizedCallAlertContext = createContext<OptimizedCallAlertContextType | undefined>(undefined);

export function OptimizedCallAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertData, setAlertData] = useState<CallAlertData | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isOutgoing, setIsOutgoing] = useState(false);
  const [targetConversationId, setTargetConversationId] = useState<string | null>(null);
  const [onAcceptAction, setOnAcceptAction] = useState<((conversationId: string) => void) | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isBusy, setIsBusy] = useState(false); // 🔧 State Machine: مشغول/متاح
  const { user } = useAuth();

  // تتبع جميع الأصوات النشطة
  const activeAudiosRef = useRef<Set<HTMLAudioElement>>(new Set());

  // Process Management
  const processRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // ✅ Guard لمنع التهيئة المتكررة
  const initializedForUserRef = useRef<string | null>(null);


  // ✅ Ref for showIncomingAlert to break circular dependency
  const showIncomingAlertRef = useRef<((message: any) => void) | null>(null);

  // ==== CORE FUNCTIONS =====

  // 🔧 دالة clearance للعداد
  const clearAlertTimeout = useCallback(() => {
    if (processRef.current) {
      clearTimeout(processRef.current);
      processRef.current = null;
      console.log('⏰ Cleared alert timeout');
    }
  }, []);

  // ==== FUNCTIONS DEFINITIONS =====


  // إعادة تعيين الحالة
  const resetState = useCallback(() => {
    console.log('🔔 Resetting alert state');
    setIsRinging(false);
    setAlertData(null);
    setIsOutgoing(false);
    setTargetConversationId(null);

    // ✅ إيقاف تشغيل الصوت العام (مهم جداً لإلغاء التنبيه)
    globalAudioManager.stopAllAudio();

    // 🔧 إيقاف جميع الأصوات النشطة
    const activeAudioArray = Array.from(activeAudiosRef.current);
    let audioIndex = 1;
    activeAudioArray.forEach((activeAudio) => {
      try {
        if (activeAudio) {
          // ✅ إيقاف RingbackToneGenerator إذا كان موجوداً
          if ((activeAudio as any)._ringbackGenerator) {
            (activeAudio as any)._ringbackGenerator.stop();
            console.log('📞 Ringback tone stopped');
          }
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.src = '';
        }
        audioIndex++;
      } catch (error) {
        console.warn(`Error stopping audio #${audioIndex}:`, error);
        audioIndex++;
      }
    });

    activeAudiosRef.current.clear();

    // 🔧 إيقاف الصوت الرئيسي
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        setAudio(null);
      } catch (error) {
        console.warn('Error stopping main audio:', error);
        setAudio(null);
      }
    }

    // 🔧 إيقاف أي صوت زائد في DOM
    try {
      const allAudios = document.querySelectorAll('audio');
      allAudios.forEach((audioElement, domIndex) => {
        try {
          if (!audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.src = '';
            console.log(`🔊 Stopped DOM audio #${domIndex + 1}`);
          }
        } catch (error) {
          console.warn(`Error stopping DOM audio #${domIndex + 1}:`, error);
        }
      });
    } catch (error) {
      console.warn('Error accessing DOM audio elements:', error);
    }

    clearAlertTimeout();
    setIsBusy(false);
    console.log('🔔 System status: AVAILABLE');

  }, [audio, clearAlertTimeout]);

  // إغلاق التنبيه
  const closeAlert = useCallback(() => {
    resetState();
  }, [resetState]);

  // إرسال تنبيه عاجل
  const sendAlert = useCallback(async (conversationId: string) => {
    if (!conversationId || !user) return false;

    if (isBusy) {
      console.log('🔔 System busy - cannot send alert');
      return false;
    }

    try {
      console.log('🔔 Sending urgent alert');

      setIsBusy(true);
      console.log('🔔 System status: BUSY');

      if (processRef.current) {
        console.log('🔔 Cleaning up previous process');
        resetState();
      }

      // عرض واجهة التنبيه للمرسل فوراً
      const callId = `call-${Date.now()}`;
      setAlertData({
        from: {
          id: 'recipient',
          name: 'المستقبل',
          avatar: undefined
        },
        conversationId,
        callId
      });
      setIsOutgoing(true);
      setIsRinging(true);
      setTargetConversationId(conversationId);

      // ✅ تشغيل نغمة الانتظار الحقيقية (طوط طوط) بدلاً من الموسيقى
      const ringback = new RingbackToneGenerator();
      ringback.start();
      console.log('📞 Ringback tone started (sender side)');

      // حفظ مرجع الـ ringback في audio state للتنظيف لاحقاً (dummy audio للتوافق)
      const dummyAudio = new Audio();
      (dummyAudio as any)._ringbackGenerator = ringback;
      setAudio(dummyAudio);
      activeAudiosRef.current.add(dummyAudio);

      // إرسال التنبيه العاجل
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: 'دعوة لمحادثة مستعجلة !!',
          message_type: 'alert',
          media_metadata: {
            is_urgent_alert: true,
            call_id: callId,
            priority: 'high',
            sound_type: 'phone_ring'
          },
        });

      // انتهاء العملية بعد 20 ثانية
      setTimeout(() => {
        console.log('🔔 Auto-timeout after 20 seconds - releasing system');
        resetState();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }, 20000);

      return !error;
    } catch (error) {
      console.error('Error sending urgent alert:', error);
      setIsBusy(false);
      return false;
    }
  }, [user, resetState, isBusy]);

  // ضبط إجراء فتح المحادثة
  const setOnAcceptActionCallback = useCallback((action: (conversationId: string) => void) => {
    setOnAcceptAction(() => action);
  }, []);

  // ==== AFTER DEFINING ALL FUNCTIONS =====

  // إعداد نظام الرسائل
  const setupMessageSystem = useCallback(() => {
    if (!user) return null;

    // ✅ Guard: إذا كانت القناة موجودة لنفس المستخدم، لا تُعيد التهيئة
    if (initializedForUserRef.current === user.id && channelRef.current) {
      console.log('🔔 Channel already exists for this user - skipping re-init');
      return channelRef.current;
    }

    // تنظيف القناة السابقة أولاً (فقط إذا تغير المستخدم)
    if (channelRef.current) {
      console.log('🔔 Cleaning up previous channel (user changed)');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('🔔 Setting up message system (FCM + Realtime)');

    const messageChannel = supabase
      .channel(`urgent_alerts_${user.id}_${Date.now()}`)
      // ✅ استقبال جميع الرسائل الجديدة (بدون filter لتجنب CLOSED status)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const message = payload.new;

        // ✅ فلترة يدوية للتنبيهات العاجلة
        if (message.message_type === 'alert' &&
          message.content === 'دعوة لمحادثة مستعجلة !!' &&
          message.sender_id && message.sender_id !== user.id) {
          console.log('🔔 Urgent alert received via Realtime:', message);
          console.log('🔔 Processing urgent alert');
          showIncomingAlertRef.current?.(message);
        }

        // ✅ فلترة يدوية لرسائل إلغاء التنبيه
        if (message.message_type === 'text' &&
          message.media_metadata?.is_alert_cancelled &&
          message.sender_id && message.sender_id !== user.id) {
          console.log('🔔 Alert cancellation received');
          clearAlertTimeout();
          resetState();
        }
      })
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to urgent alerts channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to urgent alerts channel');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Realtime channel closed - may need to reconnect');
        }
      });

    channelRef.current = messageChannel;
    // ✅ تسجيل أن القناة تم تهيئتها لهذا المستخدم
    initializedForUserRef.current = user.id;
    console.log('🔔 Channel initialized for user:', user.id);
    return messageChannel;
    // ✅ Dependencies مستقرة - user فقط
  }, [user]);

  // ==== AFTER setupMessageSystem =====

  // إظهار التنبيه الوارد
  const showIncomingAlert = useCallback(async (message: any) => {
    console.log('🔔 Processing alert message:', {
      message_id: message.id,
      sender_id: message.sender_id,
      current_user_id: user?.id,
      content: message.content
    });

    if (!user || message.sender_id === user.id) {
      console.log('🔔 Skipping alert - same user or no user');
      return;
    }

    // 🔧 ANDROID FIX: Skip local UI on Android (Native handles it)
    if (Capacitor.getPlatform() === 'android') {
      console.log('📱 Android detected: Skipping local UI (Native handling active)');
      return;
    }

    try {
      console.log('🔔 Showing incoming urgent alert');
      const userData = await getUserData(message.sender_id, supabase);

      // تنظيف وتنظيم الحالة
      if (isBusy) {
        console.log('🔔 Cleaning up previous alert state');
        resetState();
      }

      setIsBusy(true);
      console.log('🔔 System status: BUSY (receiving alert)');

      setAlertData({
        from: {
          id: message.sender_id,
          name: userData?.username || 'مستخدم',
          avatar: userData?.avatar_url || undefined
        },
        conversationId: message.conversation_id,
        callId: message.media_metadata?.call_id || `call-${message.id}`
      });
      setIsOutgoing(false);
      setIsRinging(true);
      setTargetConversationId(message.conversation_id);

      // ✅ استخدام GlobalAudioManager بدلاً من Audio محلي
      try {
        await globalAudioManager.startAlert();
        console.log('🔊 Urgent ringtone started via GlobalAudioManager');
      } catch (soundError) {
        console.log('🔇 Audio autoplay blocked - waiting for user interaction');

        // المتصفح حظر الصوت تلقائياً، سنحاول تشغيله عند أول تفاعل
        const tryPlay = async () => {
          try {
            await globalAudioManager.resume();
            console.log('🔊 Audio resumed after user interaction');
            // تنظيف المستمعين بمجرد النجاح
            document.removeEventListener('click', tryPlay);
            document.removeEventListener('touchstart', tryPlay);
            document.removeEventListener('keydown', tryPlay);
          } catch (e) {
            console.warn('Still blocked:', e);
          }
        };

        // إضافة مستمعين لجميع أنواع التفاعل المحتملة
        document.addEventListener('click', tryPlay);
        document.addEventListener('touchstart', tryPlay);
        document.addEventListener('keydown', tryPlay);

        // تنظيف المستمعين بعد 20 ثانية (انتهاء التنبيه)
        setTimeout(() => {
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
          document.removeEventListener('keydown', tryPlay);
        }, 20000);
      }

      // انتهاء التنبيه بعد 20 ثانية
      processRef.current = setTimeout(() => {
        console.log('🔔 Auto-timeout after 20 seconds - releasing system');
        resetState();
      }, 20000);

    } catch (err) {
      console.error('Error showing incoming alert:', err);
      clearAlertTimeout();
      resetState();
    }
  }, [user, resetState, isBusy, clearAlertTimeout]);

  // ✅ تحديث ref عند تغير showIncomingAlert
  useEffect(() => {
    showIncomingAlertRef.current = showIncomingAlert;
  }, [showIncomingAlert]);

  // ==== UI COMPONENT =====

  // مكون التنبيه
  const GlobalCallAlert = useCallback(({ onAccept, onDecline }: { onAccept?: () => void; onDecline?: () => void }) => {

    const handleAccept = useCallback(() => {
      console.log('🔔 Accept clicked - opening chat');
      console.log('🔔 targetConversationId:', targetConversationId);

      clearAlertTimeout();
      globalAudioManager.stopAllAudio(); // ✅ إيقاف الصوت عبر المدير العام

      if (targetConversationId && onAcceptAction) {
        console.log('🔔 Navigating to conversation:', targetConversationId);
        onAcceptAction(targetConversationId);
      } else {
        console.warn('🔔 Cannot navigate - missing targetConversationId or onAcceptAction');
      }

      if (onAccept) onAccept();
      resetState();
    }, [targetConversationId, onAcceptAction, onAccept, resetState, clearAlertTimeout]);

    const handleDecline = useCallback(() => {
      console.log('🔔 Decline clicked - sending cancel');

      clearAlertTimeout();
      globalAudioManager.stopAllAudio(); // ✅ إيقاف الصوت عبر المدير العام

      // إرسال إلغاء التنبيه
      if (isOutgoing && targetConversationId && user) {
        const sendCancelAlert = async () => {
          try {
            await supabase
              .from('messages')
              .insert({
                conversation_id: targetConversationId,
                sender_id: user.id,
                content: 'تم قطع التنبيه من قبل المستخدم !!',
                message_type: 'text',
                media_metadata: {
                  is_alert_cancelled: true,
                  cancelled_by: user.id
                },
              });
            console.log('🔔 Cancel alert sent');
          } catch (error) {
            console.error('Error sending cancel alert:', error);
          }
        };
        sendCancelAlert();
      }

      if (onDecline) onDecline();
      resetState();
    }, [isOutgoing, targetConversationId, user, clearAlertTimeout, onDecline, resetState]);

    return (
      <CallAlertUI
        isRinging={isRinging}
        alertData={alertData}
        onAccept={handleAccept}
        onDecline={handleDecline}
        isIncoming={!isOutgoing}
      />
    );
  }, [isRinging, alertData, isOutgoing, targetConversationId, onAcceptAction, resetState]);

  // ==== SETUP SYSTEM =====

  // إعداد النظام عند بدء التشغيل
  useEffect(() => {
    if (user) {
      console.log('🔔 Initializing message system');
      setupMessageSystem();
    }

    // ✅ لا تُنظف القناة عند unmount - نحتفظ بها طوال الجلسة
    // القناة تُنظف فقط عند تغيير المستخدم (داخل setupMessageSystem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // ✅ فقط user.id، ليس setupMessageSystem

  const value: OptimizedCallAlertContextType = {
    showIncomingAlert,
    closeAlert,
    sendAlert,
    setOnAcceptAction: setOnAcceptActionCallback,
    alertData,
    isRinging,
    isOutgoing,
    isBusy,
    GlobalCallAlert
  };

  return (
    <OptimizedCallAlertContext.Provider value={value}>
      {children}
    </OptimizedCallAlertContext.Provider>
  );
}

export function useOptimizedCallAlert() {
  const context = useContext(OptimizedCallAlertContext);
  if (context === undefined) {
    throw new Error('useOptimizedCallAlert must be used within a OptimizedCallAlertProvider');
  }
  return context;
}