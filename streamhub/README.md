# StreamHub

StreamHub is a beginner-to-advanced video streaming platform. Phase 2 adds a full authentication system on top of the Phase 1 setup.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, React Router DOM, Axios
- Backend: Node.js, Express, MongoDB (Mongoose), dotenv, cors, nodemon

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

## Current Completed Phase
Phase 2: Authentication (register/login/logout, protected routes, session persistence).

## Next Phase (Placeholder)
Phase 3: Video upload basics and creator video listing.
