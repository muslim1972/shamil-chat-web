import React from 'react';
import type { Message } from '../types';
import { shareMediaFile } from '../utils/downloadUtils';

interface UseActionsProcessorArgs {
    lastTriggeredAction: { type: string } | null;
    selectedMessages: Message[];
    userId?: string;
    handleDeleteForMe: () => void;
    handleDeleteForEveryone: () => void;
    handlePinMessage: () => void;
    handleForwardMessages: () => void;
    handleShowMessageInfo: (message: Message) => void;
    handleEditMessage: () => void;
    handleReplyMessage: () => void;
    clearSelection: () => void;
    clearLastTriggeredAction: () => void;
}

/**
 * Hook لمعالجة الأكشن المحفزة من الـ Footer
 * 
 * يستمع لـ lastTriggeredAction ويقوم بتنفيذ الأكشن المناسب:
 * - deleteForMe / deleteForAll
 * - pin
 * - forward
 * - info
 * - edit
 * - share (للميديا فقط)
 * - reply
 */
export function useActionsProcessor({
    lastTriggeredAction,
    selectedMessages,
    userId,
    handleDeleteForMe,
    handleDeleteForEveryone,
    handlePinMessage,
    handleForwardMessages,
    handleShowMessageInfo,
    handleEditMessage,
    handleReplyMessage,
    clearSelection,
    clearLastTriggeredAction
}: UseActionsProcessorArgs) {

    React.useEffect(() => {
        if (!lastTriggeredAction) return;

        const actions: { [key: string]: () => void } = {
            deleteForMe: handleDeleteForMe,
            deleteForAll: handleDeleteForEveryone,
            deleteConversation: handleDeleteForMe,
            deleteConversationForAll: handleDeleteForEveryone,
            pin: handlePinMessage,
            forward: handleForwardMessages,
            info: () => {
                if (selectedMessages.length === 1) {
                    handleShowMessageInfo(selectedMessages[0]);
                    clearSelection();
                }
            },
            edit: () => {
                if (selectedMessages.length === 1 && selectedMessages[0].senderId === userId) {
                    handleEditMessage();
                    clearSelection();
                }
            },
            share: async () => {
                // مشاركة الميديا المحددة
                const mediaTypes = ['audio', 'image', 'video', 'document'];
                const mediaMessages = selectedMessages.filter(msg =>
                    msg.message_type && mediaTypes.includes(msg.message_type)
                );

                if (mediaMessages.length > 0) {
                    try {
                        // مشاركة أول ملف ميديا (يمكن توسيعه لاحقاً لمشاركة متعددة)
                        const firstMedia = mediaMessages[0];
                        const mediaUrl = (firstMedia as any).media_url ||
                            (firstMedia as any).local_media_url ||
                            (firstMedia as any).text; // للوثائق

                        if (mediaUrl) {
                            await shareMediaFile(mediaUrl || '', 'مشاركة من تطبيق شامل');
                        }
                    } catch (error) {
                        console.error('فشل في مشاركة الميديا:', error);
                    }
                }
                clearSelection();
            },
            reply: handleReplyMessage,
        };

        actions[lastTriggeredAction.type]?.();
        clearLastTriggeredAction();
    }, [
        lastTriggeredAction,
        handleDeleteForMe,
        handleDeleteForEveryone,
        handlePinMessage,
        handleForwardMessages,
        handleShowMessageInfo,
        clearLastTriggeredAction,
        selectedMessages,
        clearSelection,
        handleEditMessage,
        handleReplyMessage,
        userId
    ]);
}
