import { useState, useCallback } from 'react';
import type { Message } from '../types';

interface MessageInfo {
  showMessageInfo: boolean;
  selectedMessageForInfo: Message | null;
  handleShowMessageInfo: (message: Message) => void;
  handleCloseMessageInfo: () => void;
}

export function useMessageInfo(): MessageInfo {
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState<Message | null>(null);

  const handleShowMessageInfo = useCallback((message: Message) => {
    setSelectedMessageForInfo(message);
    setShowMessageInfo(true);
  }, []);

  const handleCloseMessageInfo = useCallback(() => {
    setShowMessageInfo(false);
    setSelectedMessageForInfo(null);
  }, []);

  return {
    showMessageInfo,
    selectedMessageForInfo,
    handleShowMessageInfo,
    handleCloseMessageInfo,
  };
}