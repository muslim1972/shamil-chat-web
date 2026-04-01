import { useCallback } from 'react';
import { shamliService } from '../services/shamli';
import type { AppSource, ShamliInteraction } from '../types/shamli';

/**
 * Hook لتسجيل التفاعلات في نظام Shamli
 * يوفر دالة logInteraction التي تسجل التفاعل مع المستخدم المستهدف
 * 
 * @param appSource - التطبيق المصدر (conversations, shagram, shamatube, etc.)
 * @returns { logInteraction } - دالة لتسجيل التفاعل
 * 
 * @example
 * const { logInteraction } = useShamliInteraction('shagram');
 * await logInteraction(userId, 'like', 1);
 */
export const useShamliInteraction = (appSource: AppSource) => {
    const logInteraction = useCallback(async (
        toUserId: string,
        type: ShamliInteraction['interaction_type'],
        weight?: number
    ) => {
        try {
            await shamliService.logInteraction(toUserId, type, weight, appSource);
            console.log(`[Shamli:${appSource}] Logged interaction: ${type} to ${toUserId}`);
        } catch (error) {
            console.error(`[useShamliInteraction:${appSource}] Error:`, error);
            // لا نرمي الخطأ لتجنب إيقاف التطبيق - التفاعلات Shamli ليست حرجة
        }
    }, [appSource]);

    return { logInteraction };
};
