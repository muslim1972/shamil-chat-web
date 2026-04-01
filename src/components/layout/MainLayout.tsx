import React, { useEffect } from 'react';
import { useOptimizedCallAlert } from '../../context/OptimizedCallAlertContext';
import { useGlobalCallAlert } from '../../context/GlobalCallAlertContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalUIStore } from '@/stores/useGlobalUIStore';
import { AppFooter } from '../common/AppFooter';
import { GlobalAdBanner } from '../common/GlobalAdBanner';

interface MainLayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, hideNavigation = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const setActiveScreen = useGlobalUIStore((state) => state.setActiveScreen);
  const isKeyboardVisible = useGlobalUIStore((state) => state.isKeyboardVisible);
  const { GlobalCallAlert, setOnAcceptAction } = useOptimizedCallAlert();
  const { setOnOpenConversation } = useGlobalCallAlert();

  // ضبط دالة فتح المحادثة عند تحميل المكون (للتنبيهات من داخل التطبيق)
  useEffect(() => {
    setOnAcceptAction((conversationId: string) => {
      navigate(`/chat/${conversationId}`);
    });
  }, [navigate, setOnAcceptAction]);

  // ✅ إضافة: تسجيل دالة التنقل للتنبيهات القادمة من Native Android
  useEffect(() => {
    setOnOpenConversation((conversationId: string) => {
      // ✅ التحقق من صحة conversationId قبل التنقل
      if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
        // تم التعامل مع الحالة في GlobalCallAlertContext، لا داعي للتكرار
        return;
      }
      console.log('📱 Native Alert Navigation: Opening chat', conversationId);
      navigate(`/chat/${conversationId}`);
    });
  }, [navigate, setOnOpenConversation]);

  useEffect(() => {
    if (location.pathname.startsWith('/chat')) {
      setActiveScreen('chat');
    } else if (location.pathname === '/') {
      // Home dashboard is the main landing page now
      setActiveScreen('home');
    } else if (location.pathname.startsWith('/conversations')) {
      setActiveScreen('conversations');
    } else if (location.pathname.startsWith('/profile')) {
      setActiveScreen('profile');
    } else if (location.pathname.startsWith('/settings')) {
      setActiveScreen('settings');
    } else if (location.pathname.startsWith('/archived')) {
      setActiveScreen('conversations');
    }
    else {
      setActiveScreen('conversations');
    }
  }, [location.pathname, setActiveScreen]);

  return (
    <div className="flex flex-col h-screen">
      <div id="main-scroll-container" className="flex-1 overflow-auto hide-scrollbar">
        {children}
      </div>
      {/* الفوتر العائم - يظهر فوق الإعلان (z-50) */}
      {!hideNavigation && <AppFooter isKeyboardVisible={isKeyboardVisible} />}
      {/* حاوية الإعلان العالمية - أسفل الشاشة - تختفي عند ظهور الكيبورد */}
      {!hideNavigation && <GlobalAdBanner isKeyboardVisible={isKeyboardVisible} />}
      <GlobalCallAlert />
    </div>
  );
};