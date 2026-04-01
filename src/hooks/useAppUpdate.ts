import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import ApkInstaller from '../plugins/ApkInstaller';
import toast from 'react-hot-toast';
import { checkForUpdate, compareVersions } from '../utils/updateUtils';
import packageJson from '../../package.json';

export interface UpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
    forceUpdate?: boolean;
}

// ثوابت للتخزين المحلي
const PENDING_INSTALL_KEY = 'pendingInstall';
const DOWNLOAD_STATE_KEY = 'downloadState';
const APK_FOLDER = 'shamilapp';
const APK_FILENAME = 'ShamilApp.apk';
const APK_PATH = `${APK_FOLDER}/${APK_FILENAME}`;

interface DownloadState {
    state: 'downloading' | 'completed' | 'failed';
    url: string;
    startTime: number;
    errorMessage?: string;
}

export const useAppUpdate = () => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [showInstallDialog, setShowInstallDialog] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [installFilePath, setInstallFilePath] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showRetryDialog, setShowRetryDialog] = useState(false);
    const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null);

    // استخدام ref لتتبع ما إذا كان التنزيل جارياً (لتجنب إعادة المحاولة أثناء التنزيل)
    const downloadingRef = useRef(false);
    const cleanupDoneRef = useRef(false);

    // 🔥 تنظيف إجباري شامل عند نهوض التطبيق
    const forceCleanupOnStartup = useCallback(async () => {
        // منع التنظيف المتكرر في نفس الجلسة
        if (cleanupDoneRef.current) return;
        cleanupDoneRef.current = true;

        const platform = Capacitor.getPlatform();
        const currentVersion = packageJson.version;

        // 1. فحص وحذف PENDING_INSTALL_KEY إذا كانت النسخة غير أحدث
        const pendingInstall = localStorage.getItem(PENDING_INSTALL_KEY);
        if (pendingInstall) {
            try {
                const data = JSON.parse(pendingInstall);
                if (!data.version || compareVersions(data.version, currentVersion) <= 0) {
                    localStorage.removeItem(PENDING_INSTALL_KEY);
                }
            } catch (e) {
                localStorage.removeItem(PENDING_INSTALL_KEY);
            }
        }

        // 2. فحص وحذف lastDownloadedVersion إذا كانت غير أحدث
        const lastDownloadedVersion = localStorage.getItem('lastDownloadedVersion');
        if (lastDownloadedVersion && compareVersions(lastDownloadedVersion, currentVersion) <= 0) {
            localStorage.removeItem('lastDownloadedVersion');
        }

        // 3. حذف DOWNLOAD_STATE_KEY (حالة التنزيل) دائماً عند النهوض
        localStorage.removeItem(DOWNLOAD_STATE_KEY);

        // 4. حذف ملفات APK القديمة من الجهاز (Android فقط)
        if (platform === 'android') {
            try {
                const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
                const status = await BackgroundDownloader.checkExistingDownload();

                if (status.status === 'file_exists' || status.status === 'completed') {
                    const savedVersion = localStorage.getItem('lastDownloadedVersion');
                    if (!savedVersion || compareVersions(savedVersion, currentVersion) <= 0) {
                        await BackgroundDownloader.deleteApkFile();
                    }
                }
            } catch (e) {
                // تعذر فحص/حذف APK
            }

            // حذف من Cache أيضاً
            try {
                await Filesystem.deleteFile({
                    path: APK_PATH,
                    directory: Directory.Cache
                });
            } catch (e) {
                // الملف غير موجود - لا مشكلة
            }
        }
    }, []);

    // تنفيذ التنظيف عند التحميل الأولي
    useEffect(() => {
        forceCleanupOnStartup();
    }, [forceCleanupOnStartup]);

    // التحقق من التحديثات
    const checkUpdate = async (silent = false) => {
        setIsChecking(true);
        try {
            const info = await checkForUpdate();
            setUpdateInfo(info);

            if (info.hasUpdate && !silent) {
                setShowUpdateDialog(true);
            } else if (!silent) {
                toast.success('أنت تستخدم أحدث إصدار من التطبيق', {
                    icon: '✨',
                    style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                    },
                });
            }
            return info;
        } finally {
            setIsChecking(false);
        }
    };

    // دالة للتحقق من وجود ملف APK باستخدام BackgroundDownloader أولاً ثم Filesystem
    const checkExistingApk = useCallback(async (): Promise<string | null> => {
        const platform = Capacitor.getPlatform();
        if (platform !== 'android') return null;

        try {
            const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
            const result = await BackgroundDownloader.checkExistingDownload();

            if (result.status === 'file_exists' && result.filePath) {
                console.log('✅ Found existing APK via BackgroundDownloader (file_exists):', result.filePath);
                return result.filePath;
            } else if (result.status === 'completed' && result.filePath) {
                console.log('✅ Found existing APK via BackgroundDownloader (completed):', result.filePath);
                return result.filePath;
            }

            console.log('📭 No existing APK found via BackgroundDownloader');
            return null;
        } catch (e) {
            console.warn('BackgroundDownloader check failed, falling back to Filesystem:', e);

            // Fallback to Filesystem check
            try {
                await Filesystem.stat({
                    path: APK_PATH,
                    directory: Directory.Cache,
                });

                const uriResult = await Filesystem.getUri({
                    path: APK_PATH,
                    directory: Directory.Cache,
                });

                console.log('✅ Found existing APK via Filesystem:', uriResult.uri);
                return uriResult.uri;
            } catch {
                console.log('📭 No existing APK found in cache');
                return null;
            }
        }
    }, []);

    // دالة مساعدة لحذف ملف APK من كل الأماكن
    const deleteApkFile = async () => {
        const platform = Capacitor.getPlatform();
        if (platform !== 'android') return;

        try {
            const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
            await BackgroundDownloader.deleteApkFile();
            console.log('🗑️ APK deleted from BackgroundDownloader');
        } catch (e) {
            console.warn('Could not delete from BackgroundDownloader:', e);
        }

        try {
            await Filesystem.deleteFile({
                path: APK_PATH,
                directory: Directory.Cache
            });
            console.log('🗑️ APK deleted from Cache');
        } catch (e) {
            console.log('Cache file already clean');
        }
    };

    // دالة لاستعادة حالة التثبيت أو التنزيل المعلق
    const restorePendingState = useCallback(async () => {
        // إذا كان التنزيل جارياً، لا تفعل شيئاً
        if (downloadingRef.current) {
            console.log('⏳ Download in progress, skipping restore');
            return false;
        }

        const platform = Capacitor.getPlatform();

        // 🔥 الخطوة 1: التحقق من النسخة على الشبكة أولاً
        let latestVersionOnline: string | null = null;
        try {
            const updateInfo = await checkForUpdate();
            latestVersionOnline = updateInfo.latestVersion;
            console.log('🌐 Latest version online:', latestVersionOnline);
        } catch (e) {
            console.warn('Could not check online version:', e);
        }

        // 🔥 الخطوة 2: التحقق من وجود تثبيت معلق في localStorage
        const pendingInstall = localStorage.getItem(PENDING_INSTALL_KEY);
        if (pendingInstall) {
            try {
                const data = JSON.parse(pendingInstall);
                console.log('📂 Found pending install in localStorage:', data);

                // التحقق من صلاحية الوقت (24 ساعة)
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    // 🔥 المرحلة الثانية: مقارنة النسخة المحفوظة في APK مع النسخة الحالية
                    const currentVersion = packageJson.version;
                    console.log(`📊 Stage 2: Comparing APK version (${data.version}) with current app version (${currentVersion})`);

                    if (data.version && compareVersions(data.version, currentVersion) > 0) {
                        // 🔥 مقارنة ثلاثية: تحقق إضافي من وجود نسخة أحدث على الموقع
                        if (latestVersionOnline && compareVersions(latestVersionOnline, data.version) > 0) {
                            // النسخة على الموقع أحدث من APK المحفوظ - حذف APK القديم وعرض التحديث الجديد
                            console.log(`🔄 Newer version online (${latestVersionOnline} > ${data.version}) - deleting old APK`);
                            await deleteApkFile();
                            localStorage.removeItem(PENDING_INSTALL_KEY);
                            localStorage.removeItem('lastDownloadedVersion');
                            return false; // سيعرض updateDialog من checkUpdate
                        }
                        // APK لا يزال أحدث نسخة متاحة - عرض خيار التثبيت
                        console.log(`✅ APK is newest available (${data.version} > ${currentVersion}) - showing install dialog`);
                        setInstallFilePath(data.filePath);
                        setShowInstallDialog(true);
                        return true;
                    } else {
                        // APK ليس أحدث - حذفه
                        console.log(`🗑️ Deleting APK (${data.version} <= ${currentVersion}) - not newer than current version`);
                        await deleteApkFile();
                        localStorage.removeItem(PENDING_INSTALL_KEY);
                        localStorage.removeItem('lastDownloadedVersion');
                        return false;
                    }
                } else {
                    console.log('⏰ Pending install expired - deleting');
                    await deleteApkFile();
                    localStorage.removeItem(PENDING_INSTALL_KEY);
                }
            } catch (error) {
                console.error('Failed to parse pending install:', error);
                localStorage.removeItem(PENDING_INSTALL_KEY);
            }
        }

        // 🔥 الخطوة 3: التحقق من BackgroundDownloader للتنزيل الجاري أو المكتمل
        if (platform === 'android') {
            try {
                const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
                const status = await BackgroundDownloader.checkExistingDownload();

                console.log('📊 BackgroundDownloader status:', status);

                if (status.status === 'completed' && status.filePath) {
                    // التنزيل اكتمل في الخلفية!
                    console.log('🎉 Download completed in background!');
                    localStorage.removeItem(DOWNLOAD_STATE_KEY);

                    // حفظ مع رقم النسخة
                    localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify({
                        filePath: status.filePath,
                        version: latestVersionOnline || packageJson.version,
                        timestamp: Date.now()
                    }));
                    setInstallFilePath(status.filePath);
                    setShowInstallDialog(true);
                    toast.success('تم تحميل التحديث بنجاح');
                    return true;
                } else if (status.status === 'downloading' || status.status === 'pending') {
                    // التنزيل لا يزال جارياً
                    console.log('⏳ Download still in progress...');
                    toast.loading(`جاري التحميل... ${status.progress || 0}%`);
                    return false;
                } else if (status.status === 'file_exists' && status.filePath) {
                    // ملف موجود من تنزيل سابق - لكن نتحقق من نسخته
                    console.log('📦 Found existing APK file');

                    // محاولة قراءة النسخة من localStorage
                    const savedVersion = localStorage.getItem('lastDownloadedVersion');
                    const currentVersion = packageJson.version;

                    console.log(`📊 Stage 2: Checking existing APK file`);

                    if (savedVersion && compareVersions(savedVersion, currentVersion) > 0) {
                        // 🔥 مقارنة ثلاثية: تحقق إضافي من وجود نسخة أحدث على الموقع
                        if (latestVersionOnline && compareVersions(latestVersionOnline, savedVersion) > 0) {
                            // النسخة على الموقع أحدث من APK المحفوظ - حذف APK القديم
                            console.log(`🔄 Newer version online (${latestVersionOnline} > ${savedVersion}) - deleting old APK`);
                            await deleteApkFile();
                            localStorage.removeItem('lastDownloadedVersion');
                            return false; // سيعرض updateDialog من checkUpdate
                        }
                        // APK لا يزال أحدث نسخة متاحة - عرض خيار التثبيت
                        console.log(`✅ Existing APK is newest available (${savedVersion} > ${currentVersion}) - showing install dialog`);
                        setInstallFilePath(status.filePath);
                        setShowInstallDialog(true);
                        return true;
                    } else {
                        // APK ليس أحدث - حذفه
                        console.log(`🗑️ Deleting existing APK (${savedVersion} <= ${currentVersion})`);
                        await deleteApkFile();
                        localStorage.removeItem('lastDownloadedVersion');
                        return false;
                    }
                }
            } catch (e) {
                console.warn('BackgroundDownloader check failed:', e);
            }
        }

        // 🔥 الخطوة 4: التحقق من localStorage للتنزيل الفاشل
        const downloadState = localStorage.getItem(DOWNLOAD_STATE_KEY);
        if (downloadState) {
            try {
                const data: DownloadState = JSON.parse(downloadState);
                console.log('📥 Found download state in localStorage:', data);

                if (data.state === 'downloading') {
                    // التنزيل كان جارياً - التحقق من وجود الملف
                    const existingApkUri = await checkExistingApk();

                    if (existingApkUri) {
                        // الملف موجود! التنزيل اكتمل
                        console.log('🎉 APK found!');
                        localStorage.removeItem(DOWNLOAD_STATE_KEY);
                        localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify({
                            filePath: existingApkUri,
                            version: latestVersionOnline || packageJson.version,
                            timestamp: Date.now()
                        }));
                        setInstallFilePath(existingApkUri);
                        setShowInstallDialog(true);
                        toast.success('تم تحميل التحديث بنجاح');
                        return true;
                    } else {
                        // الملف غير موجود - التنزيل فشل
                        console.log('❌ Download failed');
                        localStorage.removeItem(DOWNLOAD_STATE_KEY);
                        setLastDownloadUrl(data.url);
                        setShowRetryDialog(true);
                        toast.error('فشل تحميل التحديث. يمكنك إعادة المحاولة.');
                        return false;
                    }
                }
            } catch (error) {
                console.error('Failed to parse download state:', error);
                localStorage.removeItem(DOWNLOAD_STATE_KEY);
            }
        }

        return false;
    }, [checkExistingApk]);

    // استعادة الحالة عند التحميل الأولي
    useEffect(() => {
        restorePendingState();
    }, [restorePendingState]);

    // الاستماع لحدث عودة التطبيق من الخلفية
    useEffect(() => {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') return;

        const handleAppStateChange = (state: { isActive: boolean }) => {
            console.log('📱 App state changed:', state.isActive ? 'foreground' : 'background');
            if (state.isActive) {
                // عند عودة التطبيق للمقدمة، تحقق من الحالات المعلقة
                restorePendingState();
            }
        };

        App.addListener('appStateChange', handleAppStateChange);

        return () => {
            App.removeAllListeners();
        };
    }, [restorePendingState]);


    // فتح المثبت
    const openInstaller = async (specificUri?: string) => {
        try {
            const platform = Capacitor.getPlatform();
            if (platform !== 'android') {
                console.warn('⚠️ APK installation works only on Android. Current platform:', platform);
                toast.error('التثبيت متاح فقط على أندرويد');
                return;
            }

            let fileUriToOpen = specificUri;

            if (!fileUriToOpen) {

                try {
                    const result = await Filesystem.getUri({
                        path: APK_PATH,
                        directory: Directory.Cache,
                    });
                    fileUriToOpen = result.uri;
                } catch (e) {
                    console.error('File not found', e);
                    toast.error('ملف التثبيت غير موجود');
                    return;
                }
            }

            console.log('Opening installer for:', fileUriToOpen);
            const result = await ApkInstaller.openApkFile({ filePath: fileUriToOpen! });

            if (result.success) {
                console.log('APK installer opened successfully');
            }
        } catch (error) {
            console.error('Installer error:', error);
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            toast.error(`فشل تثبيت: ${msg}`);
        }
    };

    // تحميل وتثبيت APK باستخدام BackgroundDownloader
    const downloadAndInstallAPK = async (url: string) => {
        // منع التنزيل المتكرر
        if (downloadingRef.current) {
            console.log('⚠️ Download already in progress');
            return;
        }

        const toastId = toast.loading('جاري بدء التحميل...');
        setIsDownloading(true);
        downloadingRef.current = true;
        setLastDownloadUrl(url);

        try {
            const platform = Capacitor.getPlatform();
            console.log('📱 Platform:', platform);
            console.log('🌐 Download URL:', url);

            if (platform === 'web') {
                toast.dismiss(toastId);
                console.log('🌐 Web platform - using direct download');
                const link = document.createElement('a');
                link.href = url;
                link.download = APK_FILENAME;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log('✅ Download started in browser');

                // إبلاغ صفحة الهبوط إذا كانت موجودة
                notifyLandingPage('DOWNLOAD_COMPLETE');
                setIsDownloading(false);
                downloadingRef.current = false;
                return;
            }

            console.log('📱 Android platform - using BackgroundDownloader');
            toast.loading('جاري تحميل ملف التحديث... (يمكنك ترك التطبيق)', { id: toastId });

            // حفظ حالة التنزيل قبل البدء (للتعامل مع الخلفية)
            localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify({
                state: 'downloading',
                url: url,
                startTime: Date.now()
            } as DownloadState));

            // استخدام BackgroundDownloader (يعمل حتى في الخلفية)
            const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');

            const result = await BackgroundDownloader.downloadFile({
                url: url,
                fileName: APK_FILENAME,
                title: 'تحديث شامل آب',
                description: 'جاري تحميل التحديث...'
            });

            console.log('📥 Download started with ID:', result.downloadId);
            toast.loading('جاري التحميل في الخلفية...', { id: toastId });

            // الاستماع لاكتمال التنزيل
            const listener = await BackgroundDownloader.addListener('downloadComplete', async (data) => {
                console.log('📥 Download event:', data);

                if (data.status === 'completed' && data.filePath) {
                    console.log('✅ Download completed:', data.filePath);
                    toast.success('تم تحميل التحديث بنجاح', { id: toastId });

                    // مسح حالة التنزيل وحفظ حالة التثبيت المعلق مع رقم النسخة
                    localStorage.removeItem(DOWNLOAD_STATE_KEY);
                    localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify({
                        filePath: data.filePath,
                        version: updateInfo?.latestVersion || packageJson.version,
                        timestamp: Date.now()
                    }));
                    localStorage.setItem('lastDownloadedVersion', updateInfo?.latestVersion || packageJson.version);

                    notifyLandingPage('DOWNLOAD_COMPLETE');
                    setInstallFilePath(data.filePath);
                    setShowInstallDialog(true);

                    listener.remove();
                } else if (data.status === 'failed') {
                    console.error('❌ Download failed:', data.reason);
                    toast.error('فشل تحميل التحديث', { id: toastId });

                    localStorage.removeItem(DOWNLOAD_STATE_KEY);
                    setShowRetryDialog(true);
                    notifyLandingPage('DOWNLOAD_FAILED');

                    listener.remove();
                }

                setIsDownloading(false);
                downloadingRef.current = false;
            });

            // بدء فحص دوري للتقدم (اختياري - للتأكد من اكتمال التنزيل)
            const checkProgress = async () => {
                try {
                    const status = await BackgroundDownloader.getDownloadStatus({ downloadId: result.downloadId });
                    console.log('📊 Download progress:', status.progress + '%');

                    if (status.status === 'completed' && status.filePath) {
                        // التنزيل اكتمل
                        console.log('✅ Download completed (from polling):', status.filePath);
                        toast.success('تم تحميل التحديث بنجاح', { id: toastId });

                        localStorage.removeItem(DOWNLOAD_STATE_KEY);
                        localStorage.setItem(PENDING_INSTALL_KEY, JSON.stringify({
                            filePath: status.filePath,
                            version: updateInfo?.latestVersion || packageJson.version,
                            timestamp: Date.now()
                        }));
                        localStorage.setItem('lastDownloadedVersion', updateInfo?.latestVersion || packageJson.version);

                        notifyLandingPage('DOWNLOAD_COMPLETE');
                        setInstallFilePath(status.filePath);
                        setShowInstallDialog(true);
                        setIsDownloading(false);
                        downloadingRef.current = false;
                        listener.remove();
                    } else if (status.status === 'failed') {
                        // التنزيل فشل
                        console.error('❌ Download failed (from polling)');
                        toast.error('فشل تحميل التحديث', { id: toastId });

                        localStorage.removeItem(DOWNLOAD_STATE_KEY);
                        setShowRetryDialog(true);
                        notifyLandingPage('DOWNLOAD_FAILED');
                        setIsDownloading(false);
                        downloadingRef.current = false;
                        listener.remove();
                    } else if (status.status === 'downloading' || status.status === 'pending') {
                        // لا يزال جارياً - تحديث الـ toast
                        toast.loading(`جاري التحميل... ${status.progress}%`, { id: toastId });
                    }
                } catch (e) {
                    console.warn('Could not check download status:', e);
                }
            };

            // فحص دوري كل 3 ثوانٍ
            const intervalId = setInterval(checkProgress, 3000);

            // إيقاف الفحص بعد 10 دقائق كحد أقصى
            const timeoutId = setTimeout(() => {
                clearInterval(intervalId);
            }, 10 * 60 * 1000);

            // تنظيف عند الانتهاء
            const cleanup = () => {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
            };

            // ربط التنظيف بالمستمع
            const originalRemove = listener.remove;
            listener.remove = () => {
                cleanup();
                originalRemove();
            };

        } catch (error) {
            console.error('❌ Download/Install error:', error);
            const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
            toast.error(`فشل التحميل: ${errorMessage}`, { id: toastId, duration: 5000 });

            // مسح حالة التنزيل عند الفشل
            localStorage.removeItem(DOWNLOAD_STATE_KEY);
            setShowRetryDialog(true);

            notifyLandingPage('DOWNLOAD_FAILED');
            setIsDownloading(false);
            downloadingRef.current = false;
        }
    };

    // مساعد لإرسال الرسائل لصفحة الهبوط (إذا وجدت)
    const notifyLandingPage = (type: string) => {
        const iframe = document.querySelector('iframe');
        if (iframe?.contentWindow) {
            console.log(`📤 Sending ${type} to landing page`);
            iframe.contentWindow.postMessage({ type }, '*');
        }
    };

    const handleCloseInstallDialog = async () => {
        // حذف ملف APK عند رفض التثبيت لمنع ظهور المربع مجدداً
        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
            try {
                const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
                const result = await BackgroundDownloader.deleteApkFile();
                console.log('🗑️ APK file deleted on dismiss (BackgroundDownloader):', result);
            } catch (e) {
                console.warn('Could not delete APK file from BackgroundDownloader:', e);
            }

            // إضافة: حذف الملف من Cache أيضاً للتأكيد
            try {
                await Filesystem.deleteFile({
                    path: APK_PATH,
                    directory: Directory.Cache
                });
                console.log('🗑️ APK file deleted from Cache on dismiss');
            } catch (e) {
                // قد يكون الملف غير موجود، لا مشكلة
                console.log('Cache file clean or not found on dismiss');
            }
        }

        localStorage.removeItem(PENDING_INSTALL_KEY);
        localStorage.removeItem(DOWNLOAD_STATE_KEY);
        setShowInstallDialog(false);
        setInstallFilePath(null);
        notifyLandingPage('DOWNLOAD_COMPLETE');
    };

    const handleInstallNow = async () => {
        localStorage.removeItem(PENDING_INSTALL_KEY);
        localStorage.removeItem(DOWNLOAD_STATE_KEY);
        setShowInstallDialog(false);

        if (installFilePath) {
            // فتح المثبت أولاً
            await openInstaller(installFilePath);

            // حذف ملف APK بعد فترة قصيرة (لإعطاء المثبت وقتاً لنسخ الملف)
            // هذا يمنع ظهور المربع مجدداً حتى لو لم يكتمل التثبيت لأي سبب
            const platform = Capacitor.getPlatform();
            if (platform === 'android') {
                setTimeout(async () => {
                    // حذف من BackgroundDownloader
                    try {
                        const { default: BackgroundDownloader } = await import('../plugins/BackgroundDownloader');
                        const result = await BackgroundDownloader.deleteApkFile();
                        console.log('🗑️ APK file deleted after install started (BackgroundDownloader):', result);
                    } catch (e) {
                        console.warn('Could not delete APK file from BackgroundDownloader:', e);
                    }

                    // حذف من Cache
                    try {
                        await Filesystem.deleteFile({
                            path: APK_PATH,
                            directory: Directory.Cache
                        });
                        console.log('🗑️ APK file deleted from Cache after install started');
                    } catch (e) {
                        console.log('Cache file clean or not found after install');
                    }
                }, 3000); // انتظار 3 ثوانٍ لإعطاء المثبت وقتاً
            }
        }

        setInstallFilePath(null);
    };

    // إعادة محاولة التنزيل
    const retryDownload = () => {
        setShowRetryDialog(false);
        if (lastDownloadUrl) {
            downloadAndInstallAPK(lastDownloadUrl);
        }
    };

    const dismissRetryDialog = () => {
        setShowRetryDialog(false);
        setLastDownloadUrl(null);
    };

    // دالة لبدء عملية التحديث من أي مكان (تغلق حوار التحديث وتبدأ التحميل)
    const startUpdateProcess = () => {
        setShowUpdateDialog(false);
        if (updateInfo?.downloadUrl) {
            downloadAndInstallAPK(updateInfo.downloadUrl);
        }
    };

    const dismissUpdateDialog = () => {
        setShowUpdateDialog(false);
    };

    return {
        checkUpdate,
        downloadAndInstallAPK,
        openInstaller,
        updateInfo,
        isChecking,
        isDownloading,
        showInstallDialog,
        setShowInstallDialog,
        showUpdateDialog,
        setShowUpdateDialog,
        showRetryDialog,
        setShowRetryDialog,
        installFilePath,
        handleCloseInstallDialog,
        handleInstallNow,
        startUpdateProcess,
        dismissUpdateDialog,
        retryDownload,
        dismissRetryDialog,
        lastDownloadUrl
    };
};
