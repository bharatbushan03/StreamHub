# StreamHub

StreamHub is a beginner-to-advanced video streaming platform. Phase 1 sets up the monorepo, backend, and frontend with a health check.

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
```

Client (client/.env):
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Current Completed Phase
Phase 1: Basic full-stack setup with health check.

## Next Phase (Placeholder)
Phase 2: Authentication (signup/login, JWT, protected routes).
