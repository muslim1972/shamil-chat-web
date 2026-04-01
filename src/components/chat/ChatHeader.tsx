import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenTool, Clock } from 'lucide-react';
import { GroupAvatars } from '../GroupAvatars';
import { useChatHeader } from '../../hooks/useChatHeader';
import SmartTypingIndicator from '../../features/typing-indicator/SmartTypingIndicator';
import type { IndicatorType } from '../../features/typing-indicator/SmartTypingIndicator';

interface ChatHeaderProps {
  displayConversationName: string;
  onBack: () => void;
  avatar_url?: string;
  conversationId?: string;
  isTyping?: boolean;
  typingUsers?: Record<string, number>;
  scheduledMessagesCount?: number;
  onScheduledMessagesClick?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  displayConversationName,
  onBack,
  avatar_url,
  conversationId,
  isTyping,
  typingUsers,
  scheduledMessagesCount = 0,
  onScheduledMessagesClick,
}) => {
  const navigate = useNavigate();
  const [typingStyle, setTypingStyle] = useState<IndicatorType>('plane');
  const [typingColor, setTypingColor] = useState<string | undefined>(undefined);
  const [textScale, setTextScale] = useState<number>(1.0);
  const [iconScale, setIconScale] = useState<number>(1.0);

  useEffect(() => {
    const savedStyle = localStorage.getItem('shamil_typing_style') as IndicatorType;
    if (savedStyle && (savedStyle === 'pen' || savedStyle === 'plane')) {
      setTypingStyle(savedStyle);
    }

    const savedColor = localStorage.getItem('shamil_typing_color');
    if (savedColor) {
      setTypingColor(savedColor);
    }

    const savedTextScale = localStorage.getItem('shamil_typing_text_scale');
    if (savedTextScale) {
      setTextScale(parseFloat(savedTextScale));
    }

    const savedIconScale = localStorage.getItem('shamil_typing_icon_scale');
    if (savedIconScale) {
      setIconScale(parseFloat(savedIconScale));
    }
  }, []);

  const {
    isGroup,
    participants,
    otherUserId,
    handleProfileClick,
    handleAvatarClick,
    displayGroupTitle,
  } = useChatHeader(conversationId);

  let typingUserName: string | undefined;
  const typingUserIds = typingUsers ? Object.keys(typingUsers) : [];
  const isCurrentlyTyping = typingUserIds.length > 0;

  if (isCurrentlyTyping) {
    if (isGroup) {
      const typingUserId = typingUserIds[0];
      const typingParticipant = participants.find(p => p.id === typingUserId);
      typingUserName = typingParticipant?.username;
    } else {
      typingUserName = displayConversationName;
    }
  }

  return (
    <div className="shadow-sm p-4 flex items-center border-b h-[72px] pt-[env(safe-area-inset-top)]" style={{ background: 'var(--header-bg)', borderColor: 'var(--shagram-border)' }}>
      <button
        onClick={onBack}
        className="p-2 hover:opacity-80 focus:outline-none rounded-full mr-2"
        style={{ color: 'var(--shagram-text)' }}
      >
        <ArrowLeft size={24} />
      </button>

      <div className="flex items-center flex-1 overflow-hidden">
        {displayGroupTitle ? (
          <>
            <GroupAvatars participants={participants} size="medium" maxDisplay={3} />
            <div className="mr-3 flex-1 min-w-0 relative">
              <div className="flex items-center">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--shagram-text)' }}>محادثة جماعية</h2>
              </div>
              <p className="text-xs" style={{ color: 'var(--shagram-text-muted)' }}>{participants.length} أعضاء</p>
              {isCurrentlyTyping && (
                <div className="absolute right-0 top-0 z-10">
                  <SmartTypingIndicator
                    type={typingStyle}
                    customColor={typingColor}
                    userName={typingUserName}
                    textScale={textScale}
                    scaleFactor={iconScale}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={handleAvatarClick}
              className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold overflow-hidden ml-3 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={displayConversationName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayConversationName.charAt(0).toUpperCase()
              )}
            </button>
            <div className="flex-1 mr-2 min-w-0 relative">
              <button
                onClick={handleProfileClick}
                className="text-left block truncate"
              >
                <h2 className="text-sm font-semibold transition-colors truncate" style={{ color: 'var(--shagram-text)' }}>
                  {displayConversationName}
                </h2>
              </button>
              {isCurrentlyTyping && (
                <div className="absolute right-0 top-0 z-10">
                  <SmartTypingIndicator
                    type={typingStyle}
                    customColor={typingColor}
                    userName={typingUserName}
                    textScale={textScale}
                    scaleFactor={iconScale}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* أزرار الإعدادات */}
      <div className="flex items-center space-x-2 ml-4">
        {/* زر الرسائل المجدولة */}
        {scheduledMessagesCount > 0 && onScheduledMessagesClick && (
          <button
            onClick={onScheduledMessagesClick}
            className="relative p-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full bg-purple-100 dark:bg-purple-900/30"
            title="الرسائل المجدولة"
          >
            <Clock size={20} />
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
              {scheduledMessagesCount > 9 ? '9+' : scheduledMessagesCount}
            </span>
          </button>
        )}
        <button
          onClick={() => navigate('/settings/typing')}
          className="p-2 hover:opacity-80 focus:outline-none rounded-full"
          style={{ color: 'var(--shagram-text-muted)' }}
          title="تخصيص مؤشر الكتابة"
        >
          <PenTool size={20} />
        </button>
      </div>
    </div>
  );
};