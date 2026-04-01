export type StarLevel = 1 | 2 | 3 | 4 | 5;

// نوع مصدر التطبيق
export type AppSource =
    | 'conversations'
    | 'shagram'
    | 'shamatube'
    | 'nadara'
    | 'haja'
    | 'ai_chat';

// فئة العلاقة في Shamli
export type ShamliCategory =
    | 'pinned'     // الثابتون (1-5 مستخدمين)
    | 'khillan'    // الخلّان (4-5 نجوم)
    | 'spotlight'  // دائرة الضوء (1-3 نجوم)
    | 'distant';   // البعيدون (لا يوجد اتصال)

export interface ShamliConnection {
    id: string;
    user_id: string;
    connected_user_id: string;
    star_level: StarLevel;
    is_pinned: boolean;
    is_khillan: boolean;
    interaction_score: number;
    last_interaction_at: string;
    created_at: string;

    // بيانات المستخدم المتصل (Join)
    connected_user?: {
        id: string; // ✅ إضافة المعرف
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        is_online: boolean;
        last_seen: string | null;
    };
}

export interface ShamliInteraction {
    id: string;
    from_user_id: string;
    to_user_id: string;
    interaction_type: 'message' | 'like' | 'comment' | 'view_story' | 'call' | 'video_view' | 'share' | 'purchase';
    weight: number;
    app_source?: AppSource; // ✨ NEW: مصدر التطبيق
    related_entity_id?: string;
    created_at: string;
}

export interface ShamliStats {
    total_connections: number;
    khillan_count: number;
    pinned_count: number;
    total_interactions: number;
}

// Helper type لبيانات المستخدم مع Shamli
export interface UserWithShamli {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    shamliCategory?: ShamliCategory;
    shamliConnection?: ShamliConnection;
}
