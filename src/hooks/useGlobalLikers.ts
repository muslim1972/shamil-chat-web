/**
 * useGlobalLikers - Hook عالمي لجلب وعرض قائمة المعجبين
 * 
 * يدعم النقر المطول لإظهار قائمة المعجبين
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LikeableItemType } from './useGlobalLikes';

// نوع بيانات المستخدم المختصرة
export interface LikerUser {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
}

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

interface UseGlobalLikersOptions {
    itemType: LikeableItemType;
    currentUserId?: string | null;
    client?: SupabaseClient;
    longPressDelay?: number;
}

export const useGlobalLikers = ({
    itemType,
    currentUserId = null,
    client = supabase,
    longPressDelay = 500
}: UseGlobalLikersOptions) => {
    const [openItemId, setOpenItemId] = useState<number | string | null>(null);
    const [likers, setLikers] = useState<LikerUser[]>([]);
    const [loading, setLoading] = useState(false);

    const longPressTimerRef = useRef<number | null>(null);
    const suppressNextClickRef = useRef<boolean>(false);

    const { tableName, idColumn } = getTableConfig(itemType);

    // إغلاق القائمة عند النقر خارجها
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!openItemId) return;
            const target = e.target as HTMLElement;
            if (target.closest?.('[data-likers-menu]') || target.closest?.('[data-like-button]')) return;
            setOpenItemId(null);
            setLikers([]);
        };

        if (openItemId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openItemId]);

    // جلب قائمة المعجبين
    const fetchLikers = useCallback(async (itemId: number | string) => {
        setLoading(true);
        try {
            // 1. جلب معرفات المستخدمين من جدول الإعجابات
            const { data: likesData, error: likesError } = await client
                .from(tableName)
                .select('user_id')
                .eq(idColumn, itemId)
                .order('created_at', { ascending: false });

            if (likesError) throw likesError;

            if (!likesData || likesData.length === 0) {
                setLikers([]);
                setLoading(false);
                return;
            }

            // استخراج المعرفات واستبعاد المستخدم الحالي
            const userIds = likesData
                .map((r: any) => r.user_id)
                .filter((uid: string) => uid && (!currentUserId || String(uid) !== String(currentUserId)));

            if (userIds.length === 0) {
                setLikers([]);
                setLoading(false);
                return;
            }

            // 2. جلب تفاصيل المستخدمين من جدول المستخدمين
            const { data: usersData, error: usersError } = await client
                .from('users')
                .select('id, username, display_name, avatar_url')
                .in('id', userIds);

            if (usersError) throw usersError;

            // إعادة ترتيب المستخدمين حسب ترتيب الإعجاب
            const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
            const orderedUsers = userIds
                .map((uid: string) => usersMap.get(uid))
                .filter((u: any): u is LikerUser => !!u);

            setLikers(orderedUsers);
        } catch (err) {
            console.error('[useGlobalLikers] Error fetching likers:', err);
            setLikers([]);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, tableName, idColumn, client]);

    // بدء النقر المطول
    const handleLongPressStart = useCallback((itemId: number | string) => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = window.setTimeout(async () => {
            suppressNextClickRef.current = true;
            setOpenItemId(itemId);
            await fetchLikers(itemId);
        }, longPressDelay);
    }, [fetchLikers, longPressDelay]);

    // إلغاء النقر المطول
    const handleLongPressCancel = useCallback(() => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // إغلاق القائمة
    const closeLikers = useCallback(() => {
        setOpenItemId(null);
        setLikers([]);
    }, []);

    // التحقق من أن النقرة يجب أن تُمنع (بعد النقر المطول)
    const shouldSuppressClick = useCallback(() => {
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return true;
        }
        return false;
    }, []);

    return {
        openItemId,
        likers,
        loading,
        handleLongPressStart,
        handleLongPressCancel,
        closeLikers,
        shouldSuppressClick,
        // للتوافق مع الكود القديم
        openLikersPostId: openItemId,
        suppressNextLikeClickRef: suppressNextClickRef,
        setOpenLikersPostId: setOpenItemId,
        setLikers
    };
};
