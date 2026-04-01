export const CACHE_CONFIG = {
  VERSION: 2, // زيادة الإصدار لإجبار تحديث الكاش
  MAX_SIZE_KB: 5120, // 5MB للكاش الدائم (زيادة للوسائط)

  // ✅ حد أقصى لكاش الميديا الكلي (1 جيجابايت)
  MAX_MEDIA_CACHE_SIZE_MB: 1024, // 1GB

  CONVERSATIONS_KEY: 'conversations',
  MESSAGES_PREFIX: 'messages_',
  METADATA_PREFIX: 'meta_',
  MEDIA_PREFIX: 'media_',
  THUMBNAIL_PREFIX: 'thumb_',

  // تحسينات الأداء للموبايل
  SYNC_INTERVAL_MS: 60000, // 60 ثانية (كان 30)
  PRELOAD_DELAY_MS: isMobile() ? 30000 : 5000, // 30 ثانية للموبايل، 5 للديسكتوب

  // حدود التحميل - Messages Cache
  INITIAL_MESSAGES_LIMIT: 15,     // عدد الرسائل الأولية (cold start)
  DISPLAY_WINDOW: 20,              // عدد الرسائل المعروضة في UI
  CACHE_LIMIT: 50,                 // أقصى عدد رسائل في memory
  MESSAGES_BATCH_SIZE: 10,         // حجم دفعة تحميل الرسائل القديمة
  MEDIA_BATCH_SIZE: 3,             // عدد الوسائط المحملة في كل مرة

  // حدود التحميل - Conversations Cache
  CONVERSATIONS_BATCH_SIZE: 5,     // عدد المحادثات المحملة في كل دفعة preload

  // تحكم في Real-time
  REALTIME_DELAY_MS: isMobile() ? 3000 : 0,      // تأخير Real-time للموبايل
  REALTIME_BATCH_DELAY_MS: 100,                  // تأخير batch للتحديثات الفورية
  DEBOUNCE_DELAY_MS: 500,                        // تأخير Debouncing

  // إعدادات الكاش
  CACHE_STALE_TIME: 30000,        // 30 ثانية قبل اعتبار البيانات قديمة
  CACHE_LIFETIME: 5 * 60 * 1000,  // 5 دقائق عمر الكاش
  MEDIA_CACHE_LIFETIME: 30 * 24 * 60 * 60 * 1000, // ✅ 30 يوم للوسائط (كان 7)

  // ✅ سياسة التنظيف التلقائي (LRU - Least Recently Used)
  CACHE_CLEANUP_ENABLED: true,
  CACHE_CLEANUP_THRESHOLD_MB: 900, // ابدأ التنظيف عند 900MB
  CACHE_CLEANUP_TARGET_MB: 700,    // نظّف حتى 700MB

  // Intersection Observer
  MEDIA_LOAD_MARGIN: '50px',      // تحميل الوسائط قبل 50px من الظهور
  MEDIA_LOAD_THRESHOLD: 0.01,     // نسبة الظهور المطلوبة

  // Performance
  USE_WEB_WORKERS: false,          // استخدام Web Workers (يمكن تفعيله لاحقاً)
  ENABLE_PROFILING: false,         // تفعيل قياس الأداء
} as const;

// دالة مساعدة للكشف عن الموبايل
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// دالة مساعدة للكشف عن الشبكة البطيئة
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // اعتبر الشبكة بطيئة إذا:
  return (
    connection.saveData === true ||  // وضع توفير البيانات
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    (connection.downlink && connection.downlink < 0.5) // أقل من 0.5 Mbps
  );
}

// دالة مساعدة لتحديد إعدادات الكاش حسب الجهاز
export function getOptimalCacheSettings() {
  const mobile = isMobile();
  const slowNetwork = isSlowNetwork();

  if (mobile && slowNetwork) {
    // موبايل مع شبكة بطيئة - أقل استهلاك
    return {
      messagesLimit: 10,
      mediaBatchSize: 1,
      preloadDelay: 60000,
      enablePreload: false
    };
  } else if (mobile) {
    // موبايل عادي
    return {
      messagesLimit: 15,
      mediaBatchSize: 3,
      preloadDelay: 30000,
      enablePreload: true
    };
  } else {
    // ديسكتوب
    return {
      messagesLimit: 30,
      mediaBatchSize: 5,
      preloadDelay: 5000,
      enablePreload: true
    };
  }
}

// إعدادات Service Worker
export const SW_CONFIG = {
  CACHE_NAME: 'shamil-app-v2',
  MEDIA_CACHE: 'media-cache-v2',
  API_CACHE: 'api-cache-v1',
  MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,  // تنظيف يومي
};

// رسائل التصحيح
export const DEBUG_CONFIG = {
  ENABLE_CACHE_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_NETWORK_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_LOGS: process.env.NODE_ENV === 'development',
};