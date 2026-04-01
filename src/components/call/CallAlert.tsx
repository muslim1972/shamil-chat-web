import React from 'react';
import type { CallAlertData } from '../../context/GlobalCallAlertContext';

export interface CallAlertProps { // جعل الواجهة قابلة للتصدير
  alertData: CallAlertData | null;
  isRinging: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isIncoming?: boolean; // إضافة خاصية لتحديد نوع التنبيه
}

const CallAlert: React.FC<CallAlertProps> = ({
  alertData,
  isRinging,
  onAccept,
  onDecline,
  isIncoming = true,
}) => {

  if (!isRinging || !alertData) {
    return null;
  }

  const { from: sender } = alertData; // استخدام `from` كمصدر للمعلومات

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header with profile */}
        <div className="p-6 text-center">
          {sender?.avatar ? (
            <img 
              src={sender.avatar}
              alt={sender.name || 'User'}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-24 h-24 rounded-full mx-auto mb-4 bg-blue-100 dark:bg-blue-900 flex items-center justify-center';
                fallback.innerHTML = `<span class="text-3xl font-bold text-blue-600 dark:text-blue-300">${(sender.name || 'U').charAt(0).toUpperCase()}</span>`;
                target.parentNode?.insertBefore(fallback, target.nextSibling);
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                {(sender.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {sender.name || 'مستخدم'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {isIncoming ? 'يدعوك لمحادثة مستعجلة' : 'جاري طلب محادثة عاجلة...'}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex border-t border-gray-200 dark:border-gray-700">
          {isIncoming ? (
            <>
              <button
                onClick={onDecline}
                className="flex-1 py-4 px-2 text-center text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>رفض</span>
                </div>
              </button>
              <button
                onClick={onAccept}
                className="flex-1 py-4 px-2 text-center text-green-500 font-medium hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>فتح المحادثة</span>
                </div>
              </button>
            </>
          ) : (
            <button
              onClick={onDecline}
              className="w-full py-4 px-2 text-center text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>إلغاء</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallAlert;
