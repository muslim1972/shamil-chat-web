// تعريفات Window للأندرويد
export {};

declare global {
  interface Window {
    Android?: {
      showFullscreenAlert?: (data: any) => void;
      onCallResponse?: (data: any) => void;
      requestWakeLockPermissions?: () => void;
    };
    ShamilApp?: {
      callAlertResponse?: (data: any) => void;
    };
  }
}