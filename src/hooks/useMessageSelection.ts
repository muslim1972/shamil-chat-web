import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Message } from '../types';

export const useMessageSelection = (
  messages: Message[]
) => {
  const navigate = useNavigate();
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // Check if there are text messages that can be copied
  const canCopy = useMemo(() => {
    if (selectedMessages.length === 0) return false;
    return messages.some(msg => selectedMessages.includes(msg.id) && msg.message_type === 'text');
  }, [selectedMessages, messages]);

  const isSelectionMode = selectedMessages.length > 0;

  const handleLongPressMessage = useCallback((message: Message) => {
    setSelectedMessages([message.id]);
  }, []);

  const handlePressMessage = useCallback((message: Message) => {
    setSelectedMessages(currentSelected =>
      currentSelected.includes(message.id)
        ? currentSelected.filter(id => id !== message.id)
        : [...currentSelected, message.id]
    );
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectedMessages([]);
  }, []);

  const handleCopyMessages = useCallback(async () => {
    const textToCopy = messages
      .filter(msg => selectedMessages.includes(msg.id) && msg.message_type === 'text')
      .map(msg => msg.text)
      .join('\n');

    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      toast.success('تم نسخ الرسائل إلى الحافظة.');
    } else {
      toast.error('لا يمكن نسخ الصور، تم تحديد رسائل غير نصية فقط.');
    }
    handleCancelSelection();
  }, [selectedMessages, handleCancelSelection]);

  const handleDeleteMessages = useCallback(() => {
    // Implementation for delete messages
    handleCancelSelection();
  }, [handleCancelSelection]);

  const handleForwardMessages = useCallback(() => {
    // Check if there's a mix of media and text messages
    const hasTextMessages = messages.some(msg => 
      selectedMessages.includes(msg.id) && msg.message_type === 'text'
    );
    const hasMediaMessages = messages.some(msg => 
      selectedMessages.includes(msg.id) && 
      msg.message_type !== 'text' && 
      msg.message_type !== 'forwarded_block'
    );

    if (hasTextMessages && hasMediaMessages) {
      toast.error('لا يمكن إعادة توجيه الوسائط المتعددة مع النصوص في أمر واحد');
      handleCancelSelection();
      return;
    }

    // Navigate to conversation list with selected messages
    navigate('/conversations', { state: { selectedMessages } });
    handleCancelSelection();
  }, [messages, selectedMessages, navigate, handleCancelSelection]);

  return {
    selectedMessages,
    isSelectionMode,
    canCopy,
    handleLongPressMessage,
    handlePressMessage,
    handleCancelSelection,
    handleCopyMessages,
    handleDeleteMessages,
    handleForwardMessages
  };
};
