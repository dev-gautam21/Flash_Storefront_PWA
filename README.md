

# Flash Storefront PWA

A production-ready progressive web app that powers flash-sale campaigns with install prompts, offline-first shopping, segmented web push notifications, and an Express + MongoDB backend for campaign orchestration.

## Project Structure

```
.
├── App.tsx                 # PWA routes, offline UX, deep links
├── components/             # Storefront UI, admin console, settings
├── hooks/                  # PWA install & push helpers, connectivity monitor
├── public/                 # Service worker, manifest, offline fallback
├── services/               # REST client shared across the app
├── server/                 # Express API with MongoDB persistence
└── utils/                  # Client-side utilities (e.g., VAPID helpers)
```

## Key Capabilities

- **Installable experience** with custom prompts, analytics for acceptance/dismissal, and fallbacks when the browser hides `beforeinstallprompt`.
- **Offline-first storefront**: app shell precache, runtime caching, offline cart queueing, and a background sync worker that replays checkouts once connectivity returns.
- **Segmented web push** using VAPID: category filters, deep links, quiet hours / snooze preferences, TTL, and scheduled campaigns.
- **JWT-protected admin API** to launch flash sales, schedule campaigns, target audiences, and view analytics aggregates.
- **Respectful permissions UI**: non-blocking prompts, per-category toggles, quiet hours, and reversible subscription management.
- **Analytics pipeline**: install + permission lifecycle, campaign deliver/open/click/dismiss events, and queued order telemetry.

## Prerequisites

- Node.js 18+
- MongoDB 6+
- VAPID key pair (`npx web-push generate-vapid-keys`) for push notifications

## Environment Variables

Create `server/.env` (not committed) with:

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/flashstore
VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY
PWA_ORIGIN=http://localhost:3000
JWT_SECRET=super-secret-string
JWT_EXPIRES_IN=14400              # seconds (optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=flashsale
DEFAULT_NOTIFICATION_TTL=3600     # seconds (optional)
```

> The same `VAPID_PUBLIC_KEY` is hard-coded in `hooks/usePushManager.ts`. Update both when rotating keys.

## Installation

Install dependencies for both the frontend and the backend:

```bash
# Frontend
cd pwa-flash-sale-storefronts
npm install

# Backend
cd server
npm install
```

## Running Locally

### Backend API

```bash
cd server
npm start
```

This starts the Express server on `http://localhost:4000` with MongoDB, JWT authentication, background campaign scheduler, and analytics endpoints.

### React + Vite PWA

```bash
cd pwa-flash-sale-storefronts
npm run dev
```

Visit `http://localhost:3000`. The service worker and manifest load automatically in development and will register push/installation handlers.

### Admin login

1. Navigate to `/login`.
2. Sign in with the credentials defined in `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. Access the `/admin` console to schedule notifications, trigger flash sales, and review immediate analytics feedback.

## Production Build

```bash
npm run build
```

Outputs optimized assets to `dist/` and verifies TypeScript + JSX correctness via Vite’s bundler.

## Testing & Validation Checklist

- **Lighthouse**: Run a PWA audit (`Ctrl+Shift+P → Lighthouse`) to verify installability, offline availability, and best practices.
- **Push lifecycle**: enable notifications, schedule a campaign, toggle quiet hours, snooze/resume, and confirm analytics events appear in MongoDB (`campaignEvents`, `analytics` collections).
- **Offline checkout**: place an order while offline. Confirm it queues, triggers a toast, and syncs once connectivity returns (watch DevTools Application → Background Sync).
- **Service worker versioning**: update assets and verify the `flash-store-v3` worker activates cleanly without duplicate caches.
- **JWT flows**: attempt to hit `/api/start-sale` or `/api/send-notification` without a token—should receive `401`. With a valid token, the call succeeds.
- **Cross-device install**: add the PWA to home screen on Android/iOS and desktop. Ensure shortcuts (Flash Sale, New Arrivals, Back in Stock) deep-link correctly.

## Deployment Notes

- Serve the built assets (`npm run build`) via HTTPS to keep push notifications enabled.
- Ensure the Express API is reachable over HTTPS from the same origin defined in `PWA_ORIGIN`.
- Persist MongoDB collections `subscriptions`, `campaigns`, `campaignEvents`, `analytics`, and `orders` to retain user preferences and campaign telemetry across restarts.
- Rotate `JWT_SECRET` and VAPID keys periodically; update both the backend `.env` and the client hook when doing so.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| `Notification.permission` is `denied` | Instruct the user to clear site settings or add a fallback CTA—they cannot resubscribe until it is cleared manually. |
| Background sync unsupported | The service worker automatically falls back to a direct `TRIGGER_CHECKOUT_SYNC` message when `SyncManager` is missing. |
| Push fails with 410/404 | The backend prunes invalid subscriptions and returns success. Ask the user to re-enable notifications. |
| Install prompt never appears | Some browsers hide `beforeinstallprompt`. The install banner switches to guidance text when no prompt is available; analytics logs this as a fallback event. |

## Useful Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Launch Vite dev server with live reload |
| `npm run build` | Build production bundle (also used as lint check) |
| `npm start` (server) | Run the Express backend |
| `npm run lint` (coming soon) | Reserved for adding ESLint/Prettier |

---

Happy shipping! 🎯
