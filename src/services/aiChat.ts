import { supabase } from '@/services/supabase';

export async function ensureBotConversation(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_ai_conversation_v1', { p_user_id: userId });
  if (error) {
    console.error('ensure_ai_conversation_v1 RPC error', error);
    return null;
  }
  if (typeof data === 'string') return data;
  if (data && (data as any).id) return (data as any).id as string;
  return null;
}
