# Copilot/Agent guidance for be-haus-mvp-ui

## Quick summary ✅
- Small Express + SQLite MVP that serves static frontend files from `public/` and exposes a JSON REST API under `/api`.
- Run: `npm start` (or `npm run dev`) → server listens on port **3000**.
- DB file: `hotel_bookings.db` (created automatically in project root). Seeded user: **admin / 1234** (see `src/database.js`).

## Architecture & key files 🔧
- `server.js` — app entry point. Serves static files and mounts the API router at `/api`. Some protected frontend routes use `authenticateMiddleware`.
- `src/routes/api.js` — main REST API. Router applies `authenticateMiddleware` at the top: all routes require auth.
- `src/auth.js` — cookie-based auth helpers: `handleLogin`, `handleLogout`, `authenticateMiddleware`. Cookie name: `user_id` (httpOnly).
- `src/database.js` — SQLite initialization + schema + seeding. Uses `sqlite3` and `bcrypt` for the seeded admin user.
- `public/components/*.js` — frontend custom elements that call the API using `fetch` and expect JSON responses (examples: `login-form.js`, `room-planner.js`, `invoice-list-dashboard.js`).

## Conventions & patterns to follow 🧭
- API responses: JSON with explicit status codes. Success often uses `res.json({ message: ..., data: ... })`. Errors use `res.status(<code>).json({ error: '...' })`.
- DB access: `sqlite3` callbacks (`db.get`, `db.all`, `db.run`) — preserve callback style and error handling patterns when modifying or adding endpoints.
- Request validation is performed manually inside handlers: validate required fields and return `400` with a clear message.
- Authentication rule: presence of `user_id` cookie -> considered authenticated. Login sets cookie via `res.cookie('user_id', user.id, { httpOnly: true, maxAge: ... })`.
- Language: code comments and many responses are Spanish. Keep error/message strings consistent with existing Spanish messages when modifying behavior.

## Important business rules & examples (copyable) 📋
- Login endpoint: `POST /api/login` — body `{ username, password }`. Example (from `public/components/login-form.js`).
- Protected endpoints: all under `/api/*` (see `src/routes/api.js` which uses `router.use(authenticateMiddleware)`).
- Booking creation: `POST /api/bookings` validates required fields, checks date overlap, and (intended) stores `price_per_night`. See the overlap query and conflict handling in `src/routes/api.js`.
- Booking deletion: `DELETE /api/bookings/:id` forbids deleting when `status` is `occupied` or `checked-in` (returns `403`).
- Invoice generation: `POST /api/invoices/generate/:bookingId` requires `payment_method`, only invoices if booking `status === 'checked-out'`, computes total, inserts into `invoices` and marks room `clean_status = 'dirty'`. Invoice number format: `INV-YYYYMMDD-BOOKINGID` (see `src/routes/api.js`).

## Known inconsistencies & TODOs ⚠️
- The API inserts/updates a `price_per_night` column into `bookings` (see `POST /api/bookings` and `PUT /bookings/:id`), but `src/database.js`'s `CREATE TABLE bookings` **does not currently declare** `price_per_night`. This will cause DB errors on insert/update. Action for agents: add the column to DB initialization or update the API to store price elsewhere.
- Authentication is intentionally minimal (cookie presence only). Treat it as an MVP convenience — do not assume it's production-grade session handling.

## Developer workflows & useful commands ⚙️
- Start server: `npm start` or `npm run dev` (both run `node server.js`).
- Reset DB: stop server, delete `hotel_bookings.db`, restart server to re-run `seedDatabase`.
- Inspect DB: `sqlite3 hotel_bookings.db` (explore tables like `rooms`, `bookings`, `invoices`).
- Debugging: server logs to stdout (`console.log`). Use browser devtools to inspect cookies and network requests; frontend custom elements expect JSON responses and redirect to `/dashboard` after successful login.

## How frontend talks to the backend (examples) 🔁
- `login-form.js` → `fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })` — on success, `window.location.href = '/dashboard'`.
- `settings-panel.js` uses `fetch('/api/user/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) })` and relies on cookie auth.

## Testing & CI notes 🧪
- There are no automated tests or CI configs. If adding tests, prefer lightweight integration tests that start the server and exercise endpoints (consider `supertest` + an ephemeral SQLite DB file).

## When in doubt — quick pointers 🔍
- To see authentication logic: open `src/auth.js`.
- To add/change endpoints: update `src/routes/api.js` and mimic existing validation & error handling style.
- To inspect DB schema and seed behavior: read `src/database.js` (seed includes initial `admin` user and sample `rooms`).

---
If any section is unclear or you'd like more examples (cURL snippets, more endpoint samples, or a short checklist for onboarding new agents), tell me which part to expand. ✅