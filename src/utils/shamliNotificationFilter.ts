/**
 * 🌌 فلترة إشعارات شملي
 * يحجب المحتوى عن المستخدمين في المدار الرابع (البعيدين)
 */

import { supabase } from '../services/supabase';

/**
 * التحقق مما إذا كان المستخدم يجب أن يستقبل إشعارات من مستخدم آخر
 * @param currentUserId - معرف المستخدم الحالي (المستقبِل)
 * @param actorUserId - معرف المستخدم صاحب الحدث (المرسِل)
 * @returns true إذا كان يجب عرض الإشعار (ليس بعيداً)
 */
export async function shouldReceiveNotification(
    currentUserId: string,
    actorUserId: string
): Promise<boolean> {
    // لا نحجب أحداث المستخدم نفسه (هذه تُفلتر في مكان آخر)
    if (currentUserId === actorUserId) return false;

    try {
        // جلب علاقة شملي بين المستخدم الحالي والمستخدم الآخر
        const { data: connection } = await supabase
            .from('shamil_connections')
            .select('star_level, is_pinned, is_khillan')
            .eq('user_id', currentUserId)
            .eq('connected_user_id', actorUserId)
            .maybeSingle();

        // إذا لا يوجد اتصال = بعيد، لا نعرض الإشعار
        if (!connection) return false;

        // الثابتون دائماً يستقبلون
        if (connection.is_pinned) return true;

        // الخلان (>= 3 نجوم)
        if (connection.is_khillan || connection.star_level >= 3) return true;

        // دائرة الضوء (>= 2 نجوم)
        if (connection.star_level >= 2) return true;

        // البعيدون (نجمة واحدة أو أقل) - لا نعرض الإشعار
        return false;
    } catch (error) {
        console.error('[shamliNotificationFilter] Error checking relationship:', error);
        // في حالة الخطأ، نعرض الإشعار للحفاظ على التجربة
        return true;
    }
}

/**
 * جلب قائمة معرفات المستخدمين الذين ليسوا بعيدين (للفلترة الجماعية)
 * هذا أكثر كفاءة عند التعامل مع قوائم كبيرة
 * @param currentUserId - معرف المستخدم الحالي
 * @returns قائمة معرفات المستخدمين في المدارات القريبة
 */
export async function getNonDistantUserIds(currentUserId: string): Promise<string[]> {
    try {
        const { data: connections } = await supabase
            .from('shamil_connections')
            .select('connected_user_id, star_level, is_pinned, is_khillan')
            .eq('user_id', currentUserId);

        if (!connections) return [];

        // فلترة المستخدمين في المدارات القريبة فقط
        // الثابتون + الخلان (>= 3 نجوم) + دائرة الضوء (>= 2 نجوم)
        return connections
            .filter(c => c.is_pinned || c.is_khillan || c.star_level >= 2)
            .map(c => c.connected_user_id);
    } catch (error) {
        console.error('[shamliNotificationFilter] Error fetching non-distant users:', error);
        return [];
    }
}

/**
 * التحقق السريع من فئة المستخدم (للاستخدام المتزامن)
 * @returns 'close' للقريبين، 'distant' للبعيدين
 */
export function getCategoryQuick(
    connection: { star_level: number; is_pinned: boolean; is_khillan: boolean } | null
): 'close' | 'distant' {
    if (!connection) return 'distant';
    if (connection.is_pinned) return 'close';
    if (connection.is_khillan || connection.star_level >= 3) return 'close';
    if (connection.star_level >= 2) return 'close';
    return 'distant';
}
