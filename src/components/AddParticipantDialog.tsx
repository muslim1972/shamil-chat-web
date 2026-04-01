import React, { useState } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { EnhancedDialogWrapper } from '@/common/EnhancedDialogWrapper';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface AddParticipantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  currentUserId: string;
  mode: 'add' | 'create';
  onSuccess?: (conversationId: string) => void;
}

export const AddParticipantDialog: React.FC<AddParticipantDialogProps> = ({
  isOpen,
  onClose,
  conversationId,
  currentUserId,
  mode,
  onSuccess
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['search-users', searchText],
    queryFn: async () => {
      if (!searchText.trim()) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .neq('id', currentUserId)
        .ilike('username', `%${searchText}%`)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && searchText.length > 0,
  });

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedUsers.size === 0) {
      toast.error('يرجى اختيار مشترك واحد على الأقل');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'add' && conversationId) {
        for (const userId of selectedUsers) {
          const { error } = await supabase.rpc('add_participant_to_conversation', {
            p_conversation_id: conversationId,
            p_user_id: userId,
            p_added_by_user_id: currentUserId
          });
          
          if (error) throw error;
        }
        
        toast.success('تم إضافة المشتركين بنجاح');
        onSuccess?.(conversationId);
      } else {
        const { data: newConvId, error } = await supabase.rpc('create_group_conversation', {
          p_participant_ids: Array.from(selectedUsers),
          p_created_by_user_id: currentUserId
        });
        
        if (error) throw error;
        
        toast.success('تم إنشاء المحادثة الجماعية بنجاح');
        onSuccess?.(newConvId);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearchText('');
    setSelectedUsers(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <EnhancedDialogWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'add' ? 'إضافة مشترك' : 'محادثة جماعية جديدة'}
    >
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث عن مستخدم..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            dir="rtl"
          />
        </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <p className="text-sm text-indigo-600 dark:text-indigo-400">
            تم اختيار {selectedUsers.size} مشترك
          </p>
        </div>
      )}

      <div className="mb-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUsers.has(user.id)
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex-1 flex items-center">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-10 h-10 rounded-full ml-3 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center ml-3 text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </span>
                </div>
                {selectedUsers.has(user.id) && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Check size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : searchText ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            لا يوجد مستخدمين بهذا الاسم
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            ابحث عن مستخدم لإضافته
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSubmit}
          disabled={selectedUsers.size === 0 || isSubmitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <UserPlus size={20} className="ml-2" />
              {mode === 'add' ? 'إضافة المشتركين' : 'إنشاء المحادثة'}
            </>
          )}
        </button>
      </div>
    </EnhancedDialogWrapper>
  );
};