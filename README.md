# StreamHub

StreamHub is a beginner-to-advanced video streaming platform built with React, Express, and MongoDB. Phase 5 is complete and adds playlists, subscriptions, creator channel pages, and creator dashboard stats on top of uploads, auth, engagement, and watch history.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios
- Backend: Node.js, Express, MongoDB with Mongoose, JWT auth, Multer
- Storage in this phase: local video and thumbnail uploads under `server/uploads`

## Current Completed Phase

Phase 5: Playlists, Subscriptions, Creator Channel, and Creator Dashboard

- Create, update, delete, and browse playlists
- Add videos to playlists and remove them
- Reorder videos inside a playlist
- Respect public, unlisted, and private playlist visibility
- Subscribe and unsubscribe to creators
- View subscribed creators
- View public creator channel pages
- Edit your own channel details
- Browse public videos by creator
- View creator dashboard stats and top videos

Phase 5 does not include HLS, FFmpeg transcoding, recommendations, admin dashboard, payments, or real-time notifications.

## Environment Variables

Server: `server/.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
```

Client: `client/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## How to Run the Backend

```bash
cd server
npm install
npm run dev
```

## How to Run the Frontend

```bash
cd client
npm install
npm run dev
```

## Backend Models

Existing models:

- `User`
- `Video`
- `Like`
- `Comment`
- `WatchHistory`

New in Phase 5:

- `server/src/models/playlist.model.js`
  - Stores playlist name, description, owner, visibility, thumbnail, videos, count, and soft-delete flag.
- `server/src/models/subscription.model.js`
  - Stores subscriber and channel relationships.
  - Uses a unique compound index on `subscriber + channel`.

User model additions:

- `channelName`
- `channelDescription`
- `channelBanner`
- `subscribersCount`
- `subscribedToCount`
- `totalVideos`
- `totalViews`

## API Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh-token`

Videos and engagement:

- `POST /api/videos/upload`
- `GET /api/videos`
- `GET /api/videos/my-videos`
- `GET /api/videos/:videoId`
- `PATCH /api/videos/:videoId`
- `DELETE /api/videos/:videoId`
- `POST /api/videos/:videoId/like`
- `POST /api/videos/:videoId/dislike`
- `GET /api/videos/:videoId/reaction`
- `POST /api/videos/:videoId/comments`
- `GET /api/videos/:videoId/comments`
- `POST /api/videos/:videoId/watch-history`

Comments:

- `PATCH /api/comments/:commentId`
- `DELETE /api/comments/:commentId`

Watch history:

- `GET /api/users/watch-history`
- `DELETE /api/users/watch-history/:historyId`
- `DELETE /api/users/watch-history`

Playlists:

- `POST /api/playlists`
- `GET /api/playlists`
- `GET /api/playlists/my-playlists`
- `GET /api/playlists/:playlistId`
- `PATCH /api/playlists/:playlistId`
- `DELETE /api/playlists/:playlistId`
- `POST /api/playlists/:playlistId/videos/:videoId`
- `DELETE /api/playlists/:playlistId/videos/:videoId`
- `PATCH /api/playlists/:playlistId/reorder`

Subscriptions:

- `POST /api/subscriptions/:channelId`
- `DELETE /api/subscriptions/:channelId`
- `GET /api/subscriptions/:channelId/status`
- `GET /api/subscriptions/my-subscriptions`
- `GET /api/subscriptions/:channelId/subscribers`

Channels:

- `GET /api/channels/:username`
- `PATCH /api/channels/me`
- `GET /api/channels/:username/videos`
- `GET /api/channels/me/dashboard`

Protected routes use `req.user` from JWT middleware. The frontend never sends trusted owner, creator, or user IDs for protected ownership decisions.

## Frontend Pages

- `/` - Home
- `/login` - Login
- `/register` - Register
- `/profile` - Protected profile page with channel links
- `/videos` - Public video listing
- `/watch/:videoId` - Watch page with engagement, subscribe, and save-to-playlist
- `/upload` - Protected upload page
- `/my-videos` - Protected creator video manager
- `/history` - Protected watch history page
- `/playlists` - Public playlist listing
- `/my-playlists` - Protected playlist manager
- `/playlists/:playlistId` - Playlist detail page
- `/create-playlist` - Protected playlist creation
- `/subscriptions` - Protected subscribed channels page
- `/channel/:username` - Public creator channel page
- `/channel/edit` - Protected channel editor
- `/creator-dashboard` - Protected creator dashboard
- `/*` - Not found page

## Frontend Services

New in Phase 5:

- `client/src/services/playlistService.js`
  - `createPlaylist(data)`
  - `getMyPlaylists(params)`
  - `getPublicPlaylists(params)`
  - `getPlaylistById(playlistId)`
  - `updatePlaylist(playlistId, data)`
  - `deletePlaylist(playlistId)`
  - `addVideoToPlaylist(playlistId, videoId)`
  - `removeVideoFromPlaylist(playlistId, videoId)`
  - `reorderPlaylistVideos(playlistId, videoIds)`
- `client/src/services/subscriptionService.js`
  - `subscribeToChannel(channelId)`
  - `unsubscribeFromChannel(channelId)`
  - `getSubscriptionStatus(channelId)`
  - `getMySubscriptions(params)`
- `client/src/services/channelService.js`
  - `getChannelByUsername(username)`
  - `updateMyChannel(data)`
  - `getChannelVideos(username, params)`
  - `getCreatorDashboardStats()`

## How to Test Playlist Creation

1. Log in.
2. Open `/create-playlist`.
3. Enter a name, optional description, and visibility.
4. Submit the form.
5. Confirm you land on the playlist detail page.
6. Open `/my-playlists` and confirm the playlist appears.

## How to Test Adding Video to Playlist

1. Log in and create a playlist.
2. Open a public video at `/watch/:videoId`.
3. Click `Save to Playlist`.
4. Select your playlist.
5. Open the playlist detail page and confirm the video appears.
6. Try saving the same video again and confirm the friendly duplicate message appears.
7. As the playlist owner, remove the video from the playlist.

## How to Test Subscribe and Unsubscribe

1. Create or log in as User A and upload a public video.
2. Log in as User B.
3. Open User A's channel at `/channel/:username`.
4. Click `Subscribe`.
5. Confirm subscriber count updates immediately.
6. Open `/subscriptions` and confirm User A appears.
7. Unsubscribe from `/subscriptions` or the channel page.

## How to Test Channel Page

1. Open `/channel/:username`.
2. Confirm channel name, username, description, subscriber count, total videos, and total views appear.
3. Confirm only public, published, non-deleted videos are listed.
4. Log out and confirm the channel remains viewable.
5. Click subscribe while logged out and confirm the UI asks you to log in.

## How to Test Creator Dashboard

1. Log in as a creator/user with uploaded videos.
2. Open `/creator-dashboard`.
3. Confirm total videos, views, likes, comments, subscribers, public videos, and private videos appear.
4. Confirm top videos are sorted by views.
5. Delete a video and reload the dashboard to confirm deleted videos are not counted.

## Common Errors and Fixes

- `Access token is missing`: log in and retry the protected action.
- `Token expired`: log in again.
- `Invalid playlist ID`: verify the playlist URL contains a valid MongoDB ObjectId.
- `Playlist name is required`: enter a non-empty playlist name.
- `Visibility must be public, private, or unlisted`: choose a valid visibility value.
- `This playlist is private`: only the owner can view private playlists.
- `You cannot manage this playlist`: only playlist owners can edit, delete, add, remove, or reorder videos.
- `Video already exists in this playlist`: choose another playlist or remove the existing item first.
- `You cannot add this private video`: private videos can only be added by their owner.
- `You cannot subscribe to yourself`: use another account to test subscriptions.
- `Already subscribed to this channel`: refresh subscription status or unsubscribe first.
- `Channel not found`: confirm the username or channel ID exists and the user is not banned.
- `You cannot view this subscriber list`: only the channel owner or admin can view full subscriber lists.

## Verification

Useful backend checks:

```bash
cd server
node --check src/controllers/playlist.controller.js
node --check src/controllers/subscription.controller.js
node --check src/controllers/channel.controller.js
node --check src/controllers/video.controller.js
```

Frontend build:

```bash
cd client
npm run build
```

## Next Phase Placeholder

Phase 6 can add streaming infrastructure such as HLS playback and FFmpeg-based transcoding. That work is intentionally not included in Phase 5.
