# Procure Agent frontend

The Next.js app uses the backend session cookie for authentication. The login page has no public registration; users are provisioned through the backend seed or an admin process.

## Run locally

1. Start PostgreSQL, apply migrations, and run the backend seed as described in the root README.
2. Copy `.env.example` to `.env.local` only if the backend API is not at `http://localhost:3001`.
3. Run the frontend:

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. The backend CORS origin defaults to `http://localhost:3000` and must allow credentials for the HttpOnly session cookie.

The app includes request drafting and tracking, manager approval, procurement processing, search/filter, audit display, and session login/logout. The browser never chooses or submits the actor's user ID as proof of identity; protected API calls carry the session cookie.
