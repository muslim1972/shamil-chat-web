// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
    apiKey: "AIzaSyAkEErL1RV04Uza1cH553Lcp1drrIOaznQ",
    authDomain: "shamilapp-d61f0.firebaseapp.com",
    projectId: "shamilapp-d61f0",
    storageBucket: "shamilapp-d61f0.firebasestorage.app",
    messagingSenderId: "532939856893",
    appId: "1:532939856893:web:82091d6e557a54a7389794"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // تخصيص كيفية ظهور الإشعار
    const notificationTitle = payload.notification.title || 'رسالة جديدة';
    const notificationOptions = {
        body: payload.notification.body || 'لديك إشعار جديد في شقردي',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // استخراج الرابط من البيانات المرسلة
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
