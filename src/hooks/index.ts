/**
 * ملف التجميع الرئيسي لجميع الـ hooks المخصصة
 * ينظم ويصدر جميع الـ hooks في مكان واحد
 */

// === نظام الحماية والحفاظ ===
export { useModuleProtection } from './useModuleProtection';
export { useModuleIsolationManager } from './useModuleIsolationManager';

// === معالجة الصور المصغرة للفيديو ===
export { useVideoThumbnailSystem } from './useVideoThumbnailSystem';
export { useVideoThumbnailGeneration } from './useVideoThumbnailGeneration';

// === معالجة البيانات والرسائل ===
export { useMessageInput } from './useMessageInput';
export { useDisplayedMessages } from './useDisplayedMessages';
export { useMessageActions } from './useMessageActions';
export { useMessageHandlers } from './useMessageHandlers';
export { useMessageNavigation } from './useMessageNavigation';
export { useMessageSelection } from './useMessageSelection';
export { useMessageEdit } from './useMessageEdit';
export { useAIMessageHandler } from './aiChat/useAIMessageHandler';

// === إدارة المحادثات ===
export { useConversationDetails } from './useConversationDetails';
export { useConversationDisplay } from './useConversationDisplay';
export { useConversationListActions } from './useConversationListActions';
export { useArchivedConversations } from './useArchivedConversations';
export { useArchivedConversationListActions } from './useArchivedConversationListActions';

// === معالجة الوسائط والملفات ===
export { useAttachmentMenu } from './useAttachmentMenu';
export { default as useLongPress } from './useLongPress'; // يستخدم default export
export { useElementSize } from './useElementSize';
export { useNetworkStatus } from './useNetworkStatus';
export { useMediaResolutionQueue } from './useMediaResolutionQueue';

// === معالجة الصوت والفيديو ===
export { useRecording } from './useRecording';
export { useTyping } from './useTyping';

// === إدارة البيانات والمرشحات ===
export { useUsers } from './useUsers';
export { useLoadMessages } from './useLoadMessages';
export { useOptimisticMessages } from './useOptimisticMessages';
export { usePinnedMessage } from './usePinnedMessage';
export { useDeleteForEveryone } from './useDeleteForEveryone';
export { useForwardingSystem } from './useForwardingSystem';

export { useOptimizedCallAlert } from '../context/OptimizedCallAlertContext';
export { useAlertHandler } from './useAlertHandler';
export { useCallAlert } from './useCallAlert';

// === خدمات الشبكة والموقع ===
export { useSend } from './useSend';
export { useLocation } from './useLocation';
export { useChatHeader } from './useChatHeader';
export { useChatScroll } from './useChatScroll';
export { useEventListeners } from './useEventListeners';

// === خدمات أخرى ===
export { useGlobalUIStore } from '../stores/useGlobalUIStore';

// === كائنات ثابتة ===
export { videoThumbnailSystem } from './useVideoThumbnailSystem';