import { supabase } from './supabase';
import type { ShamliConnection, ShamliInteraction } from '../types/shamli';

export const shamliService = {
    /**
     * جلب قائمة المتصلين (دائرتي)
     * يمكن الفلترة حسب المستوى أو التثبيت
     */
    async getCurrentUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch fresh profile data including avatar
        const { data, error } = await supabase
            .from('users') // Assuming 'users' is the public profile table sync'd with auth
            .select('avatar_url, display_name, username')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        return data;
    },

    async getConnections(options?: {
        pinnedOnly?: boolean,
        khillanOnly?: boolean,
        minStars?: number,
        limit?: number
    }) { //: Promise<ShamliConnection[]>
        let query = supabase
            .from('shamil_connections')
            .select(`
        *,
        connected_user:users!connected_user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_online,
          last_seen
        )
      `)
            .order('is_pinned', { ascending: false }) // الثابتون أولاً
            .order('star_level', { ascending: false }) // ثم الأعلى نجوماً
            .order('interaction_score', { ascending: false }); // ثم الأكثر تفاعلاً

        if (options?.pinnedOnly) {
            query = query.eq('is_pinned', true);
        }
        if (options?.khillanOnly) {
            query = query.eq('is_khillan', true);
        }
        if (options?.minStars) {
            query = query.gte('star_level', options.minStars);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ShamliConnection[];
    },

    /**
     * جلب اقتراحات الرادار اليومي
     * تعتمد الخوارزمية على:
     * 1. أشخاص لم تتواصل معهم منذ فترة (Revive)
     * 2. خلان يحتاجون اهتمام (Maintain)
     */
    async getDailySuggestions() {
        const all = await this.getConnections();

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        // تصنيف الجميع أولاً
        const categorized = all.map(c => {
            const lastInteraction = new Date(c.last_interaction_at || 0); // Handle null as very old
            let type: 'forgotten' | 'drift' | 'normal' = 'normal';
            let reason = 'جرب أن تقول مرحباً ✨';

            if (c.star_level >= 3 && lastInteraction < sevenDaysAgo) {
                type = 'forgotten';
                reason = 'طال الغياب 🥀';
            } else if (lastInteraction < threeDaysAgo) {
                type = 'drift';
                reason = 'فرصة للتواصل 👋';
            }

            return { ...c, type, reason, lastInteraction };
        });

        // 🕵️‍♂️ تم حذف تقرير الرادار (Radar Debug) للإنتاج

        // 🛑 فلتر: استبعاد من تواصلنا معهم اليوم (0 أيام)
        // لا نريد اقتراح شخص كلمناه قبل ساعات
        const validCandidates = categorized.filter(c => {
            const daysAgo = (new Date().getTime() - c.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo >= 1; // يجب أن يكون قد مر يوم كامل على الأقل
        });

        // 1. المنسيون (الأولوية القصوى)
        const forgotten = validCandidates
            .filter(c => c.type === 'forgotten')
            .slice(0, 2);

        // 2. تواصل منقطع (باقي المقاعد حتى 3، أو أكثر إذا لم يوجد منسيون)
        const driftQuota = 5 - forgotten.length; // نملأ الباقي قدر الإمكان من الغائبين
        const drift = validCandidates
            .filter(c => c.type === 'drift')
            .filter(c => !forgotten.includes(c)) // لا ينبغي أن يحدث بسبب التصنيف، لكن للحيطة
            .sort(() => 0.5 - Math.random()) // عشوائي
            .slice(0, Math.min(3, driftQuota)); // نأخذ 3 كحد أقصى للغائبين العاديين

        // 3. ملء الفراغ (أي شخص آخر)
        const remainingQuota = 5 - (forgotten.length + drift.length);
        const others = validCandidates
            .filter(c => c.type === 'normal')
            .sort(() => 0.5 - Math.random())
            .slice(0, remainingQuota);

        // تجميع النتائج (يمكنك دمج "باقي الغائبين" هنا إذا أردت ملء القائمة كلها بغائبين بدلاً من العاديين)
        // لكن المستخدم يريد تنوعاً. إذا كان هناك "متعفنون" كثر ولم يسعهم الـ Drift، 
        // هل نظهرهم كـ "عاديين"؟ لا، يجب أن يظهروا بصفتهم الحقيقية إذا تم اختيارهم.

        // سنقوم بذكاء: إذا بقي مكان، نملؤه بأي شخص (حتى لو كان غائباً لم يتم اختياره في مرحلة drift)
        // لكن بصواب: نعطيه السبب الصحيح.
        let finalSelection = [...forgotten, ...drift, ...others];

        // إذا لم تكتمل 5، نملأ من "الباقي" (الغائبين الذين لم يحالفهم الحظ في القرعة الأولى)
        if (finalSelection.length < 5) {
            const usedIds = new Set(finalSelection.map(s => s.id));
            const leftovers = categorized
                .filter(c => !usedIds.has(c.id))
                .sort(() => 0.5 - Math.random())
                .slice(0, 5 - finalSelection.length);

            finalSelection = [...finalSelection, ...leftovers];
        }

        return finalSelection.map((c) => ({
            ...c, // ✅ Return full object to match ShamliConnection type
            reason: c.reason,
        }));
    },

    /**
     * تبديل حالة التثبيت (Toggle Pin)
     */
    async togglePin(connectionId: string, currentStatus: boolean) {
        // تحقق من الحد الأقصى (5) إذا كنا نريد التثبيت
        if (!currentStatus) {
            const { count } = await supabase
                .from('shamil_connections')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .eq('is_pinned', true);

            if (count && count >= 5) {
                throw new Error('لقد وصلت للحد الأقصى (5) من الثابتين');
            }
        }

        const { data, error } = await supabase
            .from('shamil_connections')
            .update({ is_pinned: !currentStatus })
            .eq('id', connectionId)
            .select()
            .single();

        if (error) throw error;
        return data as ShamliConnection;
    },

    /**
     * تبديل حالة الخلّان (Toggle Khillan)
     */
    /**
     * تبديل حالة الخلّان (Toggle Khillan)
     */
    async toggleKhillan(connectionId: string, currentStatus: boolean) {
        // 1. التحديث المبدئي (إما 5 نجوم عند الإضافة، أو 1 نجمة عند الإزالة مؤقتاً)
        const { data: updatedConnection, error: updateError } = await supabase
            .from('shamil_connections')
            .update({
                is_khillan: !currentStatus,
                star_level: !currentStatus ? 5 : 1 // نعيده لـ 1 حتى يقوم الـ Trigger بحسابه بدقة
            })
            .eq('id', connectionId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 2. إذا تمت الإزالة، نطلب من "العقل الذكي" إعادة الحساب فوراً للتأكد
        if (currentStatus === true) {
            // نحاول استدعاء الدالة إذا كانت موجودة لضمان الدقة (اختياري لأن التريجر قد يعمل عند أي تحديث)
            const { error: rpcError } = await supabase.rpc('update_shamli_score', {
                target_connection_id: connectionId
            });

            if (!rpcError) {
                const { data: refreshed } = await supabase
                    .from('shamil_connections')
                    .select('*')
                    .eq('id', connectionId)
                    .single();
                return refreshed as ShamliConnection;
            }
        }

        return updatedConnection as ShamliConnection;
    },

    /**
     * تسجيل تفاعل يدوي (إن لزم الأمر من الواجهة)
     * غالباً التفاعلات ستسجل تلقائياً عبر Triggers، لكن هذه للدوال الخاصة
     * @param toUserId - معرف المستخدم المستهدف
     * @param type - نوع التفاعل
     * @param weight - وزن التفاعل (افتراضي: 1)
     * @param appSource - مصدر التطبيق (اختياري)
     */
    async logInteraction(
        toUserId: string,
        type: ShamliInteraction['interaction_type'],
        weight: number = 1,
        appSource?: import('../types/shamli').AppSource
    ) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { error } = await supabase
            .from('shamil_interactions')
            .insert({
                from_user_id: user.id,
                to_user_id: toUserId,
                interaction_type: type,
                weight,
                app_source: appSource, // ✨ NEW: تتبع مصدر التفاعل
            });

        if (error) {
            console.error('ShamliService: Error logging interaction:', error);
            throw error;
        }

        const source = appSource ? `[${appSource}]` : '';
        console.log(`ShamliService: Interaction logged successfully ${source}`, type);
    },

    /**
     * التحقق من وجود علاقة مع مستخدم معين
     */
    async getConnectionWithUser(targetUserId: string) {
        const { data, error } = await supabase
            .from('shamil_connections')
            .select('*')
            .eq('connected_user_id', targetUserId)
            .maybeSingle(); // قد لا تكون هناك علاقة بعد

        if (error) throw error;
        return data as ShamliConnection | null;
    }
};
