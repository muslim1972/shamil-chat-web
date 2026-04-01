import { useCallback } from 'react';
import type { Message } from '../types';

interface MessageHandlersProps {
  isSelectionMode: boolean;
  toggleSelectedItem: (item: Message, type: 'message') => void;
  setSelectionMode: (mode: 'messages' | null) => void;
  clearSelection: () => void;
  setReplyingToMessage: (message: Message | null) => void; // ✅ جديد
  inputRef: React.RefObject<HTMLTextAreaElement | null>; // ✅ جديد
  userId?: string; // ✅ جديد
  toggleReaction?: (messageId: string, userId: string, emoji: string) => Promise<void>; // ✅ جديد
}

export function useMessageHandlers({
  isSelectionMode,
  toggleSelectedItem,
  setSelectionMode,
  clearSelection,
  setReplyingToMessage, // ✅ جديد
  inputRef, // ✅ جديد
  userId, // ✅ جديد
  toggleReaction, // ✅ جديد
}: MessageHandlersProps) {
  const handleMessageClick = useCallback((message: Message, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();

    // ✅ في وضع التأشير، أي نقرة تضيف/تزيل الرسالة
    if (isSelectionMode) {
      toggleSelectedItem(message, 'message');
    }
  }, [isSelectionMode, toggleSelectedItem]);

  const handleMessageLongPress = useCallback((_target: EventTarget | null, message: Message) => {
    toggleSelectedItem(message, 'message');
    if (!isSelectionMode) {
      setSelectionMode('messages');
    }
  }, [isSelectionMode, toggleSelectedItem, setSelectionMode]);

  // ✅ جديد: معالج النقر المزدوج لإضافة تفاعل ❤️ بشكل سريع
  const handleMessageDoubleClick = useCallback(async (message: Message, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();

    // إذا كان في وضع التأشير، نتجاهل النقر المزدوج
    if (isSelectionMode) return;

    // إضافة تفاعل ❤️ بشكل سريع
    if (toggleReaction && userId) {
      await toggleReaction(message.id, userId, '❤️');
    }
  }, [isSelectionMode, toggleReaction, userId]);

  const handleContainerClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // ✅ إصلاح المشكلة 3: إلغاء التأشير بالنقر في أي مكان فارغ
    if (!isSelectionMode) return;

    const target = e.target as HTMLElement;
    // تحقق من أن النقر ليس على رسالة أو أي عنصر داخلها
    const clickedOnMessage = target.closest('[data-id]');
    const clickedOnButton = target.closest('button');
    const clickedOnInput = target.closest('input, textarea');

    // إذا لم يتم النقر على رسالة أو زر أو حقل إدخال، إلغي التأشير
    if (!clickedOnMessage && !clickedOnButton && !clickedOnInput) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  return {
    handleMessageClick,
    handleMessageLongPress,
    handleMessageDoubleClick, // ✅ جديد
    handleContainerClick,
  };
}