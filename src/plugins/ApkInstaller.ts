import { registerPlugin } from '@capacitor/core';

/**
 * واجهة Plugin لتثبيت APK على Android
 */
export interface ApkInstallerPlugin {
    /**
     * فتح مثبت APK لملف محدد
     * @param options - كائن يحتوي على مسار الملف
     * @returns Promise<{ success: boolean }>
     */
    openApkFile(options: { filePath: string }): Promise<{ success: boolean }>;
}

const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller', {
    web: () => {
        // على الويب، نرجع plugin وهمي
        return {
            openApkFile: async () => {
                console.warn('APK installation is not supported on web platform');
                return { success: false };
            }
        };
    }
});

export default ApkInstaller;
