import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import useLongPress from '../../hooks/useLongPress';
import type { Message } from '../../types';
import { isLocationMessage } from '../../utils/messageHelpers';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { useMediaViewer } from '../../context/MediaViewerContext';

// ✅ استيراد المكونات الفرعية
import {
  VideoRenderer,
  ImageRenderer,
  AudioRenderer,
  FileRenderer,
  LocationRenderer,
  ForwardedRenderer,
} from './renderers';
import { MessageStatusDot } from './MessageStatusDot'; // ✅ إضافة الاستيراد هنا

// معرف وصورة الذكاء الاصطناعي
const AI_BOT_USER_ID = '4ed1b4c0-7746-4bb6-aadc-86342d3d26a2';
const AI_BOT_AVATAR_URL = '/logos/ai-chat.png';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onLongPress: (target: EventTarget | null, message: Message) => void;
  isSelected?: boolean;
  onClick?: (message: Message, e?: React.MouseEvent | React.TouchEvent) => void;
  onDoubleClick?: (message: Message, e?: React.MouseEvent | React.TouchEvent) => void; // ✅ جديد
  senderAvatar?: string;
  senderUsername?: string;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = memo(({
  message,
  isOwnMessage,
  onLongPress,
  isSelected = false,
  onClick,
  onDoubleClick, // ✅ جديد
  senderAvatar,
  senderUsername
}) => {
  // ❌ إخفاء رسالة الإعجاب بالقصة للمرسل (المعجب) كلياً من القائمة
  if (isOwnMessage && message.text && message.text.includes('أعجب بقصتك') && message.text.includes('❤️')) {
    return null;
  }

  // ✅ الحالات المحلية
  const [localUrl, setLocalUrl] = useState<string | null>((message as any).localUrl || (message as any).signedUrl || null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // ✅ تحديث الرابط المحلي عند تغير الرسالة (مثلاً من Blob إلى R2 URL بعد الرفع)
  useEffect(() => {
    const newToken = (message as any).localUrl || (message as any).signedUrl || null;
    if (newToken && newToken !== localUrl) {
      setLocalUrl(newToken);
    }
  }, [message]);

  // ✅ Hooks
  const { openMedia } = useMediaViewer();
  const { user } = useAuth();

  // ✅ البيانات المحسوبة
  const computedData = useMemo(() => {
    const msgTypeRaw = ((message as any)?.message_type || '').toLowerCase();
    const textPath = String((message as any)?.text || '');
    const metaPath = String(((message as any)?.media_metadata || {})?.path || ((message as any)?.media_metadata || {})?.file_path || ((message as any)?.media_metadata || {})?.storage_path || '');
    const pathForInfer = metaPath || textPath;
    const ext = pathForInfer.split('.').pop()?.toLowerCase() || '';
    const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    const videoExts = new Set(['mp4', 'webm', 'mkv', 'mov']);
    const inferred = imageExts.has(ext) ? 'image' : (videoExts.has(ext) ? 'video' : '');
    const msgType = (msgTypeRaw || inferred);
    const isMedia = !!msgType && msgType !== 'text' && msgType !== 'forwarded_block';

    return { msgType, isMedia, msgTypeRaw, textPath, metaPath, ext };
  }, [message]);

  // ✅ دوال المساعدة
  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // ✅ بيانات المرسل - مع دعم صورة AI Bot
  const isAIBot = message.senderId === AI_BOT_USER_ID;
  const computedAvatar = useMemo(() => {
    // إذا كان المرسل هو AI Bot، استخدم صورته المخصصة
    if (isAIBot) return AI_BOT_AVATAR_URL;
    return senderAvatar ?? ((message as any)?.sender?.avatar_url ?? null);
  }, [senderAvatar, message, isAIBot]);

  const computedUsername = useMemo(() => {
    // إذا كان المرسل هو AI Bot، استخدم اسمه المخصص
    if (isAIBot) return 'المحاور الذكي';
    return senderUsername
      ?? ((message as any)?.sender?.username)
      ?? ((message as any)?.sender_username)
      ?? ((message as any)?.senderName)
      ?? '';
  }, [senderUsername, message, isAIBot]);

  // ✅ معالجات Long Press
  const handleClickWrapper = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    if (onClick) {
      onClick(message, e);
    }
  }, [onClick, message]);

  const handleLongPressWrapper = useCallback((target: EventTarget | null) => {
    onLongPress(target, message);
  }, [onLongPress, message]);

  // ✅ جديد: wrapper للنقر المزدوج
  const handleDoubleClickWrapper = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    if (onDoubleClick) {
      onDoubleClick(message, e);
    }
  }, [onDoubleClick, message]);

  const longPressEvents = useLongPress(handleLongPressWrapper, handleClickWrapper, handleDoubleClickWrapper, { delay: 500 }); // ✅ جديد

  // ✅ تحميل روابط الوسائط
  useEffect(() => {
    const initializeMessage = async () => {
      const msg: any = message as any;
      const type = (msg.message_type || '').toLowerCase();
      if (!type || type === 'text' || type === 'alert' || type === 'forwarded_block') return;

      const meta = msg.media_metadata || {};

      // ✅ للصور من AI: استخدام Base64 مباشرة من media_metadata
      if (type === 'image' && meta.base64_data) {
        if (!localUrl || !localUrl.startsWith('data:')) {
          setLocalUrl(meta.base64_data);
        }
        return;
      }

      const rawPath = meta.path || meta.file_path || meta.storage_path || msg.text;
      if (type === 'image') console.log('🖼️ MessageBubble Image Path:', { id: msg.id, rawPath, localUrl });

      let cancelled = false;

      (async () => {
        try {
          if (!localUrl && rawPath) {
            if (/^https?:\/\//i.test(rawPath)) {
              if (!cancelled) setLocalUrl(rawPath);
            } else {
              const path = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;
              let url: string | null = null;
              const { data: signed } = await supabase.storage.from('call-files').createSignedUrl(path, 900);
              url = signed?.signedUrl || null;
              if (!url) {
                try {
                  const { supabaseUrl } = await import('../../services/supabase');
                  url = `${supabaseUrl}/storage/v1/object/public/call-files/${path}`;
                } catch { }
              }
              if (!cancelled && url) setLocalUrl(url);
            }
          }
          // ✅ النظام الهجين: لا نحمل thumbnail هنا - BlurHash كافٍ!
        } catch { }
      })();

      return () => { cancelled = true; };
    };

    initializeMessage();
  }, [message.id, localUrl]);

  useEffect(() => {
    if (((message as any).message_type || '').toLowerCase() === 'image') {
      setImageError(false);
    }
  }, [message?.id, localUrl]);

  useEffect(() => {
    setAvatarError(false);
  }, [computedAvatar]);

  // ✅ عرض الرد
  const renderReply = useCallback(() => {
    if (!message.reply_to_message) return null;
    const reply = message.reply_to_message;
    const senderName = reply.sender_username || reply.sender?.username || 'مستخدم';

    return (
      <div
        className={`mb-1 rounded px-2 py-1 text-xs border-r-4 flex flex-col cursor-pointer opacity-90 transition-opacity hover:opacity-100
            ${isOwnMessage ? 'bg-black/10 border-white/50' : 'bg-gray-200 border-indigo-500 dark:bg-gray-700 dark:border-indigo-400'}
          `}
        onClick={(e) => {
          e.stopPropagation();
          const targetId = `message-${reply.id}`;
          const element = document.getElementById(targetId);
          console.log('🔗 [MessageBubble] Go to reply:', targetId, element ? 'Found' : 'Not Found');

          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // ✅ وميض مزدوج قوي باستخدام Brightness و Scale (يعمل على جميع الألوان)
            if (element.animate) {
              element.animate([
                { filter: 'brightness(1)', transform: 'scale(1)', offset: 0 },
                { filter: 'brightness(1.3) contrast(1.2)', transform: 'scale(1.05)', offset: 0.2 },
                { filter: 'brightness(1)', transform: 'scale(1)', offset: 0.5 },
                { filter: 'brightness(1.3) contrast(1.2)', transform: 'scale(1.05)', offset: 0.8 },
                { filter: 'brightness(1)', transform: 'scale(1)', offset: 1 }
              ], { duration: 1500, easing: 'ease-in-out' });
            }
          } else {
            // يمكن إضافة تنبيه للمستخدم
            console.warn('Original message not visible in current chunk');
          }
        }}
        dir="rtl"
      >
        <span className={`font-bold mb-0.5 ${isOwnMessage ? 'text-white' : 'text-indigo-600 dark:text-indigo-300'}`}>
          {senderName}
        </span>
        <span className={`truncate max-w-[200px] ${isOwnMessage ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
          {reply.message_type === 'image' ? '📷 صورة' :
            reply.message_type === 'video' ? '🎥 فيديو' :
              reply.message_type === 'audio' ? '🎤 تسجيل صوتي' :
                reply.text || 'ملف'}
        </span>
      </div>
    );
  }, [message.reply_to_message, isOwnMessage]);

  // ✅ عرض محتوى الرسالة باستخدام المكونات الفرعية
  const renderMessageContent = useCallback(() => {
    // الرسائل المحولة
    if (message.message_type === 'forwarded_block') {
      return <ForwardedRenderer message={message} user={user} isOwnMessage={isOwnMessage} />;
    }

    // الفيديو
    if (computedData.msgType === 'video') {
      const meta = (message as any).media_metadata || {};
      const w = Number(meta.width || meta.video_width) || 640;
      const h = Number(meta.height || meta.video_height) || 360;
      const blurhash = meta.blurhash || null;

      return (
        <VideoRenderer
          message={message}
          localUrl={localUrl}
          onPlayClick={() => {
            if (localUrl) {
              openMedia('video', localUrl, {
                width: w,
                height: h,
                blurhash: blurhash || undefined
              });
            }
          }}
        />
      );
    }

    // الصور
    if (computedData.msgType === 'image') {
      const meta = (message as any).media_metadata || {};
      const w = Number(meta.width || meta.image_width) || 4;
      const h = Number(meta.height || meta.image_height) || 3;
      const blurhash = meta.blurhash || null;

      return (
        <ImageRenderer
          message={message}
          localUrl={localUrl}
          imageError={imageError}
          onImageError={async () => {
            setImageError(true);
            try {
              const msg: any = message as any;
              const meta = msg.media_metadata || {};
              const rawPath = meta.path || meta.file_path || meta.storage_path || msg.text;
              if (!rawPath) return;

              // ✅ إصلاح: إذا كان الرابط خارجياً (R2)، لا نحاول توقيعه
              if (/^https?:\/\//i.test(rawPath)) return;

              const path = rawPath.startsWith('public/') ? rawPath : `public/${rawPath}`;
              const { data } = await supabase.storage.from('call-files').createSignedUrl(path, 900);
              if (data?.signedUrl) {
                setImageError(false);
                setLocalUrl(data.signedUrl);
              }
            } catch { }
          }}
          onImageLoad={() => {
            try {
              const id = String((message as any)?.id || (message as any)?.client_id || '');
              window.dispatchEvent(new CustomEvent('media-loaded', { detail: { id, type: 'image' } }));
            } catch { }
          }}
          onImageClick={() => {
            openMedia('image', localUrl!, { width: w, height: h, blurhash: blurhash || undefined });
          }}
        />
      );
    }

    // الملفات
    if (((message as any).message_type || '').toLowerCase() === 'file') {
      return <FileRenderer text={message.text} localUrl={localUrl} />;
    }

    // الصوت
    if (
      ((message as any).message_type || '').toLowerCase() === 'audio' ||
      (localUrl && ['dat', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mpeg'].includes(
        localUrl.split('.').pop()?.toLowerCase() || ''
      ))
    ) {
      return <AudioRenderer message={message} localUrl={localUrl} isOwnMessage={isOwnMessage} />;
    }

    // الموقع
    if (isLocationMessage(message.text)) {
      return <LocationRenderer text={message.text} />;
    }

    // النص العادي
    let displayText = message.text;
    if (isOwnMessage) {
      if (displayText && displayText.startsWith('💬 رد على قصتك:')) {
        // تحويل "💬 رد على قصتك:" إلى "💬 رددت على قصته:"
        displayText = displayText.replace('رد على قصتك', 'رددت على قصته');
      }
    }

    return (
      <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
        {displayText}
      </p>
    );
  }, [
    message, computedData, localUrl, imageError, isOwnMessage, user, openMedia
  ]);

  return (
    <div className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwnMessage && (
        <div className="flex-shrink-0 mb-1">
          {computedAvatar && !avatarError ? (
            <img
              key={computedAvatar || 'no-avatar'}
              src={computedAvatar}
              alt={computedUsername || 'User'}
              className="w-8 h-8 rounded-full border-2 border-gray-200"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border-2 border-gray-200">
              {(computedUsername || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* حاوية الفقاعة والنقطة */}
      <div className="relative flex items-end">
        {/* النقطة - تم عكس المواقع بناءً على طلب المستخدم */}
        {/* المرسل (يمين): النقطة يمين | المستلم (يسار): النقطة يسار */}
        <MessageStatusDot
          status={message.status}
          isRead={(message as any).isRead}
          isDeleted={message.isDeleted}
          isSenderDeleted={message.isSenderDeleted} // ✅ تمرير الحالة الجديدة
          isOwnMessage={isOwnMessage}
          className={`absolute bottom-1 z-10 ${isOwnMessage ? '-right-4' : '-left-4'}`}
        />

        <div
          {...longPressEvents}
          id={`message-${message.id}`}
          data-id={message.id}
          className={`${message.message_type === 'forwarded_block'
            ? 'w-full min-w-[85vw] max-w-[95vw]'
            : (computedData.isMedia ? 'w-full max-w-[95vw] md:max-w-[60vw]' : 'max-w-xs md:max-w-md lg:max-w-lg')}
            ${computedData.isMedia ? 'p-0' : 'px-4 py-2'} rounded-2xl ${message.message_type === 'forwarded_block'
              ? (isOwnMessage ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-gray-50 border-2 border-gray-300')
              : (isOwnMessage ? 'text-white shadow-md' : 'dark:text-gray-800 shadow-sm')
            } touch-manipulation select-none transition-all duration-200
            ${message.isDeleted && !isOwnMessage ? 'opacity-0 h-2 w-2 overflow-hidden p-0 m-0' : ''} 
            `}
          style={{
            ...(
              message.isDeleted && !isOwnMessage ? { transform: 'scale(0)' } : // إخفاء الرسالة المحذوفة للمستلم
                message.message_type === 'forwarded_block'
                  ? { width: '100%' }
                  : (isOwnMessage
                    ? { background: 'var(--gradient-primary)' }
                    : {
                      backgroundColor: 'var(--message-received-bg)',
                      border: '1px solid var(--message-received-border)'
                    }
                  )
            ),
            ...(isSelected ? {
              border: '4px solid #10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
            } : {})
          }}
        >
          {!(message.isDeleted && !isOwnMessage) && (
            <>
              {renderReply()}
              {renderMessageContent()}
              <div
                className={`flex items-center justify-end text-xs mt-1 w-full gap-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}
                  } ${computedData.isMedia ? 'px-2 py-1' : ''}`}
                style={{ minHeight: 18 }}
              >
                <span>{formatTime(message.timestamp)}</span>
                {/* تم إزالة علامة الصح القديمة واستبدالها بالنقطة الخارجية */}
                {isOwnMessage && message.status === 'failed' && (
                  <AlertCircle size={12} className="text-red-400" />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
  MessageBubbleComponent,
  (prevProps: MessageBubbleProps, nextProps: MessageBubbleProps) => {
    // فحص thumbnail_data للفيديو
    if (prevProps.message.message_type === 'video' || nextProps.message.message_type === 'video') {
      const prevThumbnail = (prevProps.message as any).media_metadata?.thumbnail_data;
      const nextThumbnail = (nextProps.message as any).media_metadata?.thumbnail_data;
      if (prevThumbnail !== nextThumbnail) {
        return false; // re-render
      }
    }

    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.status === nextProps.message.status && // ✅ فحص الحالة
      (prevProps.message as any).isRead === (nextProps.message as any).isRead && // ✅ فحص القراءة
      prevProps.message.isDeleted === nextProps.message.isDeleted && // ✅ فحص الحذف
      prevProps.message.isSenderDeleted === nextProps.message.isSenderDeleted && // ✅ فحص الحذف من المرسل
      prevProps.isOwnMessage === nextProps.isOwnMessage &&
      prevProps.isSelected === nextProps.isSelected &&
      // ✅ إصلاح: فحص onClick و onLongPress - مهم لأنهما يعتمدان على isSelectionMode
      prevProps.onClick === nextProps.onClick &&
      prevProps.onLongPress === nextProps.onLongPress &&
      prevProps.senderAvatar === nextProps.senderAvatar &&
      prevProps.senderUsername === nextProps.senderUsername &&
      ((prevProps.message as any)?.sender?.avatar_url === (nextProps.message as any)?.sender?.avatar_url) &&
      (((prevProps.message as any)?.sender?.username ?? (prevProps.message as any)?.sender_username ?? (prevProps.message as any)?.senderName) ===
        ((nextProps.message as any)?.sender?.username ?? (nextProps.message as any)?.sender_username ?? (nextProps.message as any)?.senderName))
    );
  }
);
// Removed duplicate display name assignment if present, or fixed syntax
MessageBubble.displayName = 'MessageBubble';