import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface CallAlertData {
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  conversationId: string;
  callId: string;
}

interface GlobalCallAlertContextType {
  setOnOpenConversation: (callback: (conversationId: string, senderId?: string) => void) => void;
}

const GlobalCallAlertContext = createContext<GlobalCallAlertContextType | undefined>(undefined);

export function GlobalCallAlertProvider({ children }: { children: React.ReactNode }) {
  const [onOpenConversation, setOnOpenConversation] = useState<((conversationId: string, senderId?: string) => void) | null>(null);

  const handleConversationOpenedFromAlert = useCallback((event: CustomEvent) => {
    const { conversationId, source } = event.detail;
    console.log('📱 Conversation opened from alert:', { conversationId, source });

    // ✅ التحقق من صحة conversationId
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      console.warn('📱 Conversation opened from alert: Invalid conversationId, ignoring');
      return;
    }

    if (onOpenConversation) {
      onOpenConversation(conversationId);
    }
  }, [onOpenConversation]);

  const handleOpenConversationFromAlert = useCallback((event: CustomEvent) => {
    const { conversationId, senderId } = event.detail;
    console.log('📱 Open conversation from alert:', { conversationId, senderId });

    // ✅ التحقق من صحة conversationId قبل التنقل
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      console.warn('📱 Open conversation from alert: Invalid conversationId, ignoring');
      return;
    }

    if (onOpenConversation) {
      onOpenConversation(conversationId, senderId);
    }
  }, [onOpenConversation]);

  useEffect(() => {
    // Add event listeners for alert-related events
    window.addEventListener('conversation-opened-from-alert', handleConversationOpenedFromAlert as EventListener);
    window.addEventListener('open-conversation-from-alert', handleOpenConversationFromAlert as EventListener);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('conversation-opened-from-alert', handleConversationOpenedFromAlert as EventListener);
      window.removeEventListener('open-conversation-from-alert', handleOpenConversationFromAlert as EventListener);
    };
  }, [handleConversationOpenedFromAlert, handleOpenConversationFromAlert]);

  const value: GlobalCallAlertContextType = {
    setOnOpenConversation,
  };

  return (
    <GlobalCallAlertContext.Provider value={value}>
      {children}
    </GlobalCallAlertContext.Provider>
  );
}

export function useGlobalCallAlert() {
  const context = useContext(GlobalCallAlertContext);
  if (context === undefined) {
    throw new Error('useGlobalCallAlert must be used within a GlobalCallAlertProvider');
  }
  return context;
}
