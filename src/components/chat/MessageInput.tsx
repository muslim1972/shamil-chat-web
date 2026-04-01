import React, { useCallback, useRef } from 'react';
import { Paperclip, Send, Mic, CornerDownLeft, BellRing, Clock } from 'lucide-react';
import { useGlobalUIStore } from '../../stores/useGlobalUIStore';
import { useKeyboardLayout } from '../../hooks/useKeyboardLayout';
import { FilePickerMenu } from '../../hooks/aiChat/components/FilePickerMenu';
import type { FileType } from '../../hooks/aiChat/useFileSelection';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onAttachmentClick: () => void;
  onStartRecording: () => void;
  isUploading: boolean;
  isRecording: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  onSendAlert?: () => void;
  // AI File props
  isAIConversation?: boolean;
  onSelectFile?: (type: FileType) => void;
  // Paste handler for images
  onPasteImage?: (file: File) => void;
  // Schedule button
  onScheduleClick?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onAttachmentClick,
  onStartRecording,
  isUploading,
  isRecording,
  inputRef,
  disabled = false,
  onKeyDown,
  onBlur,
  onSendAlert,
  // AI File props
  isAIConversation = false,
  onSelectFile,
  // Paste handler
  onPasteImage,
  // Schedule
  onScheduleClick
}) => {
  // حالة الكيبورد للتحكم في إظهار/إخفاء الإعلان
  const setKeyboardVisible = useGlobalUIStore((state) => state.setKeyboardVisible);

  // مرجع لـ timeout إخفاء الكيبورد
  const blurTimeoutRef = useRef<number | null>(null);

  // ✅ استخدام hook الكيبورد الجديد المعتمد على Capacitor/Keyboard
  useKeyboardLayout(inputRef, {
    autoScroll: true
  });

  // حساب عدد الأحرف المتبقية
  const maxCharacters = 1000;
  const remainingCharacters = maxCharacters - newMessage.length;

  // التحقق مما إذا كان النص طويلاً جداً
  const isTextTooLong = remainingCharacters < 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // تحديد طول النص إلى الحد الأقصى
    if (text.length <= maxCharacters) {
      setNewMessage(text);
    }
  };

  // عند التركيز على حقل الإدخال = الكيبورد ظاهر
  const handleInputFocus = useCallback(() => {
    // إلغاء أي timeout معلق لإخفاء الكيبورد
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setKeyboardVisible(true);

    // لم نعد بحاجة لاستدعاء أي شيء من الـ hook هنا،
    // فالـ hook يستمع لأحداث الكيبورد بنفسه
  }, [setKeyboardVisible]);

  // عند فقدان التركيز = الكيبورد مخفي (مع تأخير للسماح للنقرة بالعمل)
  const handleInputBlur = useCallback(() => {
    // تأخير إخفاء الكيبورد للسماح للنقرة على الأزرار بالعمل أولاً
    blurTimeoutRef.current = window.setTimeout(() => {
      setKeyboardVisible(false);
      blurTimeoutRef.current = null;
    }, 150);

    // استدعاء onBlur الأصلي إذا وجد
    if (onBlur) {
      onBlur();
    }
  }, [setKeyboardVisible, onBlur]);

  // معالج لصق الصور من الحافظة
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || !onPasteImage) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // منع اللصق الافتراضي
        const file = item.getAsFile();
        if (file) {
          onPasteImage(file);
        }
        break;
      }
    }
  }, [onPasteImage]);

  return (
    <div className="flex flex-col px-2">
      <div className="flex items-center justify-center">
        {/* زر الإرفاق العادي (للمحادثات غير AI فقط) */}
        {!isAIConversation && (
          <button
            type="button"
            onClick={onAttachmentClick}
            disabled={isUploading || disabled}
            className={`p-2 rounded-full flex-shrink-0 transition-all ${disabled || isUploading
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              }`}
            aria-label="إرفاق ملف"
          >
            <Paperclip size={19} className="rotate-135" />
          </button>
        )}

        {/* زر التنبيه (للمحادثات غير AI فقط) */}
        {!isAIConversation && (
          <button
            type="button"
            onClick={onSendAlert}
            disabled={isUploading || disabled || isRecording}
            className={`p-2 rounded-full flex-shrink-0 transition-all relative group ${disabled || isUploading || isRecording
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 focus:outline-none focus:ring-2 focus:ring-amber-500'
              }`}
            aria-label="إرسال تنبيه"
          >
            <BellRing size={19} className="animate-pulse" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
              إرسال تنبيه صوتي
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </button>
        )}

        {/* قائمة اختيار الملفات (للمحادثات AI فقط) */}
        {isAIConversation && onSelectFile && (
          <FilePickerMenu
            onSelect={onSelectFile}
            disabled={isUploading || disabled || isRecording}
          />
        )}

        <div className="flex-1 relative mx-2 min-w-0 mt-1">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onPaste={handlePaste}
            placeholder="اكتب رسالة..."
            rows={1}
            className={`w-full border rounded-sm py-1.6 px-4 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${isTextTooLong
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
              } ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
            disabled={disabled}
            style={{ maxHeight: '120px' }}
          />

          {/* مؤشر عدد الأحرف */}
          {newMessage.length > 0 && (
            <div className={`absolute bottom-1 right-2 text-xs ${isTextTooLong ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}>
              {remainingCharacters}
            </div>
          )}
        </div>

        {newMessage.length > 0 ? (
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  const currentValue = newMessage;
                  setNewMessage(currentValue + '\n');
                  setTimeout(() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                      inputRef.current.selectionStart = inputRef.current.value.length;
                    }
                  }, 0);
                }
              }}
              disabled={disabled || isTextTooLong || isRecording}
              className={`rounded-full p-2 flex-shrink-0 transition-all ${disabled || isTextTooLong || isRecording
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                } text-indigo-600 dark:text-indigo-400`}
              aria-label="سطر جديد"
            >
              <CornerDownLeft size={18} className="transform -rotate-90" />
            </button>

            {/* زر الجدولة */}
            {onScheduleClick && !isAIConversation && (
              <button
                type="button"
                onClick={onScheduleClick}
                disabled={disabled || isTextTooLong || isRecording}
                className={`rounded-full p-2 flex-shrink-0 transition-all relative group ${disabled || isTextTooLong || isRecording
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                  } text-purple-600 dark:text-purple-400`}
                aria-label="جدولة الرسالة"
              >
                <Clock size={18} />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                  جدولة الرسالة
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={onSendMessage}
              disabled={disabled || isTextTooLong || isRecording}
              className={`rounded-full p-[0.4rem] flex-shrink-0 transition-all ${disabled || isTextTooLong || isRecording
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                } text-white`}
              aria-label="إرسال الرسالة"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            disabled={isUploading || isRecording || disabled}
            className={`rounded-full p-[0.4rem] flex-shrink-0 transition-all relative group ${disabled || isUploading || isRecording
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              } text-white`}
            aria-label="تسجيل رسالة صوتية"
          >
            <Mic size={16} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
              اضغط لتسجيل رسالة صوتية
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          </button>
        )}
      </div>

      {/* رسالة تحذير للنص الطويل */}
      {isTextTooLong && (
        <div className="text-red-500 text-xs mt-1 text-right">
          الرسالة طويلة جداً، يرجى تقصيرها
        </div>
      )}
    </div>
  );
};
