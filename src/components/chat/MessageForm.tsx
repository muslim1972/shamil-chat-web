// MessageForm Component
// This component handles the message input form

import React, { useEffect } from 'react';
import { MessageInput } from './MessageInput';
import { AttachmentMenu } from './AttachmentMenu';
import { RecordingHeader } from './RecordingHeader';
import { FilePreviewBar } from '../../hooks/aiChat/components/FilePreviewBar';
import type { SelectedFile, FileType } from '../../hooks/aiChat/useFileSelection';

interface MessageFormProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendAlert?: () => void;
  isAttachmentMenuOpen: boolean;
  setAttachmentMenuOpen: (open: boolean) => void;
  toggleAttachmentMenu: () => void;
  closeAttachmentMenu: () => void;
  onStartRecording: () => void;
  isUploading: boolean;
  uploadProgress: number;
  isRecording: boolean;
  recordingDuration: number;
  handleCancelRecording: () => void;
  handleSendRecording: (caption?: string) => Promise<boolean>;
  pickAndSendMedia: (type: "image" | "video" | "audio" | "document") => Promise<void>;
  handleSendLocation: () => void;
  disabled?: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isEditingMessage?: boolean;
  editingMessageId?: string | null;
  onCancelEdit?: () => void;
  onInputBlur?: () => void;
  // AI File props
  isAIConversation?: boolean;
  selectedFiles?: SelectedFile[];
  onRemoveFile?: (index: number) => void;
  onSelectFile?: (type: FileType) => void;
  isProcessingFiles?: boolean;
  // Paste image handler
  onPasteImage?: (file: File) => void;
  // Reply props
  replyingToMessage?: any | null;
  onCancelReply?: () => void;
  // Schedule message
  onScheduleClick?: () => void;
}

export const MessageForm: React.FC<MessageFormProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onSendAlert,
  isAttachmentMenuOpen,
  setAttachmentMenuOpen,
  toggleAttachmentMenu,
  closeAttachmentMenu,
  onStartRecording,
  isUploading,
  uploadProgress,
  isRecording,
  recordingDuration,
  handleCancelRecording,
  handleSendRecording,
  pickAndSendMedia,
  handleSendLocation,
  disabled = false,
  inputRef,
  isEditingMessage = false,
  editingMessageId = null,
  onCancelEdit,
  // AI File props
  isAIConversation = false,
  selectedFiles = [],
  onRemoveFile,
  onSelectFile,
  isProcessingFiles = false,
  // Paste image handler
  onPasteImage,
  // Reply props
  replyingToMessage,
  onCancelReply,
  // Schedule message
  onScheduleClick
}) => {

  // ✅ Timer للتطوير
  const [uploadTimer, setUploadTimer] = React.useState(0);

  React.useEffect(() => {
    if (isUploading) {
      setUploadTimer(0);
      const interval = setInterval(() => {
        setUploadTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setUploadTimer(0);
    }
  }, [isUploading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // ✅ تعطيل Enter أثناء التسجيل - النص سيُرسل مع التسجيل
      if (isRecording) {
        return;
      }
      if (newMessage.trim() !== '') {
        onSendMessage(e as any);
      }
    }
  };

  // ضبط ارتفاع textarea تلقائيًا بناءً على محتواه
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleAttachmentClick = () => {
    if (!disabled) {
      toggleAttachmentMenu();
    }
  };

  const handleStartRecording = () => {
    if (!disabled) {
      onStartRecording();
    }
  };

  // دالة لإرسال التسجيل مع النص المكتوب
  const handleSendRecordingWithCaption = async () => {
    try {
      // حفظ النص المكتوب مؤقتاً
      const captionText = newMessage.trim();

      // إرسال التسجيل مع النص ككابشن
      const success = await handleSendRecording(captionText);

      // إذا تم الإرسال بنجاح، قم بتفريغ حقل النص
      if (success) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('فشل في إرسال التسجيل:', error);
    }
  };

  return (
    <form
      className={`border-t p-2 relative ${disabled ? 'opacity-60' : ''}`}
      style={{ background: 'var(--message-form-bg)', borderColor: 'var(--shagram-border)' }}
    >
      <AttachmentMenu
        isOpen={isAttachmentMenuOpen}
        onClose={closeAttachmentMenu}
        onPickMedia={pickAndSendMedia}
        onSendLocation={handleSendLocation}
      />

      {/* زر إلغاء التعديل */}
      {isEditingMessage && onCancelEdit && (
        <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 mb-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">جاري تعديل الرسالة</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* ✅ زر إلغاء الرد (Reply Banner) */}
      {replyingToMessage && onCancelReply && (
        <div 
          className="flex justify-between items-center px-3 py-2 mb-2 mx-1 rounded-lg border-l-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ background: 'var(--conversation-card-hover)', borderColor: 'var(--primary)' }}
        >
          <div className="flex flex-col flex-1 min-w-0 mr-2">
            <span className="text-xs font-bold truncate" style={{ color: 'var(--primary)' }}>
              الرد على {replyingToMessage.sender_username || replyingToMessage.sender?.username || 'مستخدم'}
            </span>
            <span className="text-xs truncate opacity-80" style={{ color: 'var(--shagram-text-muted)' }}>
              {replyingToMessage.message_type === 'text'
                ? replyingToMessage.text
                : (replyingToMessage.message_type === 'image' ? '📷 صورة' :
                  replyingToMessage.message_type === 'video' ? '🎥 فيديو' :
                    replyingToMessage.message_type === 'audio' ? '🎤 تسجيل صوتي' : 'ملف')}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            type="button"
            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}

      {isRecording && (
        <RecordingHeader
          duration={recordingDuration}
          onCancel={handleCancelRecording}
          onSend={handleSendRecordingWithCaption}
        />
      )}

      {/* File Preview Bar (للمحادثات AI فقط) */}
      {isAIConversation && selectedFiles && selectedFiles.length > 0 && onRemoveFile && (
        <FilePreviewBar
          files={selectedFiles}
          onRemove={onRemoveFile}
          isProcessing={isProcessingFiles}
        />
      )}

      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        onAttachmentClick={handleAttachmentClick}
        onStartRecording={handleStartRecording}
        onSendAlert={onSendAlert}
        isUploading={isUploading}
        isRecording={isRecording}
        inputRef={inputRef}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        // AI File props
        isAIConversation={isAIConversation}
        onSelectFile={onSelectFile}
        // Paste image handler
        onPasteImage={onPasteImage}
        // Schedule
        onScheduleClick={onScheduleClick}
      />
      {/* ✅ Modern Upload Progress Indicator */}
      {isUploading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent backdrop-blur-sm z-50 flex items-end justify-center pb-24 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 transform scale-100 animate-in slide-in-from-bottom-4 duration-500">
            {/* Circular Progress */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
                <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="4" fill="none"
                  strokeDasharray={`${uploadProgress * 1.25} 125`}
                  className="transition-all duration-300 ease-out" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
            {/* Text */}
            <div className="text-right">
              <p className="text-white font-semibold text-sm">جاري الرفع...</p>
              <p className="text-white/80 text-xs">
                {uploadProgress < 30 ? 'جاري المعالجة' : uploadProgress < 70 ? 'جاري الرفع' : 'اوشك على الانتهاء'}
              </p>
              <p className="text-white/60 text-[10px] mt-0.5">{uploadTimer}s</p>
            </div>
            {/* Animated dots */}
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
