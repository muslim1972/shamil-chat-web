import { supabase } from './supabase';

/**
 * Marks a message as read in the database
 * Since the messages table doesn't have an is_read column,
 * this function is a no-op but kept for API compatibility
 * @param messageId The ID of the message to mark as read
 * @returns Promise that resolves immediately
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  // No-op since there's no is_read column in the database
  return Promise.resolve();
};

/**
 * Marks all unread messages in a conversation as read
 * Since the messages table doesn't have an is_read column,
 * this function is a no-op but kept for API compatibility
 * @param conversationId The ID of the conversation
 * @param currentUserId The ID of the current user
 * @returns Promise that resolves immediately
 */
export const markAllMessagesAsRead = async (conversationId: string, currentUserId: string): Promise<void> => {
  // No-op since there's no is_read column in the database
  return Promise.resolve();
};
