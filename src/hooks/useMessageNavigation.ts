import { useCallback } from 'react';

interface MessageNavigation {
  scrollToMessage: (messageId: string) => void;
  scrollToMessageWithHighlight: (messageId: string) => void;
}

export function useMessageNavigation(): MessageNavigation {
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const scrollToMessageWithHighlight = useCallback((messageId: string) => {
    const messageElement = document.querySelector(`[data-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  }, []);

  return {
    scrollToMessage,
    scrollToMessageWithHighlight,
  };
}