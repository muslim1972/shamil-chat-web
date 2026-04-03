// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDui47pK5gX-HxD0DiatzbAXZuOFYkSI50",
    authDomain: "shamilapp-d61f0.firebaseapp.com",
    projectId: "shamilapp-d61f0",
    storageBucket: "shamilapp-d61f0.firebasestorage.app",
    messagingSenderId: "532939856893",
    appId: "1:532939856893:web:82091d6e557a54a7389794"
});

// ضمان التفعيل الفوري
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// ضروري جداً لكي يعتبر المتصفح الـ Service Worker متوافقاً مع PWA
self.addEventListener('fetch', (event) => {
    // يمكن تركها فارغة مؤقتاً، ولكن وجودها ضروري للتثبيت الاستقرائي
});

const messaging = firebase.messaging();

// التعامل مع الرسائل في الخلفية
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // استخراج البيانات
    const notificationTitle = payload.notification?.title || payload.data?.title || 'دردشة شامل ✨';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'لديك رسالة جديدة في الدردشة',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // الحصول على الرابط من fcm_options.link أو data.link
    const targetUrl = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
