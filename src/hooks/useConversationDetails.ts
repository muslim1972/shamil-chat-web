import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface ConversationDetailsData {
  id: string;
  name: string;
  avatar_url?: string;
  is_group: boolean;
  otherUserId?: string;
}

async function fetchConversationDetails(conversationId: string, myUserId?: string): Promise<ConversationDetailsData | null> {
  if (!conversationId) return null;

  // Fetch the conversation base
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, participants, is_group, name')
    .eq('id', conversationId)
    .single();

  if (convError) {
    if (import.meta.env.DEV) console.error('[useConversationDetails] conversation fetch error:', convError);
    return null;
  }

  if (!conv) return null;

  if (conv.is_group) {
    return {
      id: conv.id,
      name: conv.name || 'محادثة جماعية',
      is_group: true,
    };
  }

  // Private chat: fetch the other user's basic info
  let otherUserId: string | undefined;
  try {
    const participants: string[] = Array.isArray(conv.participants) ? conv.participants : [];
    otherUserId = participants.find((pid) => pid && pid !== myUserId);
  } catch { }

  if (!otherUserId) {
    return {
      id: conv.id,
      name: conv.name || 'محادثة',
      is_group: false,
    };
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('username, avatar_url')
    .eq('id', otherUserId)
    .single();

  if (userError) {
    if (import.meta.env.DEV) console.warn('[useConversationDetails] user fetch error:', userError);
    return {
      id: conv.id,
      name: conv.name || 'مستخدم مجهول',
      is_group: false,
    };
  }

  return {
    id: conv.id,
    name: userData?.username || conv.name || 'مستخدم مجهول',
    avatar_url: userData?.avatar_url,
    is_group: false,
    otherUserId
  };
}

export function useConversationDetails(conversationId: string, myUserId?: string) {
  return useQuery<ConversationDetailsData | null>({
    queryKey: ['conversation-details', conversationId],
    queryFn: () => fetchConversationDetails(conversationId, myUserId),
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000, // ✅ تقليل إلى 1 دقيقة لضمان تحديث اسم المستخدم
    gcTime: 30 * 60 * 1000, // 30 minutes in memory before GC
    refetchOnMount: 'always', // ✅ تحديث فوري عند كل دخول للمحادثة
  });
}
