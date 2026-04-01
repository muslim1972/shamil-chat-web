import { useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useMessageInfo } from './useMessageInfo';
import { useAttachmentMenu } from './useAttachmentMenu';
import { useMessageInput } from './useMessageInput';
import { useChatBackground } from '../context/ChatBackgroundContext';

/**
 * Hook مركب لإدارة جميع حالات الدردشة (State Management)
 * 
 * يجمع 8 هوكات منفصلة في هوك واحد:
 * - useNetworkStatus
 * - useChatBackground  
 * - useMessageInfo
 * - useAttachmentMenu
 * - useMessageInput
 * - useState (editing)
 * 
 * **الهدف**: تقليل عدد الهوكات في ChatScreen من 25+ إلى ~10
 */
export function useChatState() {
    // Network & UI State
    const { isOnline } = useNetworkStatus();
    const { background } = useChatBackground();

    // Message Info Dialog State
    const {
        showMessageInfo,
        selectedMessageForInfo,
        handleShowMessageInfo,
        handleCloseMessageInfo
    } = useMessageInfo();

    // Attachment Menu State
    const {
        isAttachmentMenuOpen,
        openAttachmentMenu,
        closeAttachmentMenu,
        toggleAttachmentMenu
    } = useAttachmentMenu();

    // Message Input State
    const {
        newMessage,
        setNewMessage,
        isSending,
        setIsSending,
        inputRef,
        clearMessage,
        focusInput
    } = useMessageInput();

    // Editing State (local)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    // Reply State
    const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);

    return {
        // Network & UI
        isOnline,
        background,

        // Message Info Dialog
        showMessageInfo,
        selectedMessageForInfo,
        handleShowMessageInfo,
        handleCloseMessageInfo,

        // Attachment Menu
        isAttachmentMenuOpen,
        openAttachmentMenu,
        closeAttachmentMenu,
        toggleAttachmentMenu,

        // Message Input
        newMessage,
        setNewMessage,
        isSending,
        setIsSending,
        inputRef,
        clearMessage,
        focusInput,

        // Editing
        editingMessageId,
        setEditingMessageId,
        isEditingMessage: editingMessageId !== null, // computed

        // Reply
        replyingToMessage,
        setReplyingToMessage,
    };
}
