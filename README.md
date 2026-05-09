# StreamHub

StreamHub is a beginner-to-advanced video streaming platform. Phase 3 adds video uploads and listing on top of the Phase 2 auth system.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, React Router DOM, Axios
- Backend: Node.js, Express, MongoDB (Mongoose), dotenv, cors, nodemon, multer

## Folder Structure
```
streamhub/
  client/
    src/
  server/
    src/
  README.md
  .gitignore
```

## How to Run the Backend
```bash
cd streamhub/server
npm install
npm run dev
```

## How to Run the Frontend
```bash
cd streamhub/client
npm install
npm run dev
```

## Environment Variables
Server (server/.env):
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
```

Client (client/.env):
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Auth Routes (Phase 2)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh-token

## Video Routes (Phase 3)
- POST /api/videos/upload
- GET /api/videos
- GET /api/videos/my-videos
- GET /api/videos/:videoId
- PATCH /api/videos/:videoId
- DELETE /api/videos/:videoId

## Frontend Pages (Phase 3)
- /videos
- /watch/:videoId
- /upload
- /my-videos

## Upload Limits and Formats
- Video max size: 200MB
- Thumbnail max size: 5MB
- Video formats: mp4, mov, mkv, webm
- Thumbnail formats: jpg, jpeg, png, webp
- Uploaded files are served from http://localhost:5000/uploads/
- Phase 3 stores files locally under server/uploads.

## How to Test Auth with Postman
1. Register
  - POST http://localhost:5000/api/auth/register
  - Body: { "fullName": "Bharat Lashotra", "username": "bharat", "email": "bharat@example.com", "password": "password123" }
2. Login
  - POST http://localhost:5000/api/auth/login
  - Body: { "email": "bharat@example.com", "password": "password123" }
3. Current user
  - GET http://localhost:5000/api/auth/me
  - Header: Authorization: Bearer <accessToken>
4. Logout
  - POST http://localhost:5000/api/auth/logout
  - Header: Authorization: Bearer <accessToken>

## How to Test Auth from the Frontend
- Register at /register and log in at /login.
- After login, you should land on /profile.
- Refresh the page to confirm the session persists.

## How to Test Video Upload (Frontend)
- Log in and open /upload.
- Fill title and choose a video file.
- Submit and you should land on /my-videos.
- Visit /videos to see public videos and click any card to watch.

## How to Test Video Upload (Postman)
- POST http://localhost:5000/api/videos/upload
- Headers: Authorization: Bearer <accessToken>
- Body: form-data with fields
  - title: My First Video
  - description: This is my first upload
  - category: Education
  - tags: react,node,streaming
  - visibility: public
  - video: <file>
  - thumbnail: <file> (optional)

## Common Upload Errors and Fixes
- "Access token is missing": log in and send the Authorization header.
- "Video file is required": ensure form-data includes the video field.
- "Unsupported video format": use mp4, mov, mkv, or webm.
- "File is too large": keep videos under 200MB and thumbnails under 5MB.
- "Invalid video ID": verify the URL parameter is a valid ObjectId.

## Current Completed Phase
Phase 3: Video upload and listing (local storage, protected upload, public listing, watch page).

## Next Phase (Placeholder)
Phase 4: Video interactions (likes, comments) and basic creator analytics.
