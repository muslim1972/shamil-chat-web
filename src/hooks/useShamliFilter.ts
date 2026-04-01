import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { shamliService } from '../services/shamli';
import type { ShamliConnection } from '../types/shamli';

// 🌌 أنواع الأولويات
export type ShamliPriority = 0 | 1 | 2 | 3 | 999; // 0=Me, 1=Pinned, 2=Khillan, 3=Spotlight, 999=Distant

export type ShamliFilterResult = {
    isVisible: boolean;
    priority: ShamliPriority;
    connection: ShamliConnection | null;
};

/**
 * 🌌 Hook عالمي لفلترة المحتوى حسب نظام شملي
 * يقوم بتحميل كل العلاقات مرة واحدة ويوفر دوال للفلترة والترتيب
 */
export const useShamliFilter = (currentUserId: string | null | undefined) => {
    const [connectionsMap, setConnectionsMap] = useState<Map<string, ShamliConnection>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    // 1. تحميل كل العلاقات مرة واحدة
    useEffect(() => {
        if (!currentUserId) {
            setConnectionsMap(new Map());
            setIsLoading(false);
            return;
        }

        const fetchAllConnections = async () => {
            setIsLoading(true);
            try {
                // نطلب كل العلاقات (الثابتون، الخلان، دائرة الضوء)
                // البعيدون (أقل من 2 نجوم) قد لا يكونون في العلاقات أصلاً أو بنجمات قليلة
                // لكننا سنجلب كل ما في الجدول لنكون دقيقين
                const allConnections = await shamliService.getConnections(); // يجلب الجميع

                const map = new Map<string, ShamliConnection>();
                allConnections.forEach(c => {
                    if (c.connected_user_id) {
                        map.set(c.connected_user_id, c);
                    }
                });

                setConnectionsMap(map);
                console.log('🌌 [useShamliFilter] Loaded connections map:', map.size);
            } catch (error) {
                console.error('🌌 [useShamliFilter] Error loading connections:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllConnections();

        // اشتراك في التغييرات الحية لجدول العلاقات
        // لضمان تحديث الفلتر فوراً إذا قمت بتثبيت صديق أو تغيير مستواه
        const channel = supabase
            .channel(`shamli-filter-${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shamil_connections',
                    filter: `user_id=eq.${currentUserId}`
                },
                () => {
                    console.log('🌌 [useShamliFilter] Connections changed, refreshing...');
                    fetchAllConnections();
                    setLastUpdated(Date.now());
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [currentUserId]);

    /**
     * حساب أولوية وظهور مستخدم معين
     */
    const checkUserStatus = useCallback((targetUserId: string): ShamliFilterResult => {
        // أنا
        if (currentUserId && targetUserId === currentUserId) {
            return { isVisible: true, priority: 0, connection: null };
        }

        const connection = connectionsMap.get(targetUserId);

        // غير موجود = بعيد
        if (!connection) {
            return { isVisible: false, priority: 999, connection: null };
        }

        // حساب الأولوية
        let priority: ShamliPriority = 999;
        let isVisible = false;

        if (connection.is_pinned) {
            priority = 1;
            isVisible = true;
        } else if (connection.is_khillan || connection.star_level >= 3) { // الخلان
            priority = 2;
            isVisible = true;
        } else if (connection.star_level >= 2) { // دائرة الضوء
            priority = 3;
            isVisible = true;
        } else {
            // نجمة واحدة أو 0 = بعيد
            priority = 999;
            isVisible = false;
        }

        return { isVisible, priority, connection };

    }, [currentUserId, connectionsMap]);


    /**
     * دالة مساعدة لفلترة وترتيب القوائم (منشورات، يوميات، إلخ)
     * @param items القائمة الأصلية
     * @param getUserId دالة لاستخراج معرف المستخدم من العنصر
     * @param getDate دالة لاستخراج التاريخ (للترتيب الثانوي)
     */
    const filterAndSortContent = useCallback(<T>(
        items: T[],
        getUserId: (item: T) => string,
        getDate?: (item: T) => string | Date
    ): T[] => {
        if (!currentUserId) return [];

        return items
            .filter(item => {
                const status = checkUserStatus(getUserId(item));
                return status.isVisible;
            })
            .sort((a, b) => {
                const statusA = checkUserStatus(getUserId(a));
                const statusB = checkUserStatus(getUserId(b));

                // الترتيب حسب الأولوية (الأقل = الأهم)
                if (statusA.priority !== statusB.priority) {
                    return statusA.priority - statusB.priority;
                }

                // إذا تساوت الأولوية، نرتب بالأحدث (إذا توفر التاريخ)
                if (getDate) {
                    const dateA = new Date(getDate(a)).getTime();
                    const dateB = new Date(getDate(b)).getTime();
                    return dateB - dateA; // الأحدث أولاً
                }

                return 0;
            });
    }, [currentUserId, checkUserStatus]);

    return {
        checkUserStatus,
        filterAndSortContent,
        isLoading,
        connectionsMap, // للمكونات التي تحتاج بيانات تفصيلية
        lastUpdated // لاستخدامها في مصفوفات الاعتمادية (Dependencies)
    };
};
