import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Trash2, Pin, Forward, Archive, X, Info, Edit, Share2, Copy // ✅ حذف Reply
} from 'lucide-react';
import { useGlobalUIStore } from '@/stores/useGlobalUIStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AddParticipantDialog } from '../AddParticipantDialog';
import { EnhancedDialogWrapper } from '@/common/EnhancedDialogWrapper';
import { supabase } from '@/services/supabase';

interface AppFooterProps {
  isKeyboardVisible?: boolean;
}

/**
 * AppFooter - الفوتر العائم
 * يظهر فقط عند تحديد رسائل/محادثات/تعليقات
 * الفوتر القديم (شريط الأيقونات) تم إلغاؤه
 */
export const AppFooter: React.FC<AppFooterProps> = ({ isKeyboardVisible = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const conversationId = location.pathname.startsWith('/chat/')
    ? location.pathname.split('/chat/')[1]
    : undefined;

  const {
    selectionMode,
    selectedItems,
    clearSelection,
    triggerAction,
  } = useGlobalUIStore();

  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);

  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // إغلاق القوائم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu && deleteButtonRef.current &&
        !deleteButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.delete-menu')) {
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteMenu]);

  const selectedCount = selectedItems.length;

  // التحقق من أن الرسالة المحددة نصية (للتعديل)
  // زر التعديل يعمل فقط مع رسالة واحدة نصية
  const canEditMessage = selectedCount === 1 &&
    selectionMode === 'messages' &&
    selectedItems[0]?.message_type === 'text';

  // التحقق من أن الرسائل المحددة نصية (للنسخ)
  const canCopyMessage = useMemo(() => {
    if (selectionMode !== 'messages' || selectedCount === 0) return false;
    // يمكن نسخ رسالة واحدة أو أكثر إذا كانت نصية
    return selectedItems.some((item: any) =>
      item.message_type === 'text' && (item.content || item.text)
    );
  }, [selectionMode, selectedItems, selectedCount]);

  // دالة نسخ الرسائل
  const handleCopyMessages = async () => {
    if (!canCopyMessage) return;

    // فلترة الرسائل النصية فقط
    const textMessages = selectedItems.filter((item: any) =>
      item.message_type === 'text' && (item.content || item.text)
    );

    const textToCopy = textMessages
      .map((item: any) => item.content || item.text)
      .join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      clearSelection();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // التحقق من أن كل الرسائل المحددة ميديا (صوت/صورة/فيديو/مستند) بدون أي نص
  const canShareMedia = useMemo(() => {
    if (selectionMode !== 'messages' || selectedCount === 0) return false;

    // أنواع الميديا المسموح مشاركتها
    const mediaTypes = ['audio', 'image', 'video', 'document'];

    // التحقق من أن كل الرسائل المحددة من نوع ميديا
    return selectedItems.every((item: any) =>
      mediaTypes.includes(item.message_type)
    );
  }, [selectionMode, selectedItems, selectedCount]);

  // إظهار الفوتر العائم فقط عند التحديد
  const shouldShowFooter = !isKeyboardVisible && selectionMode !== 'none';

  const handleActionClick = (actionType: 'deleteConversation' | 'deleteConversationForAll' | 'archiveConversation' | 'deleteForMe' | 'deleteForAll' | 'pin' | 'forward' | 'info' | 'edit' | 'share' | 'copy') => {
    if (actionType === 'copy') {
      handleCopyMessages();
      return;
    }
    triggerAction(actionType);
  };

  return (
    <>
      {/* الفوتر العائم - يظهر فقط عند التحديد */}
      {shouldShowFooter && (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-3xl bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg">
          <div className="flex justify-around items-center w-full">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedCount} محددة</div>

            {/* زر الحذف */}
            <div className="relative">
              <button
                onClick={async (e) => {
                  e.stopPropagation();

                  if (selectionMode === 'conversations' && selectedItems.length === 1) {
                    const conv = selectedItems[0] as any;
                    const { data } = await supabase
                      .from('conversations')
                      .select('is_group')
                      .eq('id', conv.id)
                      .single();

                    if (data?.is_group) {
                      setShowLeaveGroupDialog(true);
                      setShowDeleteMenu(false);
                      return;
                    }
                  }

                  setShowDeleteMenu(!showDeleteMenu);
                }}
                ref={deleteButtonRef}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <Trash2 size={20} />
              </button>
              {showDeleteMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-10 delete-menu">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(selectionMode === 'conversations' ? 'deleteConversation' : 'deleteForMe');
                      setShowDeleteMenu(false);
                    }}
                    className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {selectionMode === 'conversations' ? 'حذف المحادثة لدي' : selectionMode === 'comments' ? 'حذف التعليق لدي' : 'حذف الرسالة لدي'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(selectionMode === 'conversations' ? 'deleteConversationForAll' : 'deleteForAll');
                      setShowDeleteMenu(false);
                    }}
                    className="block w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {selectionMode === 'conversations' ? 'حذف المحادثة لدى الجميع' : selectionMode === 'comments' ? 'حذف التعليق لدى الجميع' : 'حذف الرسالة لدى الجميع'}
                  </button>
                </div>
              )}
            </div>

            {/* أزرار المحادثات */}
            {selectionMode === 'conversations' && (
              <button
                onClick={() => handleActionClick('archiveConversation')}
                disabled={selectedCount === 0}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Archive size={20} />
              </button>
            )}

            {/* أزرار الرسائل */}
            {selectionMode === 'messages' && (
              <>
                <button
                  onClick={() => handleActionClick('pin')}
                  disabled={selectedCount !== 1}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pin size={20} />
                </button>
                {/* زر النسخ للرسائل النصية */}
                <button
                  onClick={() => handleActionClick('copy')}
                  disabled={!canCopyMessage}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="نسخ النص"
                >
                  <Copy size={20} />
                </button>
                <button
                  onClick={() => handleActionClick('info')}
                  disabled={selectedCount !== 1}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Info size={20} />
                </button>
                <button
                  onClick={() => handleActionClick('forward')}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  <Forward size={20} />
                </button>
                <button
                  onClick={() => handleActionClick('edit')}
                  disabled={!canEditMessage}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleActionClick('share')}
                  disabled={!canShareMedia}
                  className={`p-1 rounded-full transition-all ${canShareMedia
                    ? 'hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'}`}
                  title={canShareMedia ? 'مشاركة الميديا' : 'المشاركة متاحة فقط للوسائط'}
                >
                  <Share2 size={20} />
                </button>
              </>
            )}

            {/* أزرار التعليقات */}
            {selectionMode === 'comments' && (
              <button
                onClick={() => handleActionClick('edit')}
                disabled={selectedCount !== 1}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit size={20} />
              </button>
            )}

            {/* زر الإغلاق */}
            <button
              onClick={clearSelection}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* نافذة إضافة مشارك */}
      {showAddParticipant && user && (
        <AddParticipantDialog
          isOpen={showAddParticipant}
          onClose={() => setShowAddParticipant(false)}
          conversationId={conversationId}
          currentUserId={user.id}
          mode={conversationId ? 'add' : 'create'}
          onSuccess={(newConvId) => {
            if (newConvId && !conversationId) {
              navigate(`/chat/${newConvId}`);
            } else {
              window.location.reload();
            }
          }}
        />
      )}



      {/* نافذة مغادرة المجموعة */}
      {showLeaveGroupDialog && selectedItems.length === 1 && user && (
        <EnhancedDialogWrapper
          isOpen={showLeaveGroupDialog}
          onClose={() => setShowLeaveGroupDialog(false)}
          title="مغادرة المحادثة الجماعية"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              هل تؤكد حذف المحادثة الجماعية والخروج منها؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const conv = selectedItems[0] as any;
                  const { error } = await supabase.rpc('leave_group_conversation', {
                    p_conversation_id: conv.id,
                    p_user_id: user.id
                  });

                  if (!error) {
                    clearSelection();
                    window.location.reload();
                  }
                  setShowLeaveGroupDialog(false);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                موافق
              </button>
              <button
                onClick={() => setShowLeaveGroupDialog(false)}
                className="flex-1 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </EnhancedDialogWrapper>
      )}
    </>
  );
};

AppFooter.displayName = 'AppFooter';