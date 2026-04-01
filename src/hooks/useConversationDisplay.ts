import { useMemo } from 'react';
import type { ConversationDetailsData } from './useConversationDetails';
import type { Message } from '../types';

interface ConversationDisplay {
  displayConversationName: string;
  avatar_url?: string;
  is_group: boolean;
}

export function useConversationDisplay(
  conversationDetails: ConversationDetailsData | undefined,
  cachedMessages: Message[]
): ConversationDisplay {
  const displayConversationDetails = useMemo(() => {
    // استخدم بيانات المحادثة المجلوبة مباشرة
    if (conversationDetails) {
      return {
        name: conversationDetails.name || 'محادثة',
        avatar_url: conversationDetails.avatar_url,
        is_group: conversationDetails.is_group || false
      };
    }

    // خلفي: استخدام بيانات الرسالة الأولى
    const firstMessage = cachedMessages[0];
    if (!firstMessage) {
      return {
        name: 'محادثة',
        avatar_url: undefined,
        is_group: false
      };
    }

    // استخراج بيانات المرسل من الرسالة
    const sender = firstMessage.sender;
    const isGroup = (firstMessage as any).isGroupChat || false;

    // للرسائل الفردية، اعرض اسم المرسل
    // للمحادثات الجماعية، اعرض اسم المحادثة
    const conversationName = isGroup
      ? 'محادثة جماعية' // سيتم جلب اسم المحادثة من مكان آخر لاحقاً
      : (sender?.username || 'مستخدم مجهول');

    return {
      name: conversationName,
      avatar_url: sender?.avatar_url,
      is_group: isGroup
    };
  }, [cachedMessages, conversationDetails]);

  return {
    displayConversationName: displayConversationDetails.name || 'محادثة',
    avatar_url: displayConversationDetails.avatar_url,
    is_group: displayConversationDetails.is_group
  };
}