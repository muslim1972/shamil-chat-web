import React, { createContext, useState, useContext, useMemo } from 'react';
import type { Message } from '../types';

export type ForwardingMode = 'block' | 'direct' | null;

interface ForwardingContextType {
  isForwarding: boolean;
  messagesToForward: Message[];
  forwardingMode: ForwardingMode;
  startForwarding: (messages: Message[], mode: ForwardingMode) => void;
  completeForwarding: () => void;
}

const ForwardingContext = createContext<ForwardingContextType | undefined>(undefined);

export const ForwardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messagesToForward, setMessagesToForward] = useState<Message[]>([]);
  const [forwardingMode, setForwardingMode] = useState<ForwardingMode>(null);

  const startForwarding = (messages: Message[], mode: ForwardingMode) => {
    // If any message is a forwarded_block, expand its JSON content into the forwarded messages
    const expanded: Message[] = [];
    messages.forEach((msg) => {
      // --- ✅ الإصلاح: نسخ خصائص الرسالة الأصلية بالكامل دون أي تعديل ---
      // هذا يضمن الحفاظ على message_type (مثل 'location') وجميع البيانات الأخرى.
      expanded.push({
        id: msg.id,
        conversationId: msg.conversationId,
        text: msg.text,
        senderId: (msg as any).senderId || (msg as any).sender_id || null,
        timestamp: msg.timestamp,
        message_type: msg.message_type,
        caption: msg.caption,
        media_metadata: msg.media_metadata,
        content: msg.content,
      } as Message);
    });

    setMessagesToForward(expanded as Message[]);
    setForwardingMode(mode);
  };

  const completeForwarding = () => {
    setMessagesToForward([]);
    setForwardingMode(null);
  };

  const value = useMemo(() => ({
    isForwarding: messagesToForward.length > 0,
    messagesToForward,
    forwardingMode,
    startForwarding,
    completeForwarding,
  }), [messagesToForward, forwardingMode]);

  return (
    <ForwardingContext.Provider value={value}>
      {children}
    </ForwardingContext.Provider>
  );
};

export const useForwarding = () => {
  const context = useContext(ForwardingContext);
  if (context === undefined) {
    throw new Error('useForwarding must be used within a ForwardingProvider');
  }
  return context;
};