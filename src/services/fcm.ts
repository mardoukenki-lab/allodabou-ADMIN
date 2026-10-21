import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { app, db } from './firebase';
import { playNotificationSound } from './audio';

export const OFFICIAL_VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BCzlvzh8YQJcHoXbxlDWTWD_fbqf4ACfVZSpxizv87vkAZ8PQma_injX3sD3lgjN4YgxdWi5q3uprrO_q6jzZJU';

export interface FCMDiagnostic {
  supported: boolean;
  serviceWorkerSupported: boolean;
  notificationSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  token: string | null;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function getFCMDiagnostic(): Promise<FCMDiagnostic> {
  const isBrowser = typeof window !== 'undefined';
  const notificationSupported = isBrowser && 'Notification' in window;
  const serviceWorkerSupported = isBrowser && 'serviceWorker' in navigator;
  let supported = false;

  try {
    supported = isBrowser && (await isSupported());
  } catch {
    supported = false;
  }

  const permission = notificationSupported ? Notification.permission : 'unsupported';
  const token = isBrowser ? localStorage.getItem('allo_dabou_admin_fcm_token') : null;

  return {
    supported,
    serviceWorkerSupported,
    notificationSupported,
    permission,
    token,
  };
}

let messagingInstance: Messaging | null = null;

async function getOrInitMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Impossible d’initialiser Firebase Messaging:', err);
    return null;
  }
}

/**
 * Demande la permission et enregistre le token FCM dans le profil admins/{uid}
 */
export async function requestNotificationPermissionAndGetToken(adminUid?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[FCM] Les notifications ne sont pas supportées par ce navigateur.');
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FCM] Firebase Messaging non supporté dans cet environnement.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Permission de notification refusée ou ignorée.');
      return null;
    }

    // Enregistrement du service worker de messagerie
    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope',
        });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] Échec enregistrement service worker FCM:', swErr);
      }
    }

    const messaging = await getOrInitMessaging();
    if (!messaging) return null;

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: OFFICIAL_VAPID_KEY,
    });

    if (currentToken) {
      localStorage.setItem('allo_dabou_admin_fcm_token', currentToken);
      console.log('[FCM] Jeton FCM obtenu avec succès:', currentToken.substring(0, 15) + '...');

      if (adminUid) {
        // Enregistre ou ajoute le jeton dans admins/{uid}.fcmTokens
        try {
          const adminRef = doc(db, 'admins', adminUid);
          await updateDoc(adminRef, {
            fcmTokens: arrayUnion(currentToken),
          }).catch(async () => {
            // Repli si le champ fcmTokens n'existait pas encore
            await setDoc(
              adminRef,
              {
                fcmTokens: [currentToken],
              },
              { merge: true }
            );
          });
        } catch (err) {
          console.warn('[FCM] Impossible d’enregistrer le token dans admins/{uid}:', err);
        }
      }
    }

    return currentToken;
  } catch (err) {
    console.warn('[FCM] Impossible d’obtenir le jeton FCM:', err);
    return null;
  }
}

/**
 * Écoute les messages reçus au premier plan (Foreground FCM Messages)
 */
export function setupFCMForegroundListener(
  onNotificationReceived: (payload: { title: string; body: string; driverId?: string }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let unsubscribe = () => {};

  getOrInitMessaging().then((messaging) => {
    if (!messaging) return;
    try {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('[FCM] Message reçu au premier plan:', payload);
        const title = payload.notification?.title || payload.data?.title || 'Allô Dabou Admin';
        const body =
          payload.notification?.body || payload.data?.body || 'Nouvelle candidature chauffeur soumise à Dabou.';
        const driverId = payload.data?.driverId;

        // Déclenche le carillon audio
        playNotificationSound();

        // Vibration sur appareil mobile si supporté
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([150, 100, 200]);
        }

        onNotificationReceived({ title, body, driverId });
      });
    } catch (err) {
      console.warn('[FCM] Erreur configuration écouteur premier plan:', err);
    }
  });

  return () => {
    unsubscribe();
  };
}

/**
 * Affiche une notification push / locale immédiate avec son et vibration
 */
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  // Jouer le carillon sonore Dabou
  playNotificationSound();

  // Vibration sur mobile
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 150]);
    } catch {
      // Ignorer si vibration non autorisée
    }
  }

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (e) {
      console.warn('[Notification] Échec affichage notification locale:', e);
    }
  }
}
