import { useState, useEffect, useCallback, useRef } from 'react';
import type { CallAlertData } from '../services/call-alert.service';
import { callAlertService } from '../services/call-alert.service';

export function useCallAlert() {
  const [alertData, setAlertData] = useState<CallAlertData | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // تحميل الصوت
  useEffect(() => {
    const loadSound = () => {
      try {
        audioRef.current = new Audio('/sounds/chat-invite.mp3');
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    };

    loadSound();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // بدء الرنين
  const startRinging = useCallback(async () => {
    try {
      if (audioRef.current) {
        audioRef.current.loop = true;
        await audioRef.current.play();
        setIsRinging(true);
      }
    } catch (error) {
      console.error('Error starting ringtone:', error);
    }
  }, []);

  // إيقاف الرنين
  const stopRinging = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.currentTime) {
          audioRef.current.currentTime = 0;
        }
        setIsRinging(false);
      }
    } catch (error) {
      console.error('Error stopping ringtone:', error);
    }
  }, []);

  // إغلاق التنبيه
  const closeAlert = useCallback(() => {
    setAlertData(null);
    stopRinging();
  }, [stopRinging]);

  // قبول الدعوة
  const acceptInvite = useCallback(async () => {
    if (!alertData) return;
    
    try {
      await callAlertService.acceptInvite(alertData.alertId);
      closeAlert();
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  }, [alertData, closeAlert]);

  // رفض الدعوة
  const declineInvite = useCallback(async () => {
    if (!alertData) return;
    
    try {
      await callAlertService.declineInvite(alertData.alertId);
      closeAlert();
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  }, [alertData, closeAlert]);

  // إرسال دعوة
  const sendInvite = useCallback(async (conversationId: string, recipientId: string, message?: string) => {
    try {
      const alertId = await callAlertService.sendChatInvite(conversationId, recipientId, message);
      return alertId;
    } catch (error) {
      console.error('Error sending invite:', error);
      return null;
    }
  }, []);

  // إلغاء الدعوة
  const cancelInvite = useCallback(async (alertId: string) => {
    try {
      await callAlertService.cancelInvite(alertId);
    } catch (error) {
      console.error('Error cancelling invite:', error);
    }
  }, []);

  // الاشتراك في تحديثات التنبيهات
  useEffect(() => {
    const subscription = callAlertService.onCallAlert((data) => {
      setAlertData(data);
      startRinging();
    });

    return () => {
      subscription();
    };
  }, [startRinging]);

  return {
    alertData,
    isRinging,
    startRinging,
    stopRinging,
    closeAlert,
    acceptInvite,
    declineInvite,
    sendInvite,
    cancelInvite
  };
}
