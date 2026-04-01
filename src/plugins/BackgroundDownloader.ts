import { registerPlugin } from '@capacitor/core';

/**
 * واجهة Plugin للتنزيل في الخلفية باستخدام Android DownloadManager
 */
export interface BackgroundDownloaderPlugin {
    /**
     * بدء تنزيل ملف
     * @param options - خيارات التنزيل
     */
    downloadFile(options: {
        url: string;
        fileName?: string;
        title?: string;
        description?: string;
    }): Promise<{
        downloadId: number;
        status: string;
        filePath: string;
    }>;

    /**
     * الحصول على حالة التنزيل
     * @param options - معرف التنزيل (اختياري)
     */
    getDownloadStatus(options?: {
        downloadId?: number;
    }): Promise<{
        downloadId: number;
        status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'unknown';
        progress: number;
        bytesDownloaded: number;
        bytesTotal: number;
        filePath?: string;
    }>;

    /**
     * إلغاء التنزيل
     * @param options - معرف التنزيل (اختياري)
     */
    cancelDownload(options?: {
        downloadId?: number;
    }): Promise<{ success: boolean }>;

    /**
     * التحقق من وجود تنزيل جاري أو ملف موجود
     */
    checkExistingDownload(): Promise<{
        status: 'downloading' | 'completed' | 'file_exists' | 'no_download' | 'pending' | 'paused' | 'failed';
        filePath?: string;
        downloadId?: number;
        progress?: number;
    }>;

    /**
     * مسح حالة التنزيل المحفوظة
     */
    clearState(): Promise<{ success: boolean }>;

    /**
     * حذف جميع ملفات APK المُنزّلة ومسح حالة التنزيل
     * يُستخدم عند رفض التثبيت أو بعد إتمامه
     */
    deleteApkFile(): Promise<{ success: boolean; deletedCount: number }>;

    /**
     * الاستماع لحدث اكتمال التنزيل
     */
    addListener(
        eventName: 'downloadComplete',
        listenerFunc: (data: {
            downloadId: number;
            status: 'completed' | 'failed';
            filePath?: string;
            reason?: number;
        }) => void
    ): Promise<{ remove: () => void }>;
}

const BackgroundDownloader = registerPlugin<BackgroundDownloaderPlugin>('BackgroundDownloader', {
    web: () => {
        // على الويب، نرجع plugin وهمي
        return {
            downloadFile: async () => {
                console.warn('BackgroundDownloader is not supported on web platform');
                return { downloadId: -1, status: 'failed', filePath: '' };
            },
            getDownloadStatus: async () => {
                return { downloadId: -1, status: 'unknown' as const, progress: 0, bytesDownloaded: 0, bytesTotal: 0 };
            },
            cancelDownload: async () => {
                return { success: false };
            },
            checkExistingDownload: async () => {
                return { status: 'no_download' as const };
            },
            clearState: async () => {
                return { success: true };
            },
            deleteApkFile: async () => {
                return { success: true, deletedCount: 0 };
            },
            addListener: async () => {
                return { remove: () => { } };
            }
        };
    }
});

export default BackgroundDownloader;
