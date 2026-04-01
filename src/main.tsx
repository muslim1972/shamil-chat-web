import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css' // 🎨 نظام الثيمات
import './styles/chat-backgrounds.css' // 🖼️ خلفيات الدردشة
import App from './App.tsx'

// طلب إذن الإشعارات (للـ PWA)
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission status:', permission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }
};

// طلب الإذن عند تحميل التطبيق
if (typeof window !== 'undefined') {
  requestNotificationPermission();
}

createRoot(document.getElementById('root')!).render(
  <App />
)
