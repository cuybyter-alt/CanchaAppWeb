import { useEffect } from 'react';
import authService from '../services/AuthService';
import notificationService from '../services/NotificationService';

/**
 * Converts a base64url-encoded VAPID public key to a Uint8Array,
 * as required by pushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * usePushNotifications
 *
 * Registers the service worker and subscribes the browser to VAPID push
 * notifications when the user is authenticated.
 *
 * - Runs once per app session (idempotent: skips if subscription already exists).
 * - Sends the subscription to the backend via POST /notifications/web-push/subscribe/.
 */
export function usePushNotifications(): void {
  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub || cancelled) return;

        const vapidKey = await notificationService.getVapidKey();
        if (cancelled) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        if (cancelled) return;

        await notificationService.subscribePush(subscription.toJSON());
      } catch (err) {
        // Non-critical — app works without push notifications
        console.warn('[usePushNotifications] Push setup failed:', err);
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);
}
