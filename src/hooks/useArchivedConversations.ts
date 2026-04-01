import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Conversation } from '../types';
import { useAuth } from '../context/AuthContext';

// دالة الجلب
const fetchArchivedConversations = async (): Promise<Conversation[]> => {
  const { data, error } = await supabase.rpc('get_user_archived_conversations');

  if (error) {
    throw new Error(error.message);
  }

  return data.map((conv: any) => ({
    id: conv.id,
    name: conv.other_username,
    participants: conv.participants,
    lastMessage: conv.last_message,
    timestamp: conv.updated_at,
    unread: conv.unread_count > 0,
    archived: true,
  }));
};

// الهوك المخصص
export const useArchivedConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['archived_conversations', user?.id],
    queryFn: fetchArchivedConversations,
    enabled: !!user?.id,
  });
};