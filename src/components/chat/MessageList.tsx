import React, { useCallback, useEffect, useRef } from 'react';
import type { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChatBackground } from '../../context/ChatBackgroundContext';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMessageLongPress: (target: EventTarget | null, message: Message) => void;
  selectedMessages?: Message[];
  onMessageClick?: (message: Message, e?: React.MouseEvent | React.TouchEvent) => void;
}
// The core component logic
const MessageListComponent: React.FC<MessageListProps> = ({
  messages,
  loading,
  messagesEndRef,
  onMessageLongPress,
  selectedMessages = [],
  onMessageClick,
}) => {
  const { user } = useAuth();

  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observedRef = useRef<Set<string>>(new Set());
  const ioRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (ioRef.current) ioRef.current.disconnect();
    ioRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        // ✅ تم تغييره من data-id إلى data-message-row لإصلاح إلغاء التأشير
        const id = el.dataset.messageRow;
        const path = el.dataset.path;
        const signed = el.dataset.signed;
        const type = el.dataset.type;
        if (!id || !path || signed === '1') return;
        if (!type || type === 'text' || type === 'forwarded_block') return;
        if (observedRef.current.has(id)) return;
        observedRef.current.add(id);
        window.dispatchEvent(new CustomEvent('resolve-media', { detail: { id, path } }));
      });
    }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

    itemRefs.current.forEach((el) => ioRef.current?.observe(el));
    return () => ioRef.current?.disconnect();
  }, [messages]);

  const renderMessage = useCallback(
    (message: Message) => {
      const isOwnMessage = message.senderId === user?.id;
      const msgData = message as any;

      const isMedia = (msgData.message_type && msgData.message_type !== 'text' && msgData.message_type !== 'forwarded_block');
      const meta = (msgData.media_metadata || {}) as any;
      const mediaPath = meta.path || meta.file_path || meta.storage_path || msgData.text || '';
      const stableKey = meta.client_id || msgData.client_id || message.id;
      return (
        <div
          key={stableKey}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(String(stableKey), el);
            } else {
              itemRefs.current.delete(String(stableKey));
            }
          }}
          // ✅ إزالة data-id من هنا لأن الصف يمتد على كامل العرض
          // النقر على الفراغ بجانب الرسالة كان يُعتبر نقرة على رسالة!
          // MessageBubble أصلاً تحتوي على data-id={message.id}
          data-message-row={String(stableKey)}
          data-path={isMedia ? mediaPath : ''}
          data-signed={msgData.signedUrl ? '1' : '0'}
          data-type={msgData.message_type || 'text'}
          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 last:mb-0`}
        >
          <MessageBubble
            message={message}
            isOwnMessage={isOwnMessage}
            onLongPress={onMessageLongPress}
            isSelected={selectedMessages.some((m) => m.id === message.id)}
            selectedMessagesCount={selectedMessages.length}
            onClick={(
              message: Message,
              e?: React.MouseEvent | React.TouchEvent
            ) => {
              if (e) {
                e.stopPropagation();
              }
              if (onMessageClick) {
                onMessageClick(message, e);
              }
            }}
            senderAvatar={msgData.sender?.avatar_url}
            senderUsername={msgData.sender?.username}
          />
        </div>
      );
    },
    [user?.id, onMessageLongPress, selectedMessages, onMessageClick]
  );
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
        <div>جاري تحميل الرسائل...</div>
      </div>
    );
  }
  if (!loading && messages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        لا توجد رسائل. ابدأ المحادثة الآن!
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {messages.map((m, index) => (
        <React.Fragment key={`msg-${index}-${(m as any)?.media_metadata?.client_id || (m as any)?.client_id || m.id}`}>
          {renderMessage(m)}
        </React.Fragment>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

// Custom comparison function for React.memo
const areEqual = (
  prevProps: Readonly<MessageListProps>,
  nextProps: Readonly<MessageListProps>
) => {
  // If loading state changes, re-render
  if (prevProps.loading !== nextProps.loading) {
    return false;
  }
  // If the number of messages is different, re-render
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  // If message IDs, deletion status, or key media fields changed, re-render
  const stableOf = (m: any) => (m?.media_metadata?.client_id || m?.client_id || m?.id || '');
  const prevSig = prevProps.messages.map(m => `${stableOf(m)}|${m.text}|${m.isDeleted || false}|${m.isSenderDeleted || false}|${(m as any).signedUrl || ''}|${(m as any).thumbnail || ''}`).join('~');
  const nextSig = nextProps.messages.map(m => `${stableOf(m)}|${m.text}|${m.isDeleted || false}|${m.isSenderDeleted || false}|${(m as any).signedUrl || ''}|${(m as any).thumbnail || ''}`).join('~');
  if (prevSig !== nextSig) {
    return false;
  }
  // If messages array length changed, re-render
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  // If the number of selected messages is different, re-render
  if (prevProps.selectedMessages?.length !== nextProps.selectedMessages?.length) {
    return false;
  }
  // If the long press handler changed (e.g. due to closure updates), re-render
  if (prevProps.onMessageLongPress !== nextProps.onMessageLongPress) {
    return false;
  }
  // ✅ إصلاح: فحص onMessageClick - مهم لأنه يعتمد على isSelectionMode
  // بدون هذا، الرسائل لا تتجاوب مع النقر القصير بعد تأشير الرسالة الأولى
  if (prevProps.onMessageClick !== nextProps.onMessageClick) {
    return false;
  }
  // If all checks pass, props are considered equal, prevent re-render
  return true;
};

// Export the memoized component with the custom comparison function
export const MessageList = React.memo(MessageListComponent, areEqual);

MessageList.displayName = 'MessageList';
