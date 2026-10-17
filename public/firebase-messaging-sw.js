/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "project-89032b5a-6178-4b41-90b",
  appId: "1:894893240654:web:baabc7e1954ee052c36e1f",
  apiKey: "AIzaSyC-CeSNZF7iJQduraqnUrYBoj9DsvyvS0A",
  authDomain: "project-89032b5a-6178-4b41-90b.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-alldabouchauffeu-4067e958-2691-4e2f-a95e-8d4eb5c7aa3b",
  storageBucket: "project-89032b5a-6178-4b41-90b.firebasestorage.app",
  messagingSenderId: "894893240654",
  measurementId: "G-HZDGJR767E"
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);
    const notificationTitle = payload.notification?.title || 'Allô Dabou Admin';
    const notificationOptions = {
      body: payload.notification?.body || 'Nouvelle notification administrative.',
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Messaging initialization skipped or unsupported', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
