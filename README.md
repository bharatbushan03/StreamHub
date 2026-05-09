# StreamHub

StreamHub is a beginner-to-advanced video streaming platform built with React, Express, and MongoDB. Phase 4 is complete and adds the video engagement system on top of authentication, uploads, listings, and direct playback.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios
- Backend: Node.js, Express, MongoDB with Mongoose, JWT auth, Multer
- Storage in this phase: local video and thumbnail uploads under `server/uploads`

## Current Completed Phase

Phase 4: Video Engagement System

- Like and dislike videos
- Switch between like and dislike
- Remove an existing like or dislike
- Add comments
- Edit your own comments
- Delete your own comments
- Allow video owners and admins to delete comments
- Track watch history for logged-in users
- Resume videos from the last watched position
- Show recent watch history
- Improve safe view count incrementing when a video is opened

Phase 4 does not include HLS, FFmpeg transcoding, playlists, subscriptions, recommendations, or an admin dashboard.

## Folder Structure

```text
streamhub/
  client/
    src/
      components/
      context/
      pages/
      routes/
      services/
      utils/
  server/
    src/
      controllers/
      middleware/
      models/
      routes/
      utils/
  README.md
```

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

The backend defaults to `http://localhost:5000`.

## How to Run the Frontend

```bash
cd client
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173`.

## Backend Models Added in Phase 4

- `server/src/models/like.model.js`
  - Stores one `like` or `dislike` reaction per user per video.
  - Uses a unique compound index on `video + user`.
- `server/src/models/comment.model.js`
  - Stores comments with edit and soft-delete flags.
  - Limits content to 1,000 characters.
- `server/src/models/watchHistory.model.js`
  - Stores resume position, watched duration, completed state, and last watched time.
  - Uses a unique compound index on `user + video`.

## Backend Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh-token`

Videos:

- `POST /api/videos/upload`
- `GET /api/videos`
- `GET /api/videos/my-videos`
- `GET /api/videos/:videoId`
- `PATCH /api/videos/:videoId`
- `DELETE /api/videos/:videoId`

Engagement:

- `POST /api/videos/:videoId/like`
- `POST /api/videos/:videoId/dislike`
- `GET /api/videos/:videoId/reaction`
- `POST /api/videos/:videoId/comments`
- `GET /api/videos/:videoId/comments?page=1&limit=20&sortBy=latest`
- `PATCH /api/comments/:commentId`
- `DELETE /api/comments/:commentId`

Watch history:

- `POST /api/videos/:videoId/watch-history`
- `GET /api/users/watch-history?page=1&limit=20`
- `DELETE /api/users/watch-history/:historyId`
- `DELETE /api/users/watch-history`

Protected engagement routes use `req.user` from the JWT middleware. The frontend never sends a trusted `userId`.

## Frontend Pages

- `/` - Home
- `/login` - Login
- `/register` - Register
- `/profile` - Protected profile page
- `/videos` - Public video listing
- `/watch/:videoId` - Watch page with likes, dislikes, comments, and resume tracking
- `/upload` - Protected upload page
- `/my-videos` - Protected creator video manager with engagement counts
- `/history` - Protected watch history page
- `/*` - Not found page

## Frontend Services Added in Phase 4

- `client/src/services/videoService.js`
  - `likeVideo(videoId)`
  - `dislikeVideo(videoId)`
  - `getVideoReaction(videoId)`
- `client/src/services/commentService.js`
  - `getComments(videoId, params)`
  - `addComment(videoId, content)`
  - `updateComment(commentId, content)`
  - `deleteComment(commentId)`
- `client/src/services/watchHistoryService.js`
  - `updateWatchHistory(videoId, data)`
  - `getMyWatchHistory(params)`
  - `deleteWatchHistoryItem(historyId)`
  - `clearWatchHistory()`

## How to Test Likes and Dislikes

1. Start the backend and frontend.
2. Register or log in.
3. Upload a public video or open an existing public video at `/watch/:videoId`.
4. Click `Like`.
5. Click `Like` again to remove the like.
6. Click `Dislike`.
7. Click `Like` after disliking to confirm it switches from dislike to like.
8. Log out and click a reaction button to confirm the UI asks you to log in.

Postman examples:

```http
POST http://localhost:5000/api/videos/<videoId>/like
Authorization: Bearer <accessToken>
```

```http
POST http://localhost:5000/api/videos/<videoId>/dislike
Authorization: Bearer <accessToken>
```

```http
GET http://localhost:5000/api/videos/<videoId>/reaction
Authorization: Bearer <accessToken>
```

## How to Test Comments

1. Open a public or unlisted video.
2. Confirm comments are visible while logged out.
3. Log in and post a comment.
4. Try an empty comment and a comment over 1,000 characters to confirm validation.
5. Edit your own comment.
6. Delete your own comment.
7. As the video owner, delete another user's comment on your video.
8. Confirm deleted comments no longer appear publicly.

Postman examples:

```http
POST http://localhost:5000/api/videos/<videoId>/comments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "content": "This is a great video"
}
```

```http
GET http://localhost:5000/api/videos/<videoId>/comments?page=1&limit=20&sortBy=latest
```

```http
PATCH http://localhost:5000/api/comments/<commentId>
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "content": "Updated comment"
}
```

```http
DELETE http://localhost:5000/api/comments/<commentId>
Authorization: Bearer <accessToken>
```

## How to Test Watch History

1. Log in.
2. Open a video at `/watch/:videoId`.
3. Play for at least 10 to 15 seconds.
4. Pause the video to force a progress sync.
5. Refresh the page and confirm playback resumes near the last watched position.
6. Open `/history` and confirm the video appears with progress.
7. Use `Continue` to return to the video.
8. Remove one history item.
9. Use `Clear history` to remove all history records.

Postman examples:

```http
POST http://localhost:5000/api/videos/<videoId>/watch-history
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "lastWatchedPosition": 120,
  "watchedDuration": 120,
  "completed": false
}
```

```http
GET http://localhost:5000/api/users/watch-history?page=1&limit=20
Authorization: Bearer <accessToken>
```

```http
DELETE http://localhost:5000/api/users/watch-history/<historyId>
Authorization: Bearer <accessToken>
```

```http
DELETE http://localhost:5000/api/users/watch-history
Authorization: Bearer <accessToken>
```

## Common Errors and Fixes

- `Access token is missing`: log in and send `Authorization: Bearer <accessToken>`.
- `Token expired`: log in again and retry the protected action.
- `Invalid video ID`: verify the URL contains a valid MongoDB ObjectId.
- `Video not found`: the video may not exist or may have been soft deleted.
- `This video is private`: only the video owner can engage with or track a private video in this phase.
- `Comment cannot be empty`: send non-empty content after trimming spaces.
- `Comment must be less than 1000 characters`: shorten the comment.
- `You cannot edit this comment`: only the comment owner can edit it.
- `You cannot delete this comment`: only the comment owner, video owner, or admin can delete it.
- `Last watched position cannot be negative`: send zero or a positive number.
- `Watched duration cannot be negative`: send zero or a positive number.
- `Completed must be true or false`: send a boolean value.
- Upload errors: keep videos under 200MB, thumbnails under 5MB, and use supported formats.

## Verification

Useful checks:

```bash
cd server
node --check src/controllers/like.controller.js
node --check src/controllers/comment.controller.js
node --check src/controllers/watchHistory.controller.js
node --check src/controllers/video.controller.js
```

```bash
cd client
npm run build
```

## Next Phase Placeholder

Phase 5 will be built after the next instruction. A likely next milestone is streaming infrastructure, such as HLS playback and FFmpeg-based transcoding, but it has not been added in Phase 4.
