// src/hooks/aiChat/useAIConversationDetector.ts
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

/** Hook للتحقق من أن المحادثة هي محادثة AI */
export function useAIConversationDetector(conversationId?: string): boolean {
    const [isAIConversation, setIsAIConversation] = useState(false);

    useEffect(() => {
        if (!conversationId) {
            setIsAIConversation(false);
            return;
        }
        const checkIfAI = async () => {
            try {
                const { data, error } = await supabase
                    .from('conversations')
                    .select('type, name')
                    .eq('id', conversationId)
                    .single();
                if (error) {
                    console.error('Error checking conversation type:', error);
                    setIsAIConversation(false);
                    return;
                }
                const isAI = data?.type === 'ai' ||
                    data?.name?.toLowerCase().includes('ai') ||
                    data?.name?.toLowerCase().includes('المحاور');
                setIsAIConversation(isAI);
            } catch (error) {
                console.error('Error in useAIConversationDetector:', error);
                setIsAIConversation(false);
            }
        };
        checkIfAI();
    }, [conversationId]);

    return isAIConversation;
}
