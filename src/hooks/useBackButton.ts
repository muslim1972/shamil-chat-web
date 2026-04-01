import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook مخصص لمعالجة زر الرجوع (Hardware Back Button) في Capacitor
 * يوفر سلوك موحد ومتسق عبر جميع صفحات التطبيق
 */
export const useBackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // تفعيل المعالج فقط على الأجهزة المحمولة (Android)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        let backButtonListener: any;

        const setup = async () => {
            backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
                const currentPath = location.pathname;

                // ====================
                // معالجة الحالات الخاصة
                // ====================

                // 1. إذا كنا في الصفحة الرئيسية (Dashboard)
                if (currentPath === '/' || currentPath === '/dashboard') {
                    // إظهار تأكيد الخروج
                    const confirmExit = window.confirm('هل تريد الخروج من التطبيق؟');
                    if (confirmExit) {
                        App.exitApp();
                    }
                    return;
                }

                // 2. معالجة Modals/Overlays المفتوحة
                // التحقق من وجود عناصر overlay نشطة
                const activeOverlay = document.querySelector('[data-overlay="true"]');
                const activeModal = document.querySelector('[role="dialog"][data-state="open"]');

                if (activeOverlay || activeModal) {
                    // إغلاق الـ overlay/modal أولاً
                    const closeButton = activeOverlay?.querySelector('[aria-label="Close"]') ||
                        activeModal?.querySelector('[aria-label="Close"]');
                    if (closeButton) {
                        (closeButton as HTMLElement).click();
                        return;
                    }
                }

                // 3. معالجة ShamaTube Video Player Overlay
                const shamatubeOverlay = document.querySelector('[data-shamatube-overlay="true"]');
                if (shamatubeOverlay && currentPath.startsWith('/shamatube')) {
                    // إغلاق الـ overlay أولاً
                    const closeBtn = shamatubeOverlay.querySelector('button[aria-label="إغلاق"]') ||
                        shamatubeOverlay.querySelector('button:first-of-type');
                    if (closeBtn) {
                        (closeBtn as HTMLElement).click();
                        return;
                    }
                }

                // ====================
                // معالجة التنقل العادي
                // ====================

                // 4. الصفحات الفرعية - العودة للصفحة الرئيسية مباشرة
                const subPages = [
                    '/conversations',
                    '/shagram',
                    '/shamatube',
                    '/nadara',
                    '/profile',
                    '/articles',
                    '/device-health',
                    '/learn',
                    '/settings/theme',
                    '/settings/typing',
                    '/haja' // إضافة Haja للقائمة
                ];

                // إذا كنا في صفحة فرعية رئيسية
                if (subPages.some(page => currentPath === page)) {

                    // إذا كان هناك query params (مثل ?product=123)، نعتبرها صفحة داخلية ونقوم بالرجوع للخلف بدلاً من الذهاب للرئيسية
                    if (location.search) {
                        navigate(-1);
                        return;
                    }

                    navigate('/', { replace: true });
                    return;
                }

                // 5. الصفحات الداخلية العميقة - العودة خطوة واحدة
                // مثل: /chat/:id, /shagram/create, /articles/:id
                if (canGoBack) {
                    navigate(-1);
                } else {
                    // إذا لم يكن هناك تاريخ، اذهب للصفحة الرئيسية
                    navigate('/', { replace: true });
                }
            });
        };

        setup();

        // تنظيف المُستمع عند إلغاء التحميل
        return () => {
            if (backButtonListener) backButtonListener.remove();
        };
    }, [navigate, location.pathname]);
};
