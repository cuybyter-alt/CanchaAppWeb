/* eslint-disable no-restricted-globals */

/**
 * CanchApp Service Worker — Web Push (VAPID)
 *
 * Handles incoming push events and notification click actions.
 * Registered by usePushNotifications hook when the user is authenticated.
 */

self.addEventListener('push', (event) => {
  let title = 'CanchApp';
  let body = 'Tienes una nueva notificación.';
  let icon = '/cuypequeniologo.png';
  let url = '/notifications';

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title ?? title;
      body = payload.body ?? body;
      icon = payload.icon ?? icon;
      url = payload.url ?? url;
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/cuypequeniologo.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if already open
        for (const client of clientList) {
          if (new URL(client.url).pathname === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});
