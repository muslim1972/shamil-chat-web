import { useState, useEffect } from 'react';
import { shamliService } from '../services/shamli';
import type { ShamliConnection, ShamliCategory } from '../types/shamli';

/**
 * Hook موحد للحصول على علاقة Shamli مع مستخدم معين
 * @param userId - معرف المستخدم المستهدف
 * @returns relationship, category, loading, error, refresh
 */
export const useShamliRelationship = (userId: string | null | undefined) => {
    const [relationship, setRelationship] = useState<ShamliConnection | null>(null);
    const [category, setCategory] = useState<ShamliCategory>('distant');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRelationship = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const conn = await shamliService.getConnectionWithUser(userId);

            if (conn) {
                setRelationship(conn);
                setCategory(getCategoryFromConnection(conn));
            } else {
                setRelationship(null);
                setCategory('distant');
            }
        } catch (err) {
            console.error('[useShamliRelationship] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load relationship');
            setCategory('distant');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRelationship();
    }, [userId]);

    return {
        relationship,
        category,
        loading,
        error,
        refresh: fetchRelationship
    };
};

/**
 * Helper function لتحديد الفئة من الاتصال
 */
/**
 * تحديد فئة العلاقة من الاتصال
 * المعايير المحدّثة:
 * - pinned: الثابتون (يبقون على تصنيفهم)
 * - khillan: الخلّان (>= 3 نجوم أو is_khillan)
 * - spotlight: دائرة الضوء (>= 2 نجوم)
 * - distant: البعيدون (نجمة واحدة أو لا اتصال)
 */
export const getCategoryFromConnection = (connection: ShamliConnection): ShamliCategory => {
    if (connection.is_pinned) return 'pinned';
    if (connection.is_khillan || connection.star_level >= 3) return 'khillan';
    if (connection.star_level >= 2) return 'spotlight';
    return 'distant';
};
