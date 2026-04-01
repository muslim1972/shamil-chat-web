import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';
import type { ReactNode } from 'react';

// ========================================
// الإعدادات الرئيسية
// ========================================
const CACHE_VERSION = 'v1'; // غيّر هذا إذا أردت مسح الكاش القديم
const MAX_AGE_DAYS = 7; // عدد الأيام قبل انتهاء الكاش
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// ========================================
// إنشاء Query Client
// ========================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // محاولة واحدة فقط عند الفشل
      refetchOnWindowFocus: false, // لا نريد إعادة جلب عند التركيز على النافذة
      refetchOnMount: false, // لا نريد إعادة جلب عند تحميل المكون
      staleTime: MAX_AGE_MS, // البيانات تبقى "طازجة" لمدة 7 أيام
      gcTime: MAX_AGE_MS, // لا تُحذف من الذاكرة لمدة 7 أيام
    },
  },
});

// ========================================
// إنشاء IndexedDB Persister
// ========================================
const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      try {
        return await get(key);
      } catch (error) {
        console.error('[QueryProvider] Error getting item from IndexedDB:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await set(key, value);
      } catch (error) {
        console.error('[QueryProvider] Error setting item to IndexedDB:', error);
      }
    },
    removeItem: async (key) => {
      try {
        await del(key);
      } catch (error) {
        console.error('[QueryProvider] Error removing item from IndexedDB:', error);
      }
    },
  },
  throttleTime: 1000, // حفظ كل ثانية بدلاً من كل تغيير
});

// ========================================
// المكون الرئيسي
// ========================================
interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: MAX_AGE_MS, // 7 أيام
        buster: CACHE_VERSION, // لمسح الكاش القديم عند تغيير البنية
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // احفظ فقط الـ queries الناجحة
            return query.state.status === 'success';
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

// ========================================
// تصدير queryClient للاستخدام الخارجي
// ========================================
export { queryClient };