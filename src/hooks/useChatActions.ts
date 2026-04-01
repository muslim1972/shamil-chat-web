import { useCallback } from 'react';
import { useTyping } from './useTyping';
import { useRecording } from './useRecording';
import { useLocation } from './useLocation';
import { useMessageHandlers } from './useMessageHandlers';
import { useMessageActions } from './useMessageActions';
import { useMessageEdit } from './useMessageEdit';
import type { Message } from '../types';

interface UseChatActionsProps {
    conversationId: string;
    userId?: string;
    isSelectionMode: boolean;
    toggleSelectedItem: (item: Message, type: 'message') => void;
    setSelectionMode: (mode: 'messages' | null) => void;
    clearSelection: () => void;
    selectedMessages: Message[];
    setNewMessage: (message: string) => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    isEditingMessage: boolean;
    setIsEditingMessage: (editing: boolean) => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    refreshMessages: () => Promise<void>;
    sendText: (text: string) => Promise<void>;
    sendAudio: (blob: Blob, duration: number, caption?: string) => Promise<void>;
    // ✅ إضافة للحذف والتثبيت
    removeMessages: (ids: string[]) => Promise<void>;
    setOptimisticMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setPinnedMessage: (message: Message | null) => void;
    setReplyingToMessage: (message: Message | null) => void;
}

/**
 * Hook مركب لإدارة جميع أكشن الدردشة (Actions)
 * 
 * يجمع 6 هوكات منفصلة في هوك واحد:
 * - useTyping
 * - useRecording
 * - useLocation
 * - useMessageHandlers
 * - useMessageActions
 * - useMessageEdit
 * 
 * **الهدف**: تبسيط ChatScreen وتحسين التنظيم
 */
export function useChatActions({
    conversationId,
    userId,
    isSelectionMode,
    toggleSelectedItem,
    setSelectionMode,
    clearSelection,
    selectedMessages,
    setNewMessage,
    inputRef,
    isEditingMessage,
    setIsEditingMessage,
    editingMessageId,
    setEditingMessageId,
    refreshMessages,
    sendText,
    sendAudio,
    removeMessages,
    setOptimisticMessages,
    setPinnedMessage,
    setReplyingToMessage,
}: UseChatActionsProps) {

    // Typing Indicators
    const { typingUsers, isTyping, emitTyping, emitTypingStop } = useTyping(conversationId, userId);

    // Audio Recording
    const sendAudioMessage = useCallback(async (audioBlob: Blob, duration: number, caption?: string) => {
        await sendAudio(audioBlob, duration, caption);
    }, [sendAudio]);

    const {
        isRecording,
        recordingDuration,
        handleStartRecording,
        handleCancelRecording,
        handleSendRecording
    } = useRecording({ sendAudioMessage });

    // Location Sharing
    const { handleSendLocation } = useLocation({ sendMessage: sendText });

    // Message Handlers (click, long press, double click, container click)
    const { handleMessageClick, handleMessageLongPress, handleMessageDoubleClick, handleContainerClick } = useMessageHandlers({
        isSelectionMode,
        toggleSelectedItem,
        setSelectionMode,
        clearSelection,
        setReplyingToMessage, // ✅ جديد
        inputRef, // ✅ جديد
    });

    // Message Actions (delete, forward, pin, etc.)
    const {
        handleForwardMessages,
        handlePinMessage,
        handleUnpinMessage,
        handleDeleteForMe,
        handleDeleteForEveryone
    } = useMessageActions({
        conversationId,
        userId,
        selectedMessages,
        clearSelection,
        removeMessages,
        setOptimisticMessages,
        setPinnedMessage,
    });

    // Message Edit
    const { handleEditMessage, handleCancelEdit, handleSaveEditWithOptimisticUpdate } = useMessageEdit(
        selectedMessages[0] || null,
        setNewMessage,
        inputRef,
        isEditingMessage,
        setIsEditingMessage,
        editingMessageId,
        setEditingMessageId,
        refreshMessages
    );

    // ✅ Reply Handler
    const handleReplyMessage = useCallback(() => {
        if (selectedMessages.length === 1) {
            setReplyingToMessage(selectedMessages[0]);
            clearSelection();
            inputRef.current?.focus();
        }
    }, [selectedMessages, setReplyingToMessage, clearSelection, inputRef]);

    return {
        // Typing
        typingUsers,
        isTyping,
        emitTyping,
        emitTypingStop,

        // Recording
        isRecording,
        recordingDuration,
        handleStartRecording,
        handleCancelRecording,
        handleSendRecording,

        // Location
        handleSendLocation,

        // Handlers
        handleMessageClick,
        handleMessageLongPress,
        handleMessageDoubleClick, // ✅ جديد
        handleContainerClick,

        // Actions
        handleForwardMessages,
        handlePinMessage,
        handleUnpinMessage,
        handleDeleteForMe,
        handleDeleteForEveryone,

        // Edit
        handleEditMessage,
        handleCancelEdit,
        handleSaveEditWithOptimisticUpdate,

        // Reply
        handleReplyMessage,
    };
}
