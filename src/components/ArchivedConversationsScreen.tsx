import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationCard } from './ConversationCard'; // ✅ المكون المشترك
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import type { Conversation } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useArchivedConversationListActions } from '../hooks/useArchivedConversationListActions';
import { useGlobalUIStore } from '../stores/useGlobalUIStore';
import { Archive, Trash2, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ استخدام ConversationCard المشترك بدلاً من التعريف المحلي
const ArchivedConversationItem: React.FC<{ conversation: Conversation; isSelected: boolean; onClick: (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void; onLongPress: (target: EventTarget | null) => void; userId?: string; }> = React.memo(({ conversation, isSelected, onClick, onLongPress, userId }) => {
  const handleLongPressWrapper = (target: EventTarget | null) => {
    onLongPress(target);
  };

  return (
    <ConversationCard
      conversation={conversation}
      isSelected={isSelected}
      onClick={onClick}
      onLongPress={handleLongPressWrapper}
      isForwarding={false}
      groupAvatarComponent={undefined}
      showGroupLabel={false}
      disablePointerEvents={true} // ✅ للمحادثات المؤرشفة
      userId={userId} // ✅ تمرير userId
    />
  );
});

ArchivedConversationItem.displayName = 'ArchivedConversationItem';

const ArchivedConversationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    selectionMode,
    selectedItems,
    setSelectionMode,
    clearSelection,
    toggleSelectedItem,
    lastTriggeredAction,
    clearLastTriggeredAction,
  } = useGlobalUIStore();

  const isArchivedSelectionMode = selectionMode === 'conversations';
  const selectedArchivedConversations = selectedItems as Conversation[];

  const fetchArchivedConversations = useCallback(async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // First, get all conversations where the user is a participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, participants, updated_at')
        .contains('participants', [user.id]);

      if (conversationsError) throw conversationsError;

      if (!conversationsData || conversationsData.length === 0) {
        setArchivedConversations([]);
        setLoading(false);
        return;
      }

      // Get archived status for each conversation
      const conversationIds = conversationsData.map(conv => conv.id);
      const { data: archivedData, error: archivedError } = await supabase
        .from('user_conversation_settings')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('user_id', user.id)
        .eq('is_archived', true);

      if (archivedError) throw archivedError;

      // Create a set of archived conversation IDs
      const archivedConversationIds = new Set(
        archivedData?.map(item => item.conversation_id) || []
      );

      // Filter conversations to only include archived ones
      const archivedConversations = conversationsData.filter(conv =>
        archivedConversationIds.has(conv.id)
      );

      if (archivedConversations.length === 0) {
        setArchivedConversations([]);
        setLoading(false);
        return;
      }

      // Get all user IDs from conversations
      const userIds = new Set<string>();
      archivedConversations.forEach(conv => {
        if (conv.participants && Array.isArray(conv.participants)) {
          conv.participants.forEach((id: string) => {
            if (id !== user.id) userIds.add(id);
          });
        }
      });

      // Fetch user data for all participants
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', Array.from(userIds));

      if (usersError) console.error('Error fetching users data:', usersError);

      // Create a map of user data for quick lookup
      const usersMap = new Map<string, any>();
      if (usersData) {
        usersData.forEach(userData => {
          usersMap.set(userData.id, userData);
        });
      }

      // Get the last message for each conversation
      // ✅ حل متوازي بدلاً من N+1 queries - تحسين الأداء بشكل كبير!

      // جلب آخر رسالة لكل محادثة بشكل متوازي
      const lastMessagesPromises = archivedConversations.map(conv =>
        supabase
          .from('messages')
          .select('id, content, message_type, caption, media_metadata, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
      );

      // تنفيذ جميع الـ queries بالتوازي
      const lastMessagesResults = await Promise.all(lastMessagesPromises);

      // تنسيق البيانات
      const formattedConversations: Conversation[] = archivedConversations.map((conv, index) => {
        const messagesData = lastMessagesResults[index].data;
        const lastMsgObj = messagesData && messagesData.length > 0 ? messagesData[0] : null;
        const lastMessageText = lastMsgObj ? (lastMsgObj.caption || lastMsgObj.content || '') : 'لا توجد رسائل بعد';

        // Find the other user in the conversation
        const otherUserId = conv.participants?.find((id: string) => id !== user.id);
        const otherUser = otherUserId ? usersMap.get(otherUserId) : null;

        return {
          id: conv.id,
          name: otherUser?.username || 'مستخدم غير معروف',
          participants: conv.participants,
          lastMessage: lastMessageText,
          lastMessageMeta: lastMsgObj,
          timestamp: conv.updated_at,
          unread: false,
          archived: true,
          avatar_url: otherUser?.avatar_url,
        };
      });

      setArchivedConversations(formattedConversations);
    } catch (err: any) {
      console.error('Error fetching archived conversations:', err);
      setError(err.message || 'فشل في تحميل المحادثات المؤرشفة');
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchArchivedConversations();
  }, [fetchArchivedConversations]);

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  useArchivedConversationListActions(setArchivedConversations, fetchArchivedConversations);

  const handleLongPress = useCallback((target: EventTarget | null) => {
    if (!target) return;
    const element = target as HTMLElement;
    const conversationElement = element.closest('[data-id]');
    if (!conversationElement) return;
    const conversationId = conversationElement.getAttribute('data-id');
    if (!conversationId) return;
    const conversation = archivedConversations.find(c => c.id === conversationId);
    if (!conversation) return;
    toggleSelectedItem(conversation, 'conversation');
    if (!isArchivedSelectionMode) {
      setSelectionMode('conversations');
    }
  }, [archivedConversations, toggleSelectedItem, isArchivedSelectionMode, setSelectionMode]);

  const handleConversationClick = (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    const conversationElement = (event.currentTarget as HTMLElement).closest('[data-id]');
    if (!conversationElement) return;
    const conversationId = conversationElement.getAttribute('data-id');
    if (conversationId) {
      if (isArchivedSelectionMode) {
        const conversation = archivedConversations.find(c => c.id === conversationId);
        if (conversation) {
          toggleSelectedItem(conversation, 'conversation');
        }
      } else {
        handleSelectConversation(conversationId);
      }
    }
  };

  const handleUnarchiveSelected = useCallback(async () => {
    for (const conv of selectedArchivedConversations) {
      const { error } = await supabase.rpc('unarchive_conversation', { p_conversation_id: conv.id });
      if (error) console.error('Error unarchiving conversation:', error);
    }
    fetchArchivedConversations();
    await queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    clearSelection();
  }, [selectedArchivedConversations, clearSelection, fetchArchivedConversations, queryClient, user?.id]);

  const handleDeleteSelectedForMe = useCallback(async () => {
    for (const conv of selectedArchivedConversations) {
      const { error } = await supabase.rpc('clear_and_hide_conversation', { p_conversation_id: conv.id });
      if (error) console.error('Error hiding conversation:', error);
    }
    clearSelection();
    fetchArchivedConversations();
  }, [selectedArchivedConversations, clearSelection, fetchArchivedConversations]);

  const handleDeleteSelectedForAll = useCallback(async () => {
    for (const conv of selectedArchivedConversations) {
      const { error } = await supabase.rpc('delete_conversation_for_all', { p_conversation_id: conv.id });
      if (error) console.error('Error deleting conversation for all:', error);
    }
    clearSelection();
    fetchArchivedConversations();
  }, [selectedArchivedConversations, clearSelection, fetchArchivedConversations]);

  const handleBack = () => navigate('/conversations');

  useEffect(() => {
    if (lastTriggeredAction) {
      if (lastTriggeredAction.type === 'deleteConversation') handleDeleteSelectedForMe();
      else if (lastTriggeredAction.type === 'deleteConversationForAll') handleDeleteSelectedForAll();
      else if (lastTriggeredAction.type === 'archiveConversation') handleUnarchiveSelected();
      clearLastTriggeredAction();
    }
  }, [lastTriggeredAction, handleDeleteSelectedForMe, handleDeleteSelectedForAll, handleUnarchiveSelected, clearLastTriggeredAction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل المحادثات المؤرشفة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">حدث خطأ</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-800">
      <div className="bg-indigo-600 dark:bg-slate-900/70 backdrop-blur-lg text-white p-4 shadow-md border-b border-indigo-700 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-2 p-2 rounded-full hover:bg-indigo-500 dark:hover:bg-slate-700 transition-colors"
              aria-label="العودة"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">المحادثات المؤرشفة</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-800">
        {archivedConversations.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            {'لا توجد محادثات مؤرشفة'}
          </div>
        ) : (
          <ul>
            {archivedConversations.map((conversation) => (
              <li key={conversation.id} data-id={conversation.id}>
                <ArchivedConversationItem
                  conversation={conversation}
                  isSelected={selectedArchivedConversations.some(c => c.id === conversation.id)}
                  onClick={handleConversationClick}
                  onLongPress={handleLongPress}
                  userId={user?.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ArchivedConversationsScreen;
