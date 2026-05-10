# StreamHub

StreamHub is a production-minded video streaming app built with React, Express, MongoDB, JWT auth, uploads, FFmpeg/HLS playback, creator channels, playlists, subscriptions, engagement, discovery, moderation, background jobs, deployment hardening, and real-time notifications.

## Current Completed Phase

Phase 11 is complete: Real-Time Notifications, Email Alerts, and Activity Feed.

Included in Phase 11:

- Persistent MongoDB notifications with read/unread state.
- Socket.IO authenticated with JWT for real-time in-app updates.
- Optional Nodemailer email alerts controlled by environment config and user preferences.
- Notification preferences for in-app and email channels.
- Notification bell, dropdown, full notifications page, and preferences page.
- Activity feed for subscribed creators and a public/channel activity API.
- Real-time video processing status events for creator video management.
- Notification triggers for subscriptions, likes, comments, uploads, processing results, reports, moderation, account bans, and system-ready notifications.

Not included yet: payment system, mobile app, live streaming, or AI moderation.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios, hls.js, Socket.IO client
- Backend: Node.js, Express, MongoDB with Mongoose, Socket.IO, JWT, Nodemailer, BullMQ, ioredis
- Background Worker: FFmpeg processing with HLS adaptive streaming
- Storage: local fallback or AWS S3-compatible cloud storage
- Job Queue: Redis-backed BullMQ

## Environment Variables

Server: `server/.env`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/streamhub
CLIENT_URL=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

STORAGE_PROVIDER=local
LOCAL_UPLOAD_BASE_URL=http://localhost:5000/uploads

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ENABLE_WORKER_IN_SERVER=true

EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_app_password
EMAIL_FROM=StreamHub <your_email@example.com>
ENABLE_EMAIL_NOTIFICATIONS=false

SOCKET_CORS_ORIGIN=http://localhost:5173
```

Client: optional `client/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## New Backend Pieces

- Models: `Notification`, `NotificationPreference`, `Activity`
- Services: notification service, email service, activity service, Socket.IO setup
- Routes:
  - `/api/notifications`
  - `/api/notifications/unread-count`
  - `/api/notifications/preferences`
  - `/api/activity/feed`
  - `/api/activity/public`
  - `/api/activity/channel/:username`

## New Frontend Pieces

- Contexts: `NotificationContext`
- Services: `socket`, `notificationService`, `activityService`
- Components: notification bell, dropdown, and notification item
- Pages:
  - `/notifications`
  - `/notification-preferences`
  - `/activity`

## How to Run

1. Start MongoDB and Redis.
2. Start backend: `cd server && npm run dev`
3. Start worker if `ENABLE_WORKER_IN_SERVER=false`: `cd server && npm run worker`
4. Start frontend: `cd client && npm run dev`

## Testing Real-Time Notifications

1. Log in as two users in separate browsers.
2. User A opens the app and stays logged in.
3. User B subscribes to User A, likes User A's video, or comments on User A's video.
4. User A should see the notification badge update immediately.
5. Open `/notifications` to verify the notification was persisted.

## Testing Preferences

1. Open `/notification-preferences`.
2. Disable a notification type.
3. Trigger that event from another user.
4. Confirm the disabled in-app notification is not created.

## Testing Email

1. Set `ENABLE_EMAIL_NOTIFICATIONS=true`.
2. Configure `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`.
3. Enable the relevant email preference for a user.
4. Trigger a supported event such as a new comment or processing completion.
5. If email fails, the notification remains saved and the main action still succeeds.

## Testing Activity Feed

1. Follow a creator.
2. Have that creator upload a public video, like a public video, comment on a public video, or create a public playlist.
3. Visit `/activity`.
4. Private, blocked, deleted, failed, or unavailable targets are filtered out.

## Debugging Socket.IO

- Confirm `SOCKET_CORS_ORIGIN` matches the frontend origin.
- Confirm the browser has a valid access token.
- Check server logs for socket auth errors.
- In the browser console, listen for `socket:error` events.
- If the worker runs as a separate process, processing notifications are persisted, but direct socket emits require the API process or a future Redis Socket.IO adapter.

## Common Errors and Fixes

- `Socket token is missing`: log out and back in, then refresh the page.
- `Origin not allowed`: update `SOCKET_CORS_ORIGIN` and `CLIENT_URL`.
- No emails: verify `ENABLE_EMAIL_NOTIFICATIONS=true` and use a Gmail app password.
- Redis connection warnings in local dev: start Redis or set queue-related features accordingly.
- Notification missing: check the recipient's notification preferences first.
- Activity missing: verify the target video is public, published, not deleted, and not blocked.

## Verification

```bash
cd server && npm test
cd client && npm run build
```

## Next Phase Placeholder

Phase 12 can add monetization and creator revenue features such as paid memberships, subscriptions, invoices, payout settings, and billing webhooks.
