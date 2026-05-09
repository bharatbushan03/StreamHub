# StreamHub

StreamHub is a production-minded video streaming app built with React, Express, MongoDB, JWT auth, local uploads, FFmpeg video processing, HLS playback, creator channels, playlists, subscriptions, engagement, and discovery.

## Current Completed Phase

Phase 7 is complete: Advanced Search, Recommendations, Trending Videos, and Analytics.

Included in Phase 7:

- Advanced video search with query, category, tags, creator, duration, upload date, sorting, and pagination.
- Search suggestions from public published videos, tags, categories, and creator/channel names.
- Logged-in user search history with delete one and clear all.
- Personalized home feed using watch history, liked videos, tags, categories, subscriptions, recent uploads, and trending score.
- Related videos on the watch page.
- Trending videos with a simple explainable score.
- Video analytics event tracking for impressions, clicks, views, watch progress, and completions.
- Creator analytics and single video analytics pages.

Not included yet: admin dashboard, cloud storage, payments, real-time notifications, Redis, Docker, or ML recommendations.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios, hls.js
- Backend: Node.js, Express, MongoDB with Mongoose, JWT auth, Multer, fluent-ffmpeg
- Storage: local files under `server/uploads`
- Recommendation approach: rule-based ranking, no ML model yet

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

## How to Run

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

## FFmpeg Requirement

Phase 6 added FFmpeg and HLS processing. The repo includes `ffmpeg-static` and `ffprobe-static`, but a system install also works.

Windows check:

```bash
ffmpeg -version
ffprobe -version
```

Optional overrides:

```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
```

## New Backend Models

- `server/src/models/videoAnalytics.model.js`
  - Tracks `impression`, `click`, `view`, `watch_progress`, `complete`, `like`, `dislike`, `comment`, and `share` events.
  - Supports guest events with `viewer: null`.
  - Stores watch time, position, device, browser, country, and traffic source.

- `server/src/models/searchHistory.model.js`
  - Stores logged-in user searches, filters, result count, and created date.

Updated:

- `server/src/models/video.model.js`
  - Added `searchKeywords`, `trendingScore`, `engagementScore`, `averageWatchTime`, `totalWatchTime`, `uniqueViewers`, `impressions`, `clickThroughRate`, and `lastViewedAt`.

## New Backend Controllers

- `server/src/controllers/search.controller.js`
- `server/src/controllers/recommendation.controller.js`
- `server/src/controllers/analytics.controller.js`

New helper:

- `server/src/utils/searchKeywords.js`
  - Generates lowercase search keywords from video title, description, category, tags, owner username, owner full name, and channel name.

## New API Routes

Search:

- `GET /api/search/videos`
- `GET /api/search/suggestions`
- `GET /api/search/history`
- `DELETE /api/search/history/:historyId`
- `DELETE /api/search/history`

Recommendations:

- `GET /api/recommendations/home`
- `GET /api/recommendations/videos`
- `GET /api/recommendations/related/:videoId`
- `GET /api/recommendations/trending`
- `GET /api/recommendations/subscriptions`

Analytics:

- `POST /api/analytics/video-event`
- `GET /api/analytics/videos/:videoId`
- `GET /api/analytics/creator`

All public feeds return only non-deleted, public, published videos.

## New Frontend Pages

- `client/src/pages/Search.jsx`
- `client/src/pages/Trending.jsx`
- `client/src/pages/SearchHistory.jsx`
- `client/src/pages/CreatorAnalytics.jsx`
- `client/src/pages/VideoAnalytics.jsx`

Updated pages:

- `Home.jsx`: personalized feed sections.
- `WatchVideo.jsx`: related videos and throttled analytics tracking.
- `MyVideos.jsx`: links to creator analytics and per-video analytics.
- `Videos.jsx`, `Channel.jsx`, `PlaylistDetails.jsx`: click source tracking.

## New Frontend Components

- `client/src/components/SearchFilters.jsx`
- `client/src/components/SearchSuggestions.jsx`
- `client/src/components/AnalyticsCard.jsx`
- `client/src/components/RelatedVideos.jsx`
- Updated `VideoCard.jsx` to support click source tracking, duration display, and optional status.

## New Frontend Services

- `client/src/services/searchService.js`
- `client/src/services/recommendationService.js`
- `client/src/services/analyticsService.js`

## How Recommendation Works

For logged-out users:

- Home feed mixes trending, latest, and popular public published videos.

For logged-in users:

- Uses watch history categories and tags.
- Uses liked video categories and tags.
- Uses subscribed creators.
- Boosts recent and high-engagement videos.
- Penalizes videos already completed.
- Limits too many videos from the same creator.

This is intentionally rule-based and explainable. No ML model is used yet.

## How Trending Score Works

Trending is calculated with:

```text
views * 1
+ likesCount * 3
+ commentsCount * 2
+ recentBoost
- dislikesCount * 2
```

Recent boost is highest for videos uploaded in the last 24 hours, then gradually drops for older uploads.

## How Analytics Tracking Works

Frontend sends events without blocking playback:

- Home, search, and trending pages track impressions.
- Video cards track clicks.
- Watch page tracks view on open.
- HLS player progress sends watch progress every 20 seconds.
- Pause and ended events flush progress.
- Ended also sends a completion event.

Backend updates video analytics summary fields safely and ignores very recent duplicate user events for impression/click/view.

## How to Test Advanced Search

1. Start backend and frontend.
2. Upload and publish several public videos with categories and tags.
3. Open `/search`.
4. Search by title, category, tag, creator username, or channel name.
5. Try filters: duration, upload date, and sort order.
6. Confirm private, deleted, failed, and processing videos do not appear.

## How to Test Search Suggestions

1. Open `/search`.
2. Type at least two characters.
3. Confirm suggestions appear.
4. Click a suggestion and confirm it runs a search.

## How to Test Recommendations

1. Log in.
2. Watch videos in a category.
3. Like videos with tags.
4. Subscribe to a creator.
5. Return to `/` and check the recommended and subscription sections.

## How to Test Related Videos

1. Open `/watch/:videoId`.
2. Confirm related videos appear below comments.
3. Related videos should favor same category, similar tags, same creator, and high engagement.

## How to Test Trending Videos

1. Open `/trending`.
2. Switch between Today, This week, and This month.
3. Add likes/comments/views to videos and reload.
4. Confirm public published videos rank higher with stronger engagement.

## How to Test Analytics Events

1. Open the home page, search page, or trending page.
2. Click a video card.
3. Watch at least 20 seconds.
4. Pause and finish the video.
5. Open `/videos/:videoId/analytics` as the video owner.
6. Confirm events, watch time, traffic sources, impressions, and completion rate update.

## How to Test Creator Analytics

1. Log in as a creator.
2. Open `/creator-analytics`.
3. Confirm total videos, views, likes, comments, watch time, top videos, traffic sources, and recent performance.
4. Open a specific video analytics page from My Videos or Creator Analytics.

## Common Errors and Fixes

- `Invalid sort option`: use one of `relevance`, `latest`, `oldest`, `views`, `likes`, `duration`, or `trending`.
- `Invalid video ID`: check the route parameter is a MongoDB ObjectId.
- `Video not found`: the video may be private, deleted, failed, processing, or owned by another user.
- `Unable to load home feed`: confirm backend is running and MongoDB is connected.
- `Search history item not found`: the item was deleted or belongs to a different user.
- `You cannot view analytics for this video`: only video owner or admin can view video analytics.
- No recommendations: create more watch history, likes, subscriptions, or public published videos.
- No analytics data: open a video through home/search/trending and watch long enough for events to send.
- HLS playback issues: verify FFmpeg processing completed and `master.m3u8` exists.

## Verification

Backend load check:

```bash
node -e "require('./server/src/app'); console.log('server app loaded')"
```

Frontend build:

```bash
cd client
npm run build
```

## Next Phase Placeholder

Phase 8 can add the admin dashboard and moderation system: reported content, user controls, creator moderation, platform metrics, and admin-only management screens.
