# Web Push Notifications (VAPID)

Push notifications sent to the browser via the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) using VAPID and `pywebpush`.

## Architecture

```
Browser
  → POST /api/notifications/web-push/subscribe/   (register endpoint)
  → POST /api/notifications/web-push/unsubscribe/ (remove endpoint)
  → GET  /api/notifications/web-push/vapid-key/   (get public key)

CreateNotificationCommand
  → PushDispatcher.dispatch(notification)
    → gets subscriptions for the user from DB
    → sends payload to each endpoint via pywebpush
    → removes subscriptions that return 410 Gone
```

## Setup

### 1. Generate VAPID keys

```bash
python scripts/generate_vapid_keys.py
```

This will print the keys in the format ready to copy into `.env`:

### 2. Configure `.env`

```env
VAPID_PRIVATE_KEY=<base64url-encoded-private-key>
VAPID_PUBLIC_KEY=<base64url-encoded-public-key>
VAPID_CLAIMS_EMAIL=mailto:admin@canchapp.com
```

### 3. Inject the dispatcher

Pass `PushDispatcher()` when constructing `CreateNotificationCommand`:

```python
from apps.notifications.infrastructure.dispatchers.push_dispatcher import PushDispatcher

cmd = CreateNotificationCommand(
    repo=NotificationRepository(),
    dispatchers=[BaseDispatcher(), PushDispatcher()],
)
```

## API endpoints

All endpoints require authentication (JWT Bearer token).

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/api/notifications/web-push/vapid-key/` | Returns the VAPID public key for the browser to use during subscription |
| `POST` | `/api/notifications/web-push/subscribe/` | Registers a push subscription |
| `POST` | `/api/notifications/web-push/unsubscribe/` | Removes a push subscription |

### Subscribe payload

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64-encoded-p256dh",
    "auth": "base64-encoded-auth"
  }
}
```

### Unsubscribe payload

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

## How it works

1. The frontend calls `GET /api/notifications/web-push/vapid-key/` to get the public key.
2. The browser creates a push subscription (via `navigator.serviceWorker.pushManager.subscribe()`).
3. The subscription is sent to `POST /api/notifications/web-push/subscribe/`.
4. When `CreateNotificationCommand.execute()` runs, `PushDispatcher`:
   - Fetches all subscriptions for the target user
   - Sends the notification payload to each endpoint
   - If the push service returns 410 (subscription expired), removes the endpoint from the DB
5. The browser's service worker receives the push event and displays a notification.

## Notifications module structure

```
apps/notifications/
├── domain/services.py              → NotificationEvent (event catalogue)
├── application/ports.py            → INotificationDispatcher (interface)
├── infrastructure/
│   ├── models.py                   → WebPushSubscriptionModel
│   ├── repositories.py             → WebPush subscription CRUD
│   └── dispatchers/
│       └── push_dispatcher.py      → PushDispatcher (pywebpush)
├── interfaces/api/views.py         → Subscription endpoints
└── migrations/0004_*.py            → WebPushSubscriptionModel table
```

## Troubleshooting

- **"VAPID keys not configured" log message**: Set `VAPID_PRIVATE_KEY` and `VAPID_CLAIMS_EMAIL` in `.env`.
- **410 Gone responses**: Automatically cleaned up — the subscriber's endpoint is removed from the DB.
- **No notifications received**: Verify the browser's push permission is granted and the service worker is registered.
