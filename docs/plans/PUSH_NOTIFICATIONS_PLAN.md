# Push Notifications Plan

> **Status: Future Feature**
> **Depends on:** Shared Spaces & Members (fully built and stable) + In-App Notifications (fully built and stable)
> **Estimated effort:** ~4-5 dev-days
> **Created:** 2026-08-29

This feature adds browser push notifications to Ledg using the raw Web Push API (no third-party vendor — completely free). Push notifications deliver the same in-app notification events to the user's lock screen or browser notification banner when the app is not open or is minimized.

**Prerequisite:** The Shared Spaces feature (including its in-app notification system) must be fully implemented, tested, and stable before starting this work. Push is an additional delivery channel layered on top of the existing notification infrastructure — not a standalone feature.

---

## 1. How It Works

### 1.1 Architecture Overview

```
User action (e.g., someone adds transaction to shared space)
  → Server creates Notification doc (in-app)
  → Server reads PushSubscription docs for target user
  → Server encrypts payload + sends via web-push to each subscription endpoint
  → Push service (Google/Mozilla/Apple) delivers to browser
  → Service Worker receives push event → shows system notification
```

### 1.2 The Three Pieces

| Piece | Role | Location |
|---|---|---|
| **Service Worker** | Background script — receives push events, shows notifications, handles clicks | `client/public/sw.js` |
| **Push Subscription** | Browser generates an endpoint URL + encryption keys per device | Client JS (on subscribe) |
| **VAPID Keys** | Server identity — signs every push request so push services know it's legit | Private key on server, public key in client bundle |

### 1.3 Browser Support (2026)

| Browser | Push support | Requirement |
|---|---|---|
| Chrome (desktop + Android) | Full | Tab open or closed |
| Firefox (desktop + Android) | Full | Tab open or closed |
| Edge | Full | Tab open or closed |
| Safari macOS 16.4+ | Full | Tab open or closed |
| Safari iOS 16.4+ | Yes | PWA must be installed to home screen |
| Safari iOS (EU) | No | Removed under Digital Markets Act |

### 1.4 Subscription Lifecycle

- Subscriptions expire silently — browsers rotate endpoints without user interaction
- Server must handle `410 Gone` responses and clean up stale subscriptions
- On `pushsubscriptionchange` event, the client re-subscribes and updates the server
- Each device/browser combination gets its own subscription

---

## 2. Database Schema

### 2.1 PushSubscription Model (`server/src/domains/push/model.ts`)

```typescript
interface PushSubscriptionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;       // owning user
  endpoint: string;             // push service URL (unique per device)
  keys: {
    p256dh: string;             // encryption key
    auth: string;               // auth secret
  };
  userAgent: string;            // browser/device fingerprint for debugging
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ userId: 1 }` — lookup all subscriptions for a user when sending
- `{ endpoint: 1 }` — unique — prevent duplicate subscriptions
- `{ createdAt: 1 }` — TTL cleanup of stale records

**One user can have multiple subscriptions** (multiple browsers/devices). When sending a push, the server sends to all of that user's subscriptions and handles 410 cleanup per-endpoint.

---

## 3. Environment Variables

Added to `server/src/config/env.ts`:

```
VAPID_PUBLIC_KEY="BMx..."        # base64url public key (safe to expose in client bundle)
VAPID_PRIVATE_KEY="..."          # base64url private key (SECRET — server only)
VAPID_SUBJECT="mailto:admin@ledg.app"  # contact email for push services
```

VAPID keys are generated once with:
```bash
npx web-push generate-vapid-keys
```

---

## 4. API Endpoints

All push endpoints require authentication (`req.userId`).

| Method | Endpoint | Description |
|---|---|---|
| `GET /api/v1/push/vapid-public-key` | Returns the VAPID public key (client needs this to subscribe) |
| `POST /api/v1/push/subscribe` | Save a new push subscription for the authenticated user |
| `DELETE /api/v1/push/subscribe` | Remove a subscription (by endpoint) — client calls on unsubscribe |

**POST /push/subscribe body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64url...",
    "auth": "base64url..."
  }
}
```

**DELETE /push/subscribe body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

---

## 5. Server-Side Implementation

### 5.1 New Files

| File | Purpose |
|---|---|
| `server/src/domains/push/model.ts` | Mongoose schema + model for `PushSubscription` |
| `server/src/domains/push/service.ts` | `subscribe()`, `unsubscribe()`, `sendPushToUser()`, `cleanupStale()` |
| `server/src/domains/push/controller.ts` | Route handlers |
| `server/src/domains/push/routes.ts` | Route definitions |
| `server/src/lib/push.ts` | `web-push` wrapper — initializes VAPID, exports `sendNotification()` |

### 5.2 Modified Files

| File | Change |
|---|---|
| `server/src/config/env.ts` | Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to env validation |
| `server/src/routes.ts` | Mount `pushRoutes` under `/api/v1/push` |
| `server/src/domains/notifications/service.ts` | On notification creation, call `sendPushToUser()` as fire-and-forget |

### 5.3 Sending Logic

```typescript
// In notification service — after creating the Notification doc:
async function notify(userId: string, type: NotificationType, title: string, message: string, data: NotificationData) {
  // 1. Store in-app notification
  const notification = await NotificationModel.create({ userId, type, title, message, data, read: false });

  // 2. Fire-and-forget push delivery
  sendPushToUser(userId, { title, body: message, icon: '/web-app-manifest-192x192.png', data: { url: `/spaces/${data.spaceId}` } })
    .catch(err => logger.warn({ err, userId }, 'Push delivery failed'));
}
```

### 5.4 Subscription Cleanup

When sending a push fails with `410 Gone`, the subscription is stale and must be removed:

```typescript
async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await PushSubscription.find({ userId });
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(sub, JSON.stringify(payload))
    )
  );

  // Clean up expired subscriptions
  const staleEndpoints: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected' && results[i].reason?.statusCode === 410) {
      staleEndpoints.push(subscriptions[i].endpoint);
    }
  }
  if (staleEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
  }
}
```

---

## 6. Client-Side Implementation

### 6.1 New Files

| File | Purpose |
|---|---|
| `client/public/sw.js` | Service worker — handles `push` and `notificationclick` events |
| `client/src/lib/push.ts` | Subscription management — register SW, request permission, subscribe/unsubscribe |

### 6.2 Modified Files

| File | Change |
|---|---|
| `client/src/app/App.tsx` | Call `registerServiceWorker()` on mount |
| `client/src/components/layout/header.tsx` | Bell icon shows push toggle + unread count (replaces placeholder toast) |
| `client/src/pages/settings.tsx` | Add "Notifications" section with push enable/disable toggle |
| `client/src/lib/api.ts` | Add `getVapidPublicKey()`, `subscribePush()`, `unsubscribePush()` |
| `client/src/shared/types/index.ts` | Add `PushSubscriptionInfo` type |

### 6.3 Service Worker (`client/public/sw.js`)

```javascript
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/web-app-manifest-192x192.png',
      badge: data.badge || '/favicon-96x96.png',
      data: data.data || {},
      tag: data.tag,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open, otherwise open new
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
```

### 6.4 Client Push Module (`client/src/lib/push.ts`)

```typescript
const VAPID_PUBLIC_KEY = ''; // fetched from server

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function subscribePush(api: { getVapidPublicKey: () => Promise<string>; subscribePush: (sub: any) => Promise<void> }) {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const { publicKey } = await api.getVapidPublicKey();
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const sub = subscription.toJSON();
  await api.subscribePush({
    endpoint: sub.endpoint,
    keys: sub.keys,
  });

  return subscription;
}

export async function unsubscribePush(api: { unsubscribePush: (endpoint: string) => Promise<void> }) {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.unsubscribePush(endpoint);
}
```

---

## 7. Notification Preference Integration

Push delivery respects the existing notification preference system from Shared Spaces:

| User preference | Push behavior |
|---|---|
| `transaction_added: "realtime"` | Send push immediately |
| `transaction_added: "off"` | No push (in-app only) |
| `transaction_added: "daily digest"` | No push in v1 (needs scheduler — defer) |
| Invite events (`space_invite`, `invite_accepted`, etc.) | Always send push (independent of preferences) |
| `member_joined`, `member_left`, `member_removed` | Always send push |

---

## 8. UI Design

### 8.1 Settings Page — Notifications Section

```
┌─────────────────────────────────────────────┐
│  Notifications                              │
│                                             │
│  Browser Push Notifications    [Toggle ◯──] │
│  Receive alerts on this device when         │
│  you're not using Ledg                      │
│                                             │
│  ─────────────────────────────────────────  │
│  Transaction Activity         [Realtime ▾]  │
│  How you're notified about new expenses     │
│  in shared spaces                           │
└─────────────────────────────────────────────┘
```

### 8.2 Header Bell Icon (upgraded)

- Unread count badge
- Click → notification sheet (in-app)
- Push toggle accessible from settings, not from header (keeps header clean)

---

## 9. Implementation Phases

### Phase 1 — Server infrastructure (1 day)
- [ ] Generate VAPID keys, add env vars
- [ ] Install `web-push` npm package
- [ ] Create `PushSubscription` model
- [ ] Create `server/src/lib/push.ts` wrapper
- [ ] Create push routes: subscribe, unsubscribe, get-vapid-key
- [ ] Mount routes in `server/src/routes.ts`

### Phase 2 — Client infrastructure (1 day)
- [ ] Create `client/public/sw.js` service worker
- [ ] Create `client/src/lib/push.ts` subscription module
- [ ] Add `registerServiceWorker()` call in `App.tsx`
- [ ] Add push API functions to `client/src/lib/api.ts`
- [ ] Add types to `shared/types/index.ts`

### Phase 3 — Integration (1 day)
- [ ] Modify notification service to call `sendPushToUser()` on creation
- [ ] Handle 410 cleanup in push sending logic
- [ ] Wire push toggle in Settings page
- [ ] Test end-to-end: create notification → push arrives on device

### Phase 4 — Polish & edge cases (0.5-1 day)
- [ ] Handle `pushsubscriptionchange` event in service worker
- [ ] Graceful degradation when push is blocked by user
- [ ] Clean up subscriptions when user deletes account
- [ ] Rate limiting on push endpoints
- [ ] Logging and error monitoring

---

## 10. Testing Checklist

- [ ] Push subscription succeeds on Chrome desktop
- [ ] Push subscription succeeds on Firefox desktop
- [ ] Push subscription succeeds on Chrome Android
- [ ] Push subscription succeeds on Safari macOS
- [ ] Push notification appears when app is closed (Chrome)
- [ ] Push notification appears when app is closed (Firefox)
- [ ] Notification click opens correct URL
- [ ] Stale subscriptions (410) are cleaned up automatically
- [ ] Unsubscribe removes subscription from DB
- [ ] Multiple devices/browsers each get their own push
- [ ] Push respects notification preferences (realtime vs off)
- [ ] Push works alongside in-app notifications (both deliver)
- [ ] Service worker updates correctly when changed
- [ ] VAPID keys are not exposed in client bundle beyond public key
- [ ] Push endpoints are rate-limited

---

## 11. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Raw Web Push API, no Firebase/OneSignal | Zero cost, zero vendor dependency, full control |
| 2 | `web-push` npm package for encryption | Handles RFC 8291 encryption + VAPID signing — no need to implement crypto |
| 3 | Service worker in `public/sw.js` | Vite serves `public/` at root — SW scope covers entire app |
| 4 | One subscription per device/browser | Standard approach — user may have multiple (phone + laptop + tablet) |
| 5 | Fire-and-forget push delivery | Push failures should never block notification creation or API responses |
| 6 | Push preferences tied to notification preferences | Single preference system controls both in-app and push channels |
| 7 | No daily digest in v1 | Requires a scheduler (e.g., Vercel Cron) which doesn't exist yet; schema reserves the value |

---

## 12. Future Enhancements

- **Daily digest:** Add a scheduled job that batches unread notifications into a single push once per day
- **Rich notifications:** Include action buttons (e.g., "Accept Invite" directly from the notification)
- **Push notification grouping:** Collapse multiple transaction notifications into a single grouped notification
- **Topic-based push:** Allow users to subscribe to specific spaces only (e.g., "Notify me about Trip to Pokhara only")
- **iOS PWA install prompt:** Guide iOS users to install the PWA for push support
