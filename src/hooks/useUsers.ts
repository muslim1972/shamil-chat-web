import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          throw new Error('المستخدم غير مسجل الدخول');
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', currentUser.id); // Exclude current user

        if (error) {
          throw error;
        }

        if (data) {
          // Format users data
          const formattedUsers: User[] = data.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
          }));

          setUsers(formattedUsers);
        }
      } catch (err: any) {
        console.error('Error fetching users:', err);
        setError(err.message || 'فشل في تحميل المستخدمين');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Create a new conversation with a user
  const createConversation = async (userId: string): Promise<string> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if conversation already exists
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [currentUser.id, userId]);

      if (checkError) {
        throw checkError;
      }

      if (existingConversations && existingConversations.length > 0) {
        // Return existing conversation ID
        return existingConversations[0].id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            name: userData.username || 'محادثة جديدة', // استخدام username أو قيمة افتراضية
            participants: [currentUser.id, userId],
            created_by: currentUser.id,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    createConversation,
  };
};