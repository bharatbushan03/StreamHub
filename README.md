# StreamHub

StreamHub is a production-minded video streaming app built with React, Express, MongoDB, JWT auth, local uploads, FFmpeg video processing, HLS playback, creator channels, playlists, subscriptions, engagement, and discovery.

## Current Completed Phase

Phase 9 is complete: Cloud Storage, Redis Queue, Background Video Processing, and CDN-ready HLS Delivery.

Included in Phase 9:

- Production-ready background video processing using Redis and BullMQ.
- Support for multiple storage providers (Local and AWS S3).
- Storage provider abstraction for seamless switching between local dev and cloud production.
- Separate video processing worker to offload CPU-intensive FFmpeg tasks.
- Retryable and cancellable video processing jobs with exponential backoff.
- Automatic download from S3 and upload of generated HLS files/thumbnails back to S3.
- Admin management for processing jobs: view active, waiting, and failed jobs.
- Refactored upload flow with immediate user feedback while processing happens in the background.
- Support for signed upload URLs (optional for S3 provider).
- Cleanup service for temporary and deleted video files.
- CDN-ready HLS delivery URLs.

Not included yet: Docker, final multi-server deployment, payment system, or real-time chat.

## Tech Stack

- Frontend: React with Vite, Tailwind CSS, React Router DOM, Axios, hls.js
- Backend: Node.js, Express, MongoDB with Mongoose, BullMQ, ioredis, AWS SDK v3
- Background Worker: Dedicated process for FFmpeg tasks
- Storage: local fallback or AWS S3-compatible cloud storage
- Job Queue: Redis-backed BullMQ

## Environment Variables

Server: `server/.env`

```env
# Core
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173

# Storage (local or s3)
STORAGE_PROVIDER=local
LOCAL_UPLOAD_BASE_URL=http://localhost:5000/uploads

# AWS S3 (Required if provider is s3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=...
AWS_CLOUDFRONT_URL=

# Redis (Required for background processing)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Processing
VIDEO_PROCESSING_CONCURRENCY=1
ENABLE_WORKER_IN_SERVER=true
```

## How to Run

1. Start Redis:
   - Linux/Mac: `sudo service redis-server start`
   - Windows: Start `redis-server.exe`
2. Start Backend:
   - `cd server && npm run dev`
3. Start Worker (if not enabled in server process):
   - `cd server && npm run worker`
4. Start Frontend:
   - `cd client && npm run dev`

## New Architecture: Upload & Processing

1. **Upload:** User uploads a video through the frontend.
2. **Persistence:** Backend receives the file, uploads the original to the Storage Provider (Local or S3), and creates a Video record with status `uploaded`.
3. **Queue:** A `process_video` job is added to the BullMQ Redis queue. The API immediately returns success to the user.
4. **Processing:** The Background Worker picks up the job.
   - If S3: Downloads the original to local temp.
   - Runs FFmpeg to generate HLS playlists (.m3u8) and segments (.ts) for multiple qualities.
   - Generates a thumbnail.
   - Uploads all generated files to the Storage Provider.
5. **Completion:** Record is updated to status `published` with public CDN/S3 URLs.

## How to Test Local Mode

1. Ensure `STORAGE_PROVIDER=local` in `.env`.
2. Start Redis and the backend.
3. Upload a video.
4. Go to "My Videos". You will see the video status as "Processing" with a progress bar.
5. Once complete, you can watch the video.

## How to Test S3 Mode

1. Configure AWS credentials and bucket in `.env`.
2. Ensure `STORAGE_PROVIDER=s3`.
3. Configure CORS on your S3 bucket to allow your frontend domain for HLS playback.
4. Upload a video.
5. Verify the original file and generated HLS folder appear in your S3 bucket under `videos/{videoId}/`.

## Admin Processing Jobs

As an admin, navigate to "Admin -> Jobs" in the sidebar to monitor the platform's processing queue, view failed jobs with error reasons, and retry or remove them manually.

## Verification

Worker load check:

```bash
node -e "require('./server/src/workers/videoProcessing.worker'); console.log('worker loaded')"
```

## Next Phase Placeholder

Phase 10 can add Dockerization and CI/CD pipelines to ensure the entire system (backend, worker, redis, mongodb) can be easily deployed and scaled.
