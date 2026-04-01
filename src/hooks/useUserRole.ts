import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import type { UserRole } from '../types';

interface UserRoleState {
    roleLevel: UserRole;
    isLoading: boolean;
    isDeveloper: boolean;  // role_level = 2
    isModerator: boolean;  // role_level = 1
    isAdmin: boolean;      // role_level >= 1 (مشرف أو مطور)
}

/**
 * Hook لجلب صلاحية المستخدم الحالي
 * - يجلب role_level من جدول users
 * - يخزن النتيجة في cache محلي
 */
export const useUserRole = (): UserRoleState => {
    const { user } = useAuth();
    const [roleLevel, setRoleLevel] = useState<UserRole>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            if (!user?.id) {
                setRoleLevel(0);
                setIsLoading(false);
                return;
            }

            console.log('[useUserRole] Fetching role for user:', user.id);

            // التحقق من الـ Cache أولاً
            const cacheKey = `shamil_role_${user.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { level, timestamp } = JSON.parse(cached);
                    // Cache صالح لمدة دقيقة واحدة فقط
                    if (Date.now() - timestamp < 1 * 60 * 1000) {
                        console.log('[useUserRole] Using cached role:', level);
                        setRoleLevel(level as UserRole);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.log('[useUserRole] Invalid cache, fetching fresh');
                }
            }

            try {
                console.log('[useUserRole] Fetching from DB...');
                const { data, error } = await supabase
                    .from('users')
                    .select('role_level')
                    .eq('id', user.id)
                    .single();

                console.log('[useUserRole] DB response:', { data, error });

                if (error) {
                    console.error('[useUserRole] Error fetching role:', error);
                    setRoleLevel(0);
                } else {
                    const level = (data?.role_level ?? 0) as UserRole;
                    console.log('[useUserRole] Setting role level:', level);
                    setRoleLevel(level);

                    // تخزين في الـ Cache
                    localStorage.setItem(cacheKey, JSON.stringify({
                        level,
                        timestamp: Date.now()
                    }));
                }
            } catch (err) {
                console.error('[useUserRole] Exception:', err);
                setRoleLevel(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();
    }, [user?.id]);

    return {
        roleLevel,
        isLoading,
        isDeveloper: roleLevel === 2,
        isModerator: roleLevel === 1,
        isAdmin: roleLevel >= 1, // مشرف أو مطور
    };
};
