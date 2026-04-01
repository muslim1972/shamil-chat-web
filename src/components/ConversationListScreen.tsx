import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupAvatars } from './GroupAvatars';
import { ConversationCard } from './ConversationCard'; // ✅ المكون المشترك
import { useConversationItem } from '../hooks/useConversationItem'; // ✅ الهوك المشترك
import { useAuth } from '../context/AuthContext';
import { useForwarding } from '../context/ForwardingContext';
import { useConversationsCache } from '../cache/hooks/useConversationsCache';
import { useForwardingSystem } from '../hooks/useForwardingSystem';
import useLongPress from '../hooks/useLongPress';
import type { Conversation } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Archive, QrCode, X, LayoutGrid, PenTool, Bell, LogOut, Palette } from 'lucide-react';
import SearchDialog from './SearchDialog';
import { QRScannerDialog } from './QRScannerDialog';
import { processQRImage } from '../utils/qrScannerUtils';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { useGlobalUIStore } from '../stores/useGlobalUIStore';
import { summarizeMessage } from '../utils/messagePreview';
import { useTheme } from '../context/ThemeContext';
import { useChatBackground } from '../context/ChatBackgroundContext';
import { useOnlinePresence } from '../context/OnlinePresenceContext';
import { useShamliSortedConversations } from '../hooks/useShamliSortedConversations';

// ✅ استخدام المكون المشترك بدلاً من التعريف المحلي
const ConversationItem: React.FC<{
  conversation: Conversation;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
  onLongPress: (target: EventTarget | null) => void;
  isForwarding: boolean;
  onlineUsers: Set<string>;
}> = React.memo(({ conversation, isSelected, onClick, onLongPress, isForwarding, onlineUsers }) => {
  const { user } = useAuth();
  // استخدام الهوك المشترك لجلب معلومات المجموعة
  const { isGroup, participants, handleLongPress } = useConversationItem({
    conversationId: conversation.id,
    onLongPress,
  });

  // Calculate Online Status
  const isOnline = useMemo(() => {
    if (isGroup || !user) return false;
    const otherUserId = conversation.participants.find(id => id !== user.id);
    return otherUserId ? onlineUsers.has(otherUserId) : false;
  }, [conversation.participants, isGroup, user, onlineUsers]);

  // ✨ Shamli: تحديد المستخدم الآخر
  const otherUserId = useMemo(() => {
    if (isGroup || !user) return undefined;
    return conversation.participants.find(id => id !== user.id);
  }, [conversation.participants, isGroup, user]);

  // مكون الأفاتار للمجموعات
  const groupAvatarComponent = isGroup && participants.length > 0 ? (
    <GroupAvatars participants={participants} size="small" maxDisplay={3} />
  ) : undefined;

  return (
    <ConversationCard
      conversation={conversation}
      isSelected={isSelected}
      onClick={onClick}
      onLongPress={handleLongPress}
      isForwarding={isForwarding}
      groupAvatarComponent={groupAvatarComponent}
      showGroupLabel={isGroup}
      disablePointerEvents={false}
      isOnline={isOnline}
      userId={user?.id} // ✅ تمرير userId للتفريق بين الرسائل المرسلة والمستلمة
      otherUserId={otherUserId} // ✨ تمرير otherUserId لدعم Shamli
    />
  );
});
ConversationItem.displayName = 'ConversationItem';

const ConversationListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isForwarding, messagesToForward, forwardingMode, completeForwarding } = useForwarding();
  const { conversations, loading, error, stopPreloading, refetch } = useConversationsCache();
  const { isLocationMessage } = useForwardingSystem();
  const { colorScheme } = useTheme();
  const { background: chatBackground } = useChatBackground();
  const {
    selectionMode,
    selectedItems,
    setSelectionMode,
    toggleSelectedItem,
    lastTriggeredAction,
    clearLastTriggeredAction,
    clearSelection,
  } = useGlobalUIStore();

  const { onlineUsers } = useOnlinePresence();

  // ✨ Shamli: ترتيب ذكي للمحادثات
  const sortedConversations = useShamliSortedConversations(conversations, user?.id);

  const isConversationsSelectionMode = selectionMode === 'conversations';
  const selectedConversations = selectedItems as Conversation[];
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // جلب أفاتار المستخدم من جدول users
  useEffect(() => {
    if (!user?.id) return;
    const fetchUserAvatar = async () => {
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (data?.avatar_url) {
        setUserAvatar(data.avatar_url);
      }
    };
    fetchUserAvatar();
  }, [user?.id]);

  const handleLongPress = useCallback((target: EventTarget | null) => {
    if (!target || isForwarding) return;
    const targetElement = target as HTMLElement;
    const conversationId = targetElement.dataset.id;
    if (!conversationId) return;
    const conversation = sortedConversations.find(c => c.id === conversationId);
    if (!conversation) return;
    toggleSelectedItem(conversation, 'conversation');
    if (!isConversationsSelectionMode) {
      setSelectionMode('conversations');
    }
  }, [sortedConversations, isConversationsSelectionMode, toggleSelectedItem, setSelectionMode, isForwarding]);

  const handleForwardMessages = useCallback(async (conversationId: string) => {
    if (!user || messagesToForward.length === 0) return;
    const loadingToast = toast.loading('جاري تحويل الرسائل...');
    try {
      const sortedMessages = [...messagesToForward].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const singleMessage = sortedMessages[0];
      const isLocation = isLocationMessage(singleMessage);
      const isSingleNonTextMessageFixed = sortedMessages.length === 1 &&
        !['text', 'aggregated', 'forwarded_block'].includes(singleMessage.message_type || 'text') &&
        !isLocation;

      // ✅ إذا كانت رسالة واحدة من نوع forwarded_block، نعيد إرسالها كما هي
      const isSingleForwardedBlock = sortedMessages.length === 1 &&
        singleMessage.message_type === 'forwarded_block';

      // Determine if we should create a single forwarded_block
      const useBlock = forwardingMode === 'block' && !isSingleNonTextMessageFixed && !isSingleForwardedBlock;

      if (isSingleForwardedBlock) {
        // إعادة توجيه رسالة مجمعة: نحتفظ بـ content (JSON) كما هو

        // التحقق من وجود content
        if (!singleMessage.content) {
          throw new Error('محتوى الرسالة المجمعة غير موجود');
        }

        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: singleMessage.content,
          message_type: 'forwarded_block',
          caption: null,
          media_metadata: null,
        });

        if (error) {
          console.error('❌ Error forwarding forwarded_block:', error);
          throw error;
        }

        // تم إعادة توجيه forwarded_block بنجاح
      } else if (isSingleNonTextMessageFixed) {
        // --- السلوك الصحيح: إعادة توجيه الرسالة الخاصة بما في ذلك الموقع ---
        const singleMessage = sortedMessages[0];
        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: singleMessage.content || singleMessage.text,
          message_type: singleMessage.message_type,
          caption: singleMessage.caption,
          media_metadata: singleMessage.media_metadata,
          forwarded_from_message_id: singleMessage.id,
        });
        if (error) throw error;
      } else if (useBlock) {
        // Create one aggregated message containing JSON of the forwarded messages
        const payloadMessages = sortedMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          timestamp: m.timestamp,
          message_type: m.message_type,
          text: m.text || m.content,
          caption: m.caption || null,
          // Add sender data to media_metadata for proper display in MiniMessageBubble
          media_metadata: {
            ...(m.media_metadata || {}),
            sender_username: (m as any).sender?.username || (m as any).media_metadata?.sender_username || (m as any).sender_username || (m as any).senderName || '',
            sender_avatar_url: (m as any).sender?.avatar_url || (m as any).media_metadata?.sender_avatar_url || (m as any).sender_avatar_url || null,
            // Preserve original media metadata
            path: (m as any).media_metadata?.path,
            file_path: (m as any).media_metadata?.file_path,
            storage_path: (m as any).media_metadata?.storage_path,
            mime: (m as any).media_metadata?.mime,
            size: (m as any).media_metadata?.size,
            width: (m as any).media_metadata?.width,
            height: (m as any).media_metadata?.height,
          },
          // Preserve display alignment/ownership at the time of forwarding
          isOwn: typeof (m as any).isOwn === 'boolean' ? (m as any).isOwn : (m.senderId === user.id),
          display: (m as any).display || {
            alignment: (m as any).isOwn ? 'right' : (m.senderId === user.id ? 'right' : 'left'),
            bgClass: (m as any).display?.bgClass || (m.senderId === user.id ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800 shadow-sm'),
            textClass: (m as any).display?.textClass || (m.senderId === user.id ? 'text-indigo-200' : 'text-gray-500'),
          }
        }));

        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: JSON.stringify(payloadMessages),
          message_type: 'forwarded_block',
          caption: null,
          media_metadata: null,
        });

        if (error) throw error;
      } else {
        // Fallback: insert individual messages (keep existing behavior)
        for (const message of sortedMessages) {
          const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: message.text || message.content,
            message_type: message.message_type,
            caption: message.caption,
            media_metadata: message.media_metadata,
            forwarded_from_message_id: message.id,
          });
          if (error) throw error;
        }
      }

      toast.success('تم تحويل الرسائل بنجاح!');
      completeForwarding();
      navigate(`/chat/${conversationId}`);
    } catch (err) {
      console.error('Error forwarding messages:', err);
      toast.error('فشل تحويل الرسائل.');
    } finally {
      toast.dismiss(loadingToast);
    }
  }, [user, messagesToForward, forwardingMode, completeForwarding, navigate, isLocationMessage]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    stopPreloading();
    if (isForwarding && messagesToForward.length > 0) {
      handleForwardMessages(conversationId);
    } else {
      navigate(`/chat/${conversationId}`);
    }
  }, [isForwarding, messagesToForward, handleForwardMessages, navigate, stopPreloading]);

  const handleConversationClick = (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    const conversationElement = (event.currentTarget as HTMLElement);
    const conversationId = conversationElement.dataset.id;

    if (!conversationId) return;

    if (isForwarding) {
      handleSelectConversation(conversationId);
      return;
    }

    if (isConversationsSelectionMode) {
      const conversation = sortedConversations.find(c => c.id === conversationId);
      if (conversation) {
        toggleSelectedItem(conversation, 'conversation');
      }
    } else {
      handleSelectConversation(conversationId);
    }
  };

  const handleCreateConversation = async (userId: string) => {
    if (!user) return;

    // ✅ منع إنشاء محادثة مع النفس
    if (userId === user.id) {
      toast.error('لا يمكنك بدء محادثة مع نفسك! 😅');
      return;
    }

    try {
      console.log('[QR] Creating conversation with userId:', userId);
      const { data: conversationId, error: rpcError } = await supabase.rpc('create_or_get_conversation_with_user', {
        p_other_user_id: userId
      });

      if (rpcError) {
        console.error('[QR] RPC Error:', rpcError);
        // رسائل خطأ مخصصة
        if (rpcError.message?.includes('yourself')) {
          toast.error('لا يمكنك بدء محادثة مع نفسك!');
        } else {
          toast.error(`لم نتمكن من بدء المحادثة: ${rpcError.message || 'خطأ غير معروف'}`);
        }
        return;
      }

      console.log('[QR] Conversation ID:', conversationId);

      if (conversationId) {
        if (isForwarding && messagesToForward.length > 0) {
          await handleForwardMessages(conversationId);
        } else {
          navigate(`/chat/${conversationId}`);
        }
      } else {
        toast.error('لم يتم إرجاع معرف المحادثة');
      }
    } catch (err) {
      console.error('Error in handleCreateConversation:', err);
      toast.error('حدث خطأ أثناء إنشاء المحادثة');
    }
  };

  const handleDeleteConversations = useCallback(async () => {
    if (selectedConversations.length === 0) return;
    const loadingToast = toast.loading('جاري حذف المحادثات...');
    try {
      // ✅ Import dynamically to avoid circular dependencies
      const { deleteConversationCache } = await import('../services/CacheManager');

      await Promise.all(selectedConversations.map(async (conversation) => {
        const { error: rpcError } = await supabase.rpc('clear_and_hide_conversation', { p_conversation_id: conversation.id });
        if (rpcError) {
          console.error(`Failed to hide conversation ${conversation.id}:`, rpcError);
          toast.error(`فشل حذف المحادثة: ${conversation.name}`);
        } else {
          // ✅ مسح كاش الرسائل بعد نجاح الحذف
          await deleteConversationCache(conversation.id);
        }
      }));
      toast.success('اكتملت عملية الحذف.');
    } catch (error) {
      console.error('Error during conversation deletion:', error);
      toast.error('حدث خطأ غير متوقع.');
    } finally {
      toast.dismiss(loadingToast);
      clearSelection();
      refetch(); // ✅ تحديث قائمة المحادثات فوراً
    }
  }, [selectedConversations, clearSelection, refetch]);

  const handleArchiveConversations = useCallback(async () => {
    if (selectedConversations.length === 0) return;
    let successCount = 0;

    for (const conversation of selectedConversations) {
      const { error } = await supabase.rpc('archive_conversation', { p_conversation_id: conversation.id });
      if (error) {
        toast.error('لم نتمكن من أرشفة المحادثة.');
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`تم أرشفة ${successCount} محادثة بنجاح`);
      refetch(); // تحديث قائمة المحادثات فوراً
    }

    clearSelection();
  }, [selectedConversations, clearSelection, refetch]);

  const handleDeleteConversationsForAll = useCallback(async () => {
    if (selectedConversations.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedConversations.length} محادثة لدى الجميع؟`)) {
      return;
    }
    const loadingToast = toast.loading('جاري حذف المحادثات لدى الجميع...');
    try {
      // ✅ Import dynamically to avoid circular dependencies
      const { deleteConversationCache } = await import('../services/CacheManager');

      await Promise.all(selectedConversations.map(async (conversation) => {
        const { error } = await supabase.rpc('hard_delete_conversation_for_all', {
          p_conversation_id: conversation.id,
          p_user_id: user?.id
        });
        if (error) {
          console.error(`Failed to delete for all ${conversation.id}:`, error);
          toast.error(`فشل حذف المحادثة: ${conversation.name}`);
        } else {
          // ✅ مسح كاش الرسائل بعد نجاح الحذف
          await deleteConversationCache(conversation.id);
        }
      }));
      toast.success('اكتمل الحذف لدى الجميع.');
    } catch (error) {
      console.error('Error during delete for all:', error);
      toast.error('حدث خطأ غير متوقع.');
    } finally {
      toast.dismiss(loadingToast);
      clearSelection();
    }
  }, [selectedConversations, user?.id, clearSelection]);

  useEffect(() => {
    if (lastTriggeredAction) {
      if (lastTriggeredAction.type === 'deleteConversation') {
        handleDeleteConversations();
      } else if (lastTriggeredAction.type === 'archiveConversation') {
        handleArchiveConversations();
      } else if (lastTriggeredAction.type === 'deleteConversationForAll') {
        handleDeleteConversationsForAll();
      }
      clearLastTriggeredAction();
    }
  }, [lastTriggeredAction, handleDeleteConversations, handleArchiveConversations, handleDeleteConversationsForAll, clearLastTriggeredAction]);



  // فتح صورة QR من الاستوديو
  const handleGenerateQR = useCallback(() => {
    // إنشاء input لاختيار الصورة
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const result = await processQRImage(file);

      if (result.found && result.userId) {
        // فتح أو إنشاء محادثة مع المستخدم
        handleCreateConversation(result.userId);
      }
    };

    input.click();
  }, [handleCreateConversation]);

  // فتح الكاميرا لمسح QR (لم تعد مستخدمة)
  const handleOpenCamera = useCallback(() => {
    setShowQRScanner(true);
  }, []);

  // عند العثور على مستخدم من ماسح الكاميرا
  const handleQRUserFound = useCallback((userId: string) => {
    handleCreateConversation(userId);
  }, [handleCreateConversation]);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);




  if (loading) {
    return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--app-background)', color: 'var(--shagram-text)' }}>جاري التحميل...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--app-background)', color: '#ef4444' }}>خطأ: {error}</div>;
  }

  return (
    <div className="h-screen relative" style={{ background: 'var(--app-background)' }}>
      {/* طبقة خلفية الدردشة الاختيارية */}
      <div className={`absolute inset-0 chat-bg-${chatBackground} opacity-10 pointer-events-none`} />

      <main className="relative z-10 w-full h-full flex flex-col shadow-2xl sm:max-w-2xl sm:mx-auto" style={{ background: 'var(--conversation-card-bg)' }}>
        {isForwarding && (
          <div className="border-b-2 p-3 text-center" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <div className="flex justify-between items-center">
              <p className="font-semibold" style={{ color: 'var(--primary-dark)' }}>اختر محادثة لتحويل الرسائل إليها</p>
              <button onClick={completeForwarding} className="p-1 rounded-full" style={{ background: 'var(--primary-lighter)' }}>
                <X size={20} style={{ color: 'var(--primary)' }} />
              </button>
            </div>
          </div>
        )}
        <header className="sticky top-0 z-50 backdrop-blur-lg p-4 shadow-sm border-b pt-[calc(1rem+env(safe-area-inset-top))]" style={{ background: 'var(--header-bg)', borderColor: 'var(--primary-light)' }}>
          <div className="flex justify-between items-center gap-2">
            {/* أفاتار واسم المستخدم */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <div className="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden rounded-full flex-shrink-0" style={{ background: 'var(--primary-light)' }}>
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={(user as any)?.user_metadata?.username || 'المستخدم'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-medium text-slate-600 dark:text-slate-300 uppercase text-sm">
                    {((user as any)?.user_metadata?.username || '#').charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base font-semibold truncate max-w-[100px] sm:max-w-[150px]" style={{ color: 'var(--shagram-text)' }}>
                {(user as any)?.user_metadata?.username || 'المستخدم'}
              </span>
            </div>
            {/* الأزرار */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0" style={{ color: 'var(--shagram-text-muted)' }}>
              <button onClick={() => navigate('/settings/typing')} aria-label="تخصيص مؤشر الكتابة" className="hover:text-[var(--primary)]"><PenTool size={20} /></button>
              <button onClick={() => navigate('/settings/theme')} aria-label="إعدادات المظهر" className="hover:text-[var(--primary)]"><Palette size={20} /></button>
              <button onClick={() => navigate('/archived')} aria-label="المحادثات المؤرشفة" className="hover:text-[var(--primary)]"><Archive size={20} /></button>
              <button onClick={() => navigate('/notifications')} aria-label="التنبيهات" className="hover:text-[var(--primary)]"><Bell size={20} /></button>
              <button onClick={() => navigate('/dashboard')} aria-label="الواجهة الرئيسية" className="hover:text-[var(--primary)]"><LayoutGrid size={20} /></button>
              <button 
                onClick={async () => {
                  if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                    await signOut();
                    navigate('/auth');
                  }
                }} 
                aria-label="تسجيل الخروج" 
                className="hover:text-red-500 transition-colors"
                style={{ color: 'var(--shagram-text-muted)' }}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="relative flex-1">
              <SearchDialog
                onOpenConversation={handleCreateConversation}
                onGenerateQR={handleGenerateQR}
                onOpenCamera={handleOpenCamera}
              />
            </div>
            {/* زر QR - يفتح المعرض مباشرة */}
            <button
              className="ml-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              onClick={() => setShowQRScanner(true)}
              title="مسح رمز QR"
            >
              <QrCode size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ul>
            {sortedConversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  isSelected={selectedConversations.some(c => c.id === conversation.id)}
                  onClick={handleConversationClick}
                  onLongPress={handleLongPress}
                  isForwarding={isForwarding}
                  onlineUsers={onlineUsers}
                />
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* QR Scanner Dialog */}
      <QRScannerDialog
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onUserFound={handleQRUserFound}
      />
    </div>
  );
};

export default React.memo(ConversationListScreen);