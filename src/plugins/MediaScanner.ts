/**
 * Media Scanner Plugin wrapper
 * يستخدم لتفعيل Media Scanner ليظهر الملف في المعرض
 */

import { registerPlugin } from '@capacitor/core';

export interface MediaScannerPlugin {
    /**
     * مسح ملف ليظهر في المعرض
     */
    scanFile(options: { path: string }): Promise<{
        path: string;
        uri: string | null;
        success: boolean;
    }>;

    /**
     * مسح مجلد كامل
     */
    scanFolder(options: { path: string }): Promise<{
        scannedCount: number;
        success: boolean;
    }>;
}

const MediaScanner = registerPlugin<MediaScannerPlugin>('MediaScanner');

export { MediaScanner };
