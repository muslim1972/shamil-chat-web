import React, { Suspense, useState } from 'react';
// ✅ Lazy load MessageInfoDialog - يُستخدم فقط عند عرض معلومات رسالة
const MessageInfoDialog = React.lazy(() => import('./chat/MessageInfoDialog').then(m => ({ default: m.MessageInfoDialog })));
import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForwarding } from '../context/ForwardingContext';
import { useConversationMessagesCache } from '../cache/hooks/useConversationMessagesCache';
import { useConversationDetails } from '../hooks/useConversationDetails';
import { usePinnedMessage } from '../hooks/usePinnedMessage';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { MessageForm } from './chat/MessageForm';
import { PinnedMessageBanner } from './chat/PinnedMessageBanner';
import { UnreadMessagesButton } from './chat/UnreadMessagesButton';
import 'react-toastify/dist/ReactToastify.css';
import { useGlobalUIStore } from '../stores/useGlobalUIStore';
import type { Message } from '../types';
import { useSend } from '../hooks/useSend';
import { useDisplayedMessages } from '../hooks/useDisplayedMessages';
import { useChatScroll } from '../hooks/useChatScroll';
import { useElementSize } from '../hooks/useElementSize';
import { useMessageNavigation } from '../hooks/useMessageNavigation';
import { useConversationDisplay } from '../hooks/useConversationDisplay';
import { useOptimisticMessages } from '../hooks/useOptimisticMessages';
import { useEventListeners } from '../hooks/useEventListeners';
import { useLoadMessages } from '../hooks/useLoadMessages';
import { useAIMessageHandler } from '../hooks/aiChat/useAIMessageHandler';
import { useOptimizedCallAlert } from '../context/OptimizedCallAlertContext';
// ✅ Composite Hooks - تقليل من 25+ hooks إلى ~12
import { useChatState } from '../hooks/useChatState';
import { useChatActions } from '../hooks/useChatActions';
import { useSendMessage } from '../hooks/useSendMessage';
import { useActionsProcessor } from '../hooks/useActionsProcessor';
// ✅ Hook للتعامل مع الكيبورد على الأجهزة القديمة
import { useKeyboardLayout } from '../hooks/useKeyboardLayout';
import { useTheme } from '../context/ThemeContext';
import { useAIChatWithFiles } from '../hooks/aiChat/useAIChatWithFiles';
import { useShamliInteraction } from '../hooks/useShamliInteraction';
import { useEffect } from 'react';
// ✅ Scheduled Messages
import { ScheduleMessageSheet, ScheduledMessagesList } from './schedule';
import { useScheduledMessages } from '../hooks/useScheduledMessages';
import type { CreateScheduledMessageParams } from '../types/scheduledMessages.types';
import { toast } from 'react-hot-toast';

interface ChatInterfaceProps {
  conversationId: string;
  onSendAlert?: () => Promise<boolean | undefined>;
}

interface ChatScreenProps {
  conversationId: string;
  onSendAlert?: () => Promise<boolean>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversationId, onSendAlert }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAlertButtonClick = useCallback(() => {
    if (onSendAlert && user) {
      onSendAlert();
    }
  }, [onSendAlert, user]);

  // ✅ تم إزالة logs التتبع لتحسين الأداء

  const { startForwarding } = useForwarding();

  const {
    selectionMode,
    selectedItems,
    setSelectionMode,
    clearSelection,
    toggleSelectedItem,
    lastTriggeredAction,
    clearLastTriggeredAction
  } = useGlobalUIStore();

  const isSelectionMode = selectionMode !== 'none';
  const selectedMessages = selectedItems as Message[];

  // ✅ Composite State Hook - جميع حالات الدردشة في هوك واحد
  const {
    isOnline,
    background,
    showMessageInfo,
    selectedMessageForInfo,
    handleShowMessageInfo,
    handleCloseMessageInfo,
    isAttachmentMenuOpen,
    openAttachmentMenu,
    closeAttachmentMenu,
    toggleAttachmentMenu,
    newMessage,
    setNewMessage,
    isSending,
    setIsSending,
    inputRef,
    clearMessage,
    focusInput,
    editingMessageId,
    setEditingMessageId,
    isEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
  } = useChatState();

  // const { colorScheme } = useTheme();

  // ✅ تم نقل التعامل مع الكيبورد إلى capacitor.config.ts (resize: 'body')
  // useKeyboardLayout لم يعد مطلوباً
  useKeyboardLayout(inputRef); // للإبقاء على scrollToInput

  const { scrollToMessage } = useMessageNavigation();

  const formRef = React.useRef<HTMLDivElement>(null);
  const { height: formHeight } = useElementSize(formRef as any);

  // Send and messaging hooks - Updated to pass callbacks
  const {
    isUploading,
    uploadProgress,
    sendText,
    sendAudio,
    sendImageFile,
    pickAndSendMedia: pickAndSendMediaHook,
    optimisticMessages,
    setOptimisticMessages,
  } = useSend(conversationId, user);

  const {
    messages: cachedMessages,
    loading: loadingCached,
    // isComplete removed - not used ✅
    hasMore,
    loadOlder,
    resolveMediaNow,
    removeMessages,
    refreshMessages
  } = useConversationMessagesCache({
    conversationId: conversationId,
    userId: user?.id || ''
  });

  const displayedMessages = useDisplayedMessages(cachedMessages, optimisticMessages);

  // ✅ تم إزالة logs التتبع لتحسين الأداء

  // Optimistic messages management - MUST come before other hooks that depend on displayedMessages
  useOptimisticMessages({ cachedMessages, setOptimisticMessages });

  const {
    containerRef,
    messagesEndRef,
    scrollToBottom,
    unreadCount,
    showUnread: hookShowUnread,
    clearUnread,
    onBeforeSendLikelyMedia,
    // requestScrollAfterSend removed - not used ✅
    // isNearBottomAuto removed - not used ✅
    shouldReserveBottom,
  } = useChatScroll({ conversationId, displayedMessages });

  // Conversation data hooks
  const { data: conversationDetails } = useConversationDetails(conversationId, user?.id);
  const { displayConversationName, avatar_url } = useConversationDisplay(conversationDetails || undefined, cachedMessages);
  // is_group removed - not used in this component ✅
  const { pinnedMessage, setPinnedMessage } = usePinnedMessage(conversationId);

  // AI Message Handler - للرد التلقائي على رسائل AI
  useAIMessageHandler({ conversationId, isActive: true });

  // AI Chat with Files - لإضافة دعم الملفات (صور + نصوص + PDF) للمحادثات AI
  const aiFileSupport = useAIChatWithFiles(conversationId, user?.id);

  // ✨ Shamli Integration: تسجيل التفاعلات في المحادثات
  const { logInteraction } = useShamliInteraction('conversations');

  // تسجيل تفاعل عند فتح المحادثة (مرة واحدة)
  useEffect(() => {
    // تحديد المستخدم الآخر في المحادثة الفردية
    if (conversationDetails && !conversationDetails.is_group && user) {
      const otherUserId = conversationDetails.otherUserId;
      if (otherUserId) {
        logInteraction(otherUserId, 'message', 1); // وزن خفيف لمجرد الفتح
      }
    }
  }, [conversationId]); // تنفذ عند تغيير المحادثة فقط

  // 📅 Scheduled Messages - جدولة الرسائل
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isScheduledListOpen, setIsScheduledListOpen] = useState(false);
  const {
    scheduledMessages,
    scheduleMessage,
    deleteScheduledMessage,
    loading: isScheduledLoading,
    refresh: refreshScheduledMessages
  } = useScheduledMessages(conversationId, user?.id || null);

  // عدد الرسائل المعلقة فقط
  const pendingMessagesCount = scheduledMessages.filter(m => m.status === 'pending').length;

  // ✅ تحديث قائمة الرسائل المجدولة عند وصول رسائل جديدة
  // لأن الرسالة المجدولة عند إرسالها تصبح رسالة عادية في المحادثة
  const previousMessageCount = React.useRef(displayedMessages.length);
  React.useEffect(() => {
    // إذا زاد عدد الرسائل (رسالة جديدة وصلت)
    if (displayedMessages.length > previousMessageCount.current) {
      // نحدث قائمة الرسائل المجدولة للتأكد من إزالة المرسلة
      refreshScheduledMessages();
    }
    previousMessageCount.current = displayedMessages.length;
  }, [displayedMessages.length, refreshScheduledMessages]);

  const handleScheduleClick = useCallback(() => {
    if (!newMessage.trim()) {
      toast.error('اكتب رسالة أولاً لجدولتها');
      return;
    }
    setIsScheduleSheetOpen(true);
  }, [newMessage]);

  const handleScheduleMessage = useCallback(async (params: CreateScheduledMessageParams) => {
    await scheduleMessage(params);
    setNewMessage(''); // تفريغ حقل الإدخال
    setIsScheduleSheetOpen(false);
  }, [scheduleMessage, setNewMessage]);

  const handleDeleteScheduledMessage = useCallback(async (messageId: string) => {
    await deleteScheduledMessage(messageId);
  }, [deleteScheduledMessage]);

  // State للرسالة المحررة حالياً
  const [editingScheduledMessage, setEditingScheduledMessage] = useState<any>(null);

  const handleEditScheduledMessage = useCallback((message: any) => {
    setEditingScheduledMessage(message);
    setIsScheduleSheetOpen(true);
  }, []);

  // دالة تحديث الرسالة المجدولة
  const { updateScheduledMessage } = useScheduledMessages(conversationId, user?.id || null);

  const handleUpdateScheduledMessage = useCallback(async (messageId: string, updates: any) => {
    await updateScheduledMessage(messageId, updates);
    setEditingScheduledMessage(null);
  }, [updateScheduledMessage]);

  const removeMessagesAsync = async (ids: string[]) => {
    await removeMessages(ids);
  };

  // ✅ Composite Actions Hook - جميع أكشن ال دردشة في هوك واحد
  const {
    typingUsers,
    isTyping,
    emitTyping,
    emitTypingStop,
    isRecording,
    recordingDuration,
    handleStartRecording,
    handleCancelRecording,
    handleSendRecording,
    handleSendLocation,
    handleMessageClick,
    handleMessageLongPress,
    handleMessageDoubleClick, // ✅ جديد
    handleContainerClick,
    handleForwardMessages,
    handlePinMessage,
    handleUnpinMessage,
    handleDeleteForMe,
    handleDeleteForEveryone,
    handleEditMessage,
    handleCancelEdit,
    handleSaveEditWithOptimisticUpdate,
    handleReplyMessage,
  } = useChatActions({
    conversationId,
    userId: user?.id,
    isSelectionMode,
    toggleSelectedItem: (item: Message) => toggleSelectedItem(item, 'message'),
    setSelectionMode: (mode: 'messages' | null) => setSelectionMode(mode || 'none'),
    clearSelection,
    selectedMessages,
    setNewMessage,
    inputRef,
    isEditingMessage,
    setIsEditingMessage: () => { }, // managed by useChatState
    editingMessageId,
    setEditingMessageId,
    refreshMessages: async () => await refreshMessages(),
    sendText,
    sendAudio,
    removeMessages: removeMessagesAsync,
    setOptimisticMessages,
    setPinnedMessage,
    setReplyingToMessage,
  });

  const { handleLoadOlder } = useLoadMessages({ loadOlder, containerRef });

  // Send message handler
  const { handleSendMessage } = useSendMessage({
    conversationId,
    isOnline,
    userId: user?.id,
    newMessage,
    editingMessageId,
    displayedMessages,
    handleSaveEditWithOptimisticUpdate,
    handleCancelEdit,
    clearMessage,
    focusInput,
    emitTypingStop,
    sendText,
    replyingToMessage,
    onReplySent: () => setReplyingToMessage(null),
  });
  const sendHandler = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[🔍 SEND HANDLER DEBUG]', {
      isAIConversation: aiFileSupport.isAIConversation,
      hasFiles: aiFileSupport.hasFiles,
      filesCount: aiFileSupport.selectedFiles?.length || 0,
      newMessage
    });
    if (aiFileSupport.isAIConversation) {
      console.log('[🔍 SEND HANDLER DEBUG] Using AI handler...');
      // Send text and files via AI handler
      aiFileSupport.handleSend(newMessage);
      setNewMessage('');
    } else {
      console.log('[🔍 SEND HANDLER DEBUG] Using regular handler...');
      handleSendMessage(e);
    }
  };

  const handleBack = () => {
    clearSelection(); // مسح التحديد عند الخروج
    navigate('/conversations');
  };

  // Event listeners
  useEventListeners({
    startForwarding,
    navigate,
    clearSelection,
    resolveMediaNow,
  });

  // Actions processing
  useActionsProcessor({
    lastTriggeredAction,
    selectedMessages,
    userId: user?.id,
    handleDeleteForMe,
    handleDeleteForEveryone,
    handlePinMessage,
    handleForwardMessages,
    handleShowMessageInfo,
    handleEditMessage,
    handleReplyMessage,
    clearSelection,
    clearLastTriggeredAction
  });

  // Send media handler
  const pickAndSendMedia = React.useCallback(async (type: 'image' | 'video' | 'audio' | 'document') => {
    const duration = type === 'image' ? 1000 : type === 'video' ? 2000 : 800;
    onBeforeSendLikelyMedia(duration);
    await pickAndSendMediaHook(type);
    requestAnimationFrame(() => { scrollToBottom(true); });
  }, [pickAndSendMediaHook, onBeforeSendLikelyMedia, scrollToBottom]);

  return (
    <div
      className="flex flex-col h-full relative"
      onClick={handleContainerClick}
      style={{
        background: 'var(--app-background)'
        // ✅ تم نقل التعامل مع الكيبورد إلى capacitor.config.ts (resize: 'body')
      }}
    >
      <ChatHeader
        displayConversationName={displayConversationName}
        onBack={handleBack}
        avatar_url={avatar_url}
        conversationId={conversationId}
        isTyping={isTyping}
        typingUsers={typingUsers}
        scheduledMessagesCount={pendingMessagesCount}
        onScheduledMessagesClick={() => setIsScheduledListOpen(true)}
      />

      {/* Pinned Message Section */}
      <PinnedMessageBanner
        pinnedMessage={pinnedMessage}
        userId={user?.id}
        onScrollToMessage={scrollToMessage}
        onUnpinMessage={handleUnpinMessage}
      />

      <div
        onClick={handleContainerClick} // ✅ ربط handler لإلغاء التأشير
        className={`relative flex-1 overflow-y-auto overflow-x-hidden p-4 pb-0 flex flex-col min-h-0 hide-scrollbar chat-bg-${background}`}
        id="messages-container"
        ref={containerRef}
      >
        {hasMore && (
          <div className="w-full flex justify-center mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleLoadOlder(); }}
              className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              تحميل المزيد
            </button>
          </div>
        )}
        {(loadingCached && !cachedMessages?.length) ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل الرسائل...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-end">
            <MessageList
              messages={displayedMessages}
              loading={loadingCached}
              messagesEndRef={messagesEndRef}
              onMessageLongPress={handleMessageLongPress}
              selectedMessages={selectedMessages}
              onMessageClick={handleMessageClick}
              onMessageDoubleClick={handleMessageDoubleClick} // ✅ جديد
            />
            {shouldReserveBottom() && (
              <div style={{ height: Math.max(formHeight + 8, 56) }} />
            )}
          </div>
        )}
      </div>

      {/* Unread Messages Button */}
      <UnreadMessagesButton
        showUnread={hookShowUnread}
        unreadCount={unreadCount}
        formHeight={formHeight}
        onClearUnread={clearUnread}
        onScrollToBottom={scrollToBottom}
      />

      <div ref={formRef} className={`relative border-t ${isSending ? 'opacity-75' : ''}`} style={{ background: 'var(--message-form-bg)', borderColor: 'var(--primary-light)' }}>

        {isSending && <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">جاري الإرسال...</div>}
        <MessageForm
          newMessage={newMessage}
          setNewMessage={(v: string) => {
            setNewMessage(v);
            if (v.trim()) {
              emitTyping();
              clearUnread();
              requestAnimationFrame(() => scrollToBottom(true));
            } else {
              emitTypingStop();
            }
          }}
          onSendMessage={sendHandler}
          isAttachmentMenuOpen={isAttachmentMenuOpen}
          setAttachmentMenuOpen={toggleAttachmentMenu}
          toggleAttachmentMenu={toggleAttachmentMenu}
          closeAttachmentMenu={closeAttachmentMenu}
          pickAndSendMedia={pickAndSendMedia}
          onStartRecording={handleStartRecording}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          handleCancelRecording={handleCancelRecording}
          handleSendRecording={handleSendRecording}
          handleSendLocation={handleSendLocation}
          disabled={!isOnline || isSending}
          inputRef={inputRef}
          isEditingMessage={isEditingMessage}
          editingMessageId={editingMessageId}
          onCancelEdit={handleCancelEdit}
          onSendAlert={async () => {
            if (onSendAlert && conversationId) {
              await onSendAlert();
            }
          }}
          replyingToMessage={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
          // AI File props
          isAIConversation={aiFileSupport.isAIConversation}
          selectedFiles={aiFileSupport.selectedFiles}
          onRemoveFile={aiFileSupport.removeFile}
          onSelectFile={aiFileSupport.openFilePicker}
          isProcessingFiles={aiFileSupport.isProcessing}
          // Paste image handler
          onPasteImage={sendImageFile}
          // Schedule message
          onScheduleClick={handleScheduleClick}
        />
      </div>

      {/* Message Info Dialog - Lazy loaded */}
      {showMessageInfo && selectedMessageForInfo && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-white rounded-full border-t-transparent" /></div>}>
          <MessageInfoDialog
            isOpen={showMessageInfo}
            onClose={handleCloseMessageInfo}
            message={selectedMessageForInfo}
            conversationId={conversationId}
          />
        </Suspense>
      )}

      {/* 📅 Schedule Message Sheet */}
      <ScheduleMessageSheet
        isOpen={isScheduleSheetOpen}
        onClose={() => {
          setIsScheduleSheetOpen(false);
          setEditingScheduledMessage(null);
        }}
        onSchedule={handleScheduleMessage}
        messageContent={newMessage}
        messageType="text"
        conversationId={conversationId}
        recipientId={conversationDetails?.otherUserId || ''}
        editingMessage={editingScheduledMessage}
        onUpdate={handleUpdateScheduledMessage}
      />

      {/* 📋 Scheduled Messages List */}
      <ScheduledMessagesList
        isOpen={isScheduledListOpen}
        onClose={() => setIsScheduledListOpen(false)}
        messages={scheduledMessages}
        onEdit={handleEditScheduledMessage}
        onDelete={handleDeleteScheduledMessage}
        isLoading={isScheduledLoading}
      />
    </div>
  );
};

const ChatScreen: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();

  // Initialize call alert with global system
  const { GlobalCallAlert, sendAlert, isRinging } = useOptimizedCallAlert();

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // دالة wrapper للتوافق مع ChatInterface
  const handleSendAlert = useCallback(async () => {
    return await sendAlert(conversationId);
  }, [sendAlert, conversationId]);

  return (
    <>
      {isRinging && <GlobalCallAlert />}
      <ChatInterface
        conversationId={conversationId}
        onSendAlert={handleSendAlert}
      />
    </>
  );
};

export default ChatScreen;
