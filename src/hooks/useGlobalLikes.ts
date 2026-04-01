/**
 * useGlobalLikes - Hook عالمي لإدارة الإعجابات
 * 
 * يدعم أنواع متعددة من العناصر (posts, articles, products, إلخ)
 * مع تحديثات فورية عبر Supabase Realtime
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// أنواع العناصر المدعومة
export type LikeableItemType = 'post' | 'article' | 'product' | 'video' | 'story';

// تحويل النوع إلى اسم الجدول والعمود
const getTableConfig = (itemType: LikeableItemType) => {
    switch (itemType) {
        case 'post':
            return { tableName: 'post_likes', idColumn: 'post_id' };
        case 'article':
            return { tableName: 'article_likes', idColumn: 'article_id' };
        case 'product':
            return { tableName: 'nadara_product_likes', idColumn: 'product_id' };
        case 'video':
            return { tableName: 'shamatube_emotions', idColumn: 'video_id' };
        case 'story':
            return { tableName: 'story_likes', idColumn: 'story_id' };
        default:
            return { tableName: 'post_likes', idColumn: 'post_id' };
    }
};

interface UseGlobalLikesOptions {
    itemId: number | string;
    itemType: LikeableItemType;
    currentUserId: string | null;
    initialLikesCount?: number;
    initialLiked?: boolean;
    client?: SupabaseClient;
}

export const useGlobalLikes = ({
    itemId,
    itemType,
    currentUserId,
    initialLikesCount = 0,
    initialLiked = false,
    client = supabase
}: UseGlobalLikesOptions) => {
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(initialLikesCount);

    // Track if we have a pending action (to skip realtime events during optimistic update)
    const pendingActionRef = useRef<'like' | 'unlike' | null>(null);

    const { tableName, idColumn } = getTableConfig(itemType);

    // Sync with props (Optimized for List View updates)
    useEffect(() => {
        setLikesCount(initialLikesCount);
    }, [initialLikesCount]);

    // Fetch initial status if not provided or to verify
    useEffect(() => {
        if (!currentUserId || !itemId) return;

        const fetchLikeStatus = async () => {
            try {
                const { data, error } = await client
                    .from(tableName)
                    .select(idColumn)
                    .eq(idColumn, itemId)
                    .eq('user_id', currentUserId)
                    .maybeSingle();

                if (!error) {
                    setLiked(!!data);
                }

                const { count, error: countError } = await client
                    .from(tableName)
                    .select(idColumn, { count: 'exact', head: true })
                    .eq(idColumn, itemId);

                if (!countError && count !== null) {
                    setLikesCount(count);
                }
            } catch (err) {
                console.error('[useGlobalLikes] Error fetching status:', err);
            }
        };

        fetchLikeStatus();
    }, [itemId, itemType, currentUserId, tableName, idColumn, client]);

    // 🎯 Direct Realtime Subscription with Filter
    useEffect(() => {
        if (!itemId) return;

        const channel = client
            .channel(`${itemType}_likes:${itemId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    filter: `${idColumn}=eq.${itemId}`
                },
                (payload: { eventType: string; new: any; old: any }) => {
                    // Skip if we have a pending action (we already did optimistic update)
                    if (pendingActionRef.current) {
                        if (import.meta.env.DEV) {
                            console.log(`🔔 [useGlobalLikes:${itemId}] Skipping (pending action):`, payload.eventType);
                        }
                        // Clear the pending action
                        pendingActionRef.current = null;
                        return;
                    }

                    if (import.meta.env.DEV) {
                        console.log(`🔔 [useGlobalLikes:${itemId}] External:`, payload.eventType);
                    }

                    if (payload.eventType === 'INSERT') {
                        setLikesCount(prev => prev + 1);
                    } else if (payload.eventType === 'DELETE') {
                        setLikesCount(prev => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe();

        return () => {
            client.removeChannel(channel);
        };
    }, [itemId, itemType, currentUserId, tableName, idColumn, client]);

    const toggleLike = async () => {
        if (!currentUserId) return;

        const previousLiked = liked;
        const previousCount = likesCount;

        // Mark pending action BEFORE optimistic update
        pendingActionRef.current = previousLiked ? 'unlike' : 'like';

        // Optimistic update
        setLiked(!previousLiked);
        setLikesCount(prev => prev + (!previousLiked ? 1 : -1));

        try {
            if (previousLiked) {
                const { error } = await client
                    .from(tableName)
                    .delete()
                    .eq(idColumn, itemId)
                    .eq('user_id', currentUserId);

                if (error) throw error;
            } else {
                // إعداد البيانات للإدراج
                const insertData: any = { [idColumn]: itemId, user_id: currentUserId };

                // 🌟 خاص بـ ShamaTube: إضافة emotion_type
                if (itemType === 'video') {
                    insertData['emotion_type'] = 'love'; // القيمة الافتراضية للإعجاب
                }

                const { error } = await client
                    .from(tableName)
                    .insert(insertData);

                if (error) throw error;
            }
        } catch (err) {
            console.error('[useGlobalLikes] Error toggling like:', err);
            // Revert
            pendingActionRef.current = null;
            setLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    return { liked, likesCount, toggleLike };
};

// تصدير للتوافق مع الكود القديم
export const useItemLikes = (
    itemId: number | string,
    itemType: 'post' | 'article',
    currentUserId: string | null,
    initialLikesCount: number = 0,
    initialLiked: boolean = false
) => useGlobalLikes({
    itemId,
    itemType,
    currentUserId,
    initialLikesCount,
    initialLiked
});
