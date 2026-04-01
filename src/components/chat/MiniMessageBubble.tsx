import React from 'react';
import type { Message } from '../../types';

interface MiniMessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MiniMessageBubble: React.FC<MiniMessageBubbleProps> = React.memo(({ message, isOwnMessage }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // البحث عن بيانات المرسل في حقول مختلفة
  const senderAvatar = (message as any).sender?.avatar_url
    || (message as any).media_metadata?.sender_avatar_url
    || (message as any).sender_avatar_url
    || null;
  const senderUsername = (message as any).sender?.username
    || (message as any).media_metadata?.sender_username
    || (message as any).sender_username
    || (message as any).senderName
    || 'مستخدم';

  return (
    <div className="flex items-end gap-1.5 my-1" style={{
      width: '50%',
      maxWidth: '50%',
      marginLeft: isOwnMessage ? 'auto' : undefined,
      marginRight: isOwnMessage ? undefined : 'auto'
    }}>
      {/* 🔥 الصورة للجميع */}
      <div className="flex-shrink-0 mb-1">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderUsername}
            className="w-5 h-5 rounded-full border border-gray-300 object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-[9px] border border-gray-300">
            {senderUsername.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        className={`
          ${isOwnMessage ? 'mr-auto' : 'ml-auto'}
          px-3 py-2 rounded-2xl max-w-[75%] break-words relative
          ${isOwnMessage ? 'text-white shadow-md' : 'dark:text-gray-200 shadow-sm'}
        `}
        style={
          isOwnMessage
            ? { background: 'var(--gradient-primary)', flex: 1 }
            : {
              backgroundColor: 'var(--message-received-bg)',
              border: '1px solid var(--message-received-border)',
              flex: 1
            }
        }
      >
        <p className="text-xs">{message.text}</p>
        <div
          className={`flex items-center justify-end text-[10px] mt-0.5 w-full ${(message as any).display?.textClass
            ? (message as any).display.textClass
            : (isOwnMessage ? 'text-indigo-200' : 'text-gray-500')
            }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
});

MiniMessageBubble.displayName = 'MiniMessageBubble';