// تعريفات TypeScript للأندرويد
// D:\ShamilApp\shamil-app-web\src\types\android.d.ts

declare global {
  interface Window {
    Android?: {
      showFullscreenAlert: (data: {
        sender_name: string;
        call_id: string;
        conversation_id: string;
        sender_id: string;
      }) => void;
      onCallResponse: (data: {
        conversationId: string;
        accepted: boolean;
      }) => void;
      requestWakeLockPermissions: () => Promise<void>;
    };
  }
}

export {};