import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface Participant {
  id: string;
  username: string;
  avatar_url?: string;
}

interface UseChatHeaderResult {
  isGroup: boolean;
  participants: Participant[];
  otherUserId: string | null;
  handleProfileClick: () => void;
  handleAvatarClick: () => void;
  displayGroupTitle: boolean;
}

export function useChatHeader(conversationId?: string): UseChatHeaderResult {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isGroup, setIsGroup] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!conversationId) return;

      try {
        // جلب تفاصيل المحادثة
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('is_group, participants')
          .eq('id', conversationId)
          .single();

        if (convError || !convData) return;

        setIsGroup(convData.is_group || false);

        // إذا كانت جماعية، جلب بيانات المشاركين
        if (convData.is_group && convData.participants) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .in('id', convData.participants);

          if (usersData) {
            setParticipants(usersData);
          }
        } else if (!convData.is_group && convData.participants && convData.participants.length > 0) {
          // إذا كانت فردية، تحديد المستخدم الآخر
          if (user?.id) {
            const otherUserIds = (convData.participants as string[]).filter((id: string) => id !== user.id);
            if (otherUserIds.length > 0) {
              setOtherUserId(otherUserIds[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversation details:', error);
      }
    };

    fetchConversationDetails();
  }, [conversationId, user?.id]);

  const handleProfileClick = useCallback(() => {
    if (otherUserId) {
      navigate(`/profile/${otherUserId}`);
    }
  }, [otherUserId, navigate]);

  const handleAvatarClick = useCallback(() => {
    if (otherUserId) {
      navigate(`/profile/${otherUserId}`);
    }
  }, [otherUserId, navigate]);

  const displayGroupTitle = isGroup && participants.length > 0;

  return {
    isGroup,
    participants,
    otherUserId,
    handleProfileClick,
    handleAvatarClick,
    displayGroupTitle,
  };
}