// useLocation Hook
// This hook handles location sharing functionality

import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseLocationProps {
  sendMessage: (message: string) => Promise<void>;
}

export const useLocation = ({ sendMessage }: UseLocationProps) => {
  const handleSendLocation = useCallback(async () => {
    try {
      // حاول استخدام Capacitor Geolocation إن توفرت (تطبيق الهاتف)
      let latitude: number | null = null;
      let longitude: number | null = null;

      const isCapacitor = typeof (window as any) !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform?.();

      if (isCapacitor) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          // طلب الإذن أولاً
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch (capErr: any) {
          console.warn('Capacitor Geolocation failed, fallback to web:', capErr);
        }
      }

      // إن لم تنجح Capacitor أو لسنا على الهاتف، نستخدم navigator.geolocation
      if (latitude == null || longitude == null) {
        if (!navigator.geolocation) {
          toast.error('خدمة تحديد الموقع غير مدعومة في هذا السياق.');
          return;
        }
        // Debug: Trace who is asking for location
        console.groupCollapsed('📍 Location Request Triggered');
        console.trace('Trace');
        console.groupEnd();

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      if (latitude == null || longitude == null) {
        toast.error('تعذر تحديد الموقع حالياً.');
        return;
      }

      const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      const locationMessage = `📍 موقعي الحالي\n${latitude}, ${longitude}\n[عرض على الخريطة](${locationUrl})`;
      await sendMessage(locationMessage);

    } catch (error: any) {
      console.error('Error getting location:', error);
      const code = error?.code;
      if (code === 1) {
        toast.error('تم رفض إذن الوصول إلى الموقع. يرجى تفعيل خدمة الموقع من إعدادات النظام/المتصفح.');
      } else if (code === 2) {
        toast.error('لا يمكن الوصول إلى معلومات الموقع. يرجى التحقق من اتصال الإنترنت أو تفعيل GPS.');
      } else if (code === 3) {
        toast.error('انتهت مهلة الحصول على الموقع. يرجى المحاولة مرة أخرى.');
      } else {
        toast.error('فشل الحصول على الموقع. يرجى المحاولة مرة أخرى.');
      }
    }
  }, [sendMessage]);

  return { handleSendLocation };
};
