# PocketSchool admin dashboard

The Next.js dashboard provides user management and API activity monitoring for the Express API.

## Run locally

1. Start the Express API from the project root with `npm start` (port 3000).
2. In `dashboard`, copy `.env.example` to `.env.local` and set `DASHBOARD_ADMIN_KEY` to a private key of your choice. Keep `BACKEND_API_TOKEN` aligned with the API's `API_TOKEN` setting; both default to `123` for this demo.
3. In `dashboard`, run `npm run dev` and open `http://localhost:3001`.
4. Sign in with the `DASHBOARD_ADMIN_KEY` you configured.

The admin key is stored in the browser's session storage and is checked by the Next.js API routes before any dashboard data or user-management operation is forwarded to Express.

Users are stored in the root `users.json` file. Dashboard analytics read the existing request log and User-Agent counters.
