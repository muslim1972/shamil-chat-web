// Export all types from this directory

// مستويات الصلاحيات
export type UserRole = 0 | 1 | 2; // 0=مستخدم, 1=مشرف, 2=مطور

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role_level?: UserRole; // صلاحية المستخدم
}

export interface Conversation {
  id: string;
  name: string;
  participants: string[]; // array of user IDs
  lastMessage?: string;
  // lastMessageMeta holds the raw last message object when available
  lastMessageMeta?: any;
  timestamp?: string;
  unread: boolean;
  unreadCount?: number;
  archived: boolean;
  avatar_url?: string;
  deleted_by_users?: string[]; // ✅ للمحادثات المحذوفة من مستخدمين معينين
}

export interface ConversationDetails {
  id: string;
  name: string;
  avatar_url?: string;
  is_group?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  content?: string;
  senderId: string;
  timestamp: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'forwarded_block' | 'alert';
  signedUrl?: string | null;
  caption?: string | null;
  media_metadata?: {
    duration?: number;
    // ✅ حقول جديدة للميديا المحسّن
    blurhash?: string;        // للعرض الفوري (BlurHash)
    orientation?: number;      // 1-8 (EXIF orientation)
    width?: number;           // العرض الحقيقي
    height?: number;          // الارتفاع الحقيقي
    [key: string]: any;
  } | null;
  status?: 'pending' | 'sending' | 'sent' | 'failed'; // 🔥 أضفت 'sending'
  isDeleted?: boolean;
  deleted_by_users?: string[]; // ✅ للرسائل المحذوفة من مستخدمين معينين
  isSenderDeleted?: boolean; // ✅ للرسائل المحذوفة من المرسل (النقطة الحمراء)
  uniqueId?: string;
  mediaBlob?: Blob;
  thumbnail?: string;
  sender?: {
    id?: string;
    username: string;
    avatar_url?: string;
  };
  isGroupChat?: boolean;
  isRead?: boolean;
  reply_to?: string | null; // ✅ تصحيح: استخدام reply_to بدلاً من reply_to_message_id
  reply_to_message?: {
    id: string;
    text: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
    sender_username?: string;
    sender?: { username: string };
    media_metadata?: any;
  } | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ✅ أنواع المقالات
export interface ArticleBlock {
  id: string;
  type: 'text' | 'image' | 'quote' | 'divider';
  content: string;
}

export interface Article {
  id: number;
  created_at: string;
  author_id: string;
  title: string;
  cover_image: string | null;
  content: ArticleBlock[];
  summary: string | null;
  likes_count: number;
  views_count: number;
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}