import React, { useState, useRef } from 'react';

interface MessageInputState {
  newMessage: string;
  setNewMessage: (message: string) => void;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  isEditingMessage: boolean;
  setIsEditingMessage: (editing: boolean) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  clearMessage: () => void;
  focusInput: () => void;
}

export function useMessageInput(): MessageInputState {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const clearMessage = () => setNewMessage('');

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return {
    newMessage,
    setNewMessage,
    isSending,
    setIsSending,
    isEditingMessage,
    setIsEditingMessage,
    editingMessageId,
    setEditingMessageId,
    inputRef,
    clearMessage,
    focusInput,
  };
}