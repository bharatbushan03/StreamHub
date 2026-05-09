# StreamHub

StreamHub is a beginner-to-advanced video streaming platform built with React, Express, and MongoDB. Phase 6 is complete and upgrades playback from direct MP4 video to FFmpeg-powered HLS adaptive streaming with local processing.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios, hls.js
- Backend: Node.js, Express, MongoDB with Mongoose, JWT auth, Multer, fluent-ffmpeg
- Local processing helpers: ffmpeg-static, ffprobe-static
- Storage in this phase: local files under `server/uploads`

## Current Completed Phase

Phase 6: FFmpeg Video Processing and HLS Adaptive Streaming

- Original videos are stored locally.
- Uploaded videos enter `processing` status.
- FFprobe extracts duration, format, file size, and resolution.
- FFmpeg generates a thumbnail when one is not uploaded.
- FFmpeg creates HLS variants without upscaling above source resolution.
- A master HLS playlist is generated for adaptive playback.
- Watch page uses an HLS player with hls.js fallback.
- My Videos shows processing status, progress, qualities, and retry controls.
- Failed or uploaded videos can be retried by owner/admin.

Phase 6 does not include recommendations, admin dashboard, payments, real-time notifications, cloud storage, Redis, or external queues.

## FFmpeg Requirement

This repo installs `ffmpeg-static` and `ffprobe-static`, so the backend can usually process videos without a system FFmpeg install.

For Windows system FFmpeg setup:

1. Download FFmpeg from `https://www.gyan.dev/ffmpeg/builds/` or the official FFmpeg site.
2. Extract it, for example to `C:\ffmpeg`.
3. Add `C:\ffmpeg\bin` to your Windows `PATH`.
4. Restart the terminal.
5. Verify:

```bash
ffmpeg -version
ffprobe -version
```

Optional environment overrides:

```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
```

If FFmpeg or FFprobe is missing, the upload still creates a video record, then processing fails gracefully with a readable `processingError`.

## Upload Folder Structure

```text
server/uploads/
  originals/
  videos/
  thumbnails/
  hls/
    videoId/
      master.m3u8
      144p/
        index.m3u8
        segment001.ts
      240p/
      360p/
      480p/
      720p/
      1080p/
```

`videos/` remains for compatibility, while new uploads are stored in `originals/`.

## Video Status Workflow

- `uploaded`: video exists but processing has not started or is ready to retry.
- `processing`: FFmpeg is extracting metadata, generating thumbnail, and creating HLS.
- `published`: HLS files are ready and the video is playable.
- `failed`: processing failed; owner/admin can retry.

The frontend polls `/api/videos/:videoId/status` every 5 seconds while a video is uploaded or processing.

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

## Backend Additions

New service:

- `server/src/services/videoProcessing.service.js`
  - Checks FFmpeg/FFprobe availability.
  - Extracts metadata.
  - Generates thumbnails.
  - Creates HLS variants.
  - Writes `master.m3u8`.
  - Updates video status, progress, and errors.

Updated model:

- `server/src/models/video.model.js`
  - `originalFile`
  - `hlsUrl`
  - `masterPlaylistUrl`
  - `qualities`
  - `processingProgress`
  - `processingError`
  - `fileSize`
  - `format`
  - `resolution`
  - `status: uploaded | processing | published | failed`

Updated middleware:

- Uploads now store original videos in `server/uploads/originals`.
- HLS static files use correct MIME types for `.m3u8` and `.ts`.
- Private HLS file access is guarded by JWT for HLS requests.

## API Routes

Video processing:

- `GET /api/videos/:videoId/status`
- `POST /api/videos/:videoId/retry-processing`

Existing video routes still apply:

- `POST /api/videos/upload`
- `GET /api/videos`
- `GET /api/videos/my-videos`
- `GET /api/videos/:videoId`
- `PATCH /api/videos/:videoId`
- `DELETE /api/videos/:videoId`

Upload response now returns a processing video:

```json
{
  "success": true,
  "message": "Video uploaded successfully and is being processed",
  "video": {
    "_id": "...",
    "status": "processing",
    "processingProgress": 0
  }
}
```

## Frontend Additions

New components:

- `client/src/components/HLSPlayer.jsx`
- `client/src/components/VideoStatusBadge.jsx`
- `client/src/components/ProcessingProgress.jsx`

Updated pages:

- `WatchVideo.jsx`
  - Shows processing UI while FFmpeg runs.
  - Polls video status.
  - Uses HLS playback when published.
  - Shows retry button to owner/admin when failed.
- `UploadVideo.jsx`
  - Explains that processing starts after upload.
- `MyVideos.jsx`
  - Shows status badges, progress, qualities, duration, and retry controls.

## How to Upload and Process a Video

1. Start backend and frontend.
2. Log in.
3. Open `/upload`.
4. Upload an MP4, MOV, MKV, or WebM file.
5. Open `/my-videos`.
6. Watch the status move from `processing` to `published`.
7. Open the published video.

## How to Verify Generated HLS Files

After processing completes, check:

```text
server/uploads/hls/<videoId>/master.m3u8
server/uploads/hls/<videoId>/<quality>/index.m3u8
server/uploads/hls/<videoId>/<quality>/segment001.ts
```

Open the video document in MongoDB and confirm:

- `status` is `published`
- `masterPlaylistUrl` points to `/uploads/hls/<videoId>/master.m3u8`
- `qualities` contains generated variants
- `duration`, `format`, `fileSize`, and `resolution` are populated

## How to Test HLS Playback

1. Upload and wait for a video to become `published`.
2. Open `/watch/:videoId`.
3. Confirm the player loads from `masterPlaylistUrl`.
4. Refresh the page and confirm watch history resume still works.
5. Try Chrome/Edge/Firefox to exercise hls.js.
6. Try Safari to exercise native HLS support.

## How to Retry Failed Processing

From frontend:

1. Open `/my-videos`.
2. Find a video with `failed` status.
3. Click `Retry Processing`.

From API:

```http
POST http://localhost:5000/api/videos/<videoId>/retry-processing
Authorization: Bearer <accessToken>
```

Only the video owner or an admin can retry.

## Debugging FFmpeg Errors

- Run `ffmpeg -version` and `ffprobe -version`.
- Check the video's `processingError` field.
- Confirm the original file exists in `server/uploads/originals`.
- Confirm disk space is available.
- Try a known-good MP4 file.
- If a video has no video stream, processing will fail.
- If thumbnail generation fails, processing continues and stores a warning.
- If HLS segment generation fails, the video status becomes `failed`.

## Common Errors and Fixes

- `FFMPEG is not available`: install FFmpeg or use `ffmpeg-static`.
- `FFPROBE is not available`: install FFprobe or use `ffprobe-static`.
- `Original video file is missing`: re-upload or restore the original file.
- `No video stream found in uploaded file`: upload a real video file.
- `Video resolution could not be detected`: the file may be corrupted.
- `HLS playback failed`: check that `master.m3u8`, quality playlists, and segments exist.
- `Video source unavailable`: the video is published but has no HLS or fallback file path.
- `Video processing is already running`: wait for the current processing attempt.
- `Only failed or uploaded videos can be retried`: published videos do not need retry.
- `This video is private`: only the owner/admin can view private video metadata.

## Verification

Backend checks:

```bash
cd server
node --check src/services/videoProcessing.service.js
node --check src/controllers/video.controller.js
node --check src/middleware/hlsAccess.middleware.js
```

Frontend build:

```bash
cd client
npm run build
```

## Next Phase Placeholder

Phase 7 can add scalable media infrastructure: cloud object storage, CDN delivery, a Redis-backed processing queue, and stronger private media delivery. Those are intentionally not included in Phase 6.
