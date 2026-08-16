# Production Readiness — Issue Tracker

> Status: **IN PROGRESS** — generated 2026-08-16
> Severity guide: **Critical** (blocks launch), **High** (must fix before launch), **Medium** (fix soon), **Low** (polish).

---

## ✅ Critical (3/3 fixed)

### C1. App crashes in production when env vars are missing — FIXED
- **Symptom:** `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `MONGODB_URI` missing caused runtime crashes with cryptic errors deep inside BetterAuth / Mongoose.
- **Fix:** `validateEnv()` in `server/src/config/env.ts` fails fast at startup in production with explicit, actionable messages listing the missing vars (`NODE_ENV`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `CORS_ORIGIN`). Called at module top of `server.ts` and `app.ts`.
- **Verified:** live server starts only when all required vars are set.

### C2. Session cookies don't work behind a proxy in production — FIXED
- **Symptom:** cookies and client IPs broken when running behind a reverse proxy / platform edge.
- **Fix:** `app.set("trust proxy", 1)` in `app.ts` when `NODE_ENV === "production"`; BetterAuth `secure: isProd`, `sameSite: isProd ? "none" : "lax"`, cookie prefix `ledg`, 7-day `Max-Age`. Client uses `credentials: "include"` on all API requests.
- **Verified:** dev cookie `SameSite=Lax`; headers (CSP/HSTS/etc.) present from helmet; CORS preflight reflects `http://localhost:5173` with credentials.

### C3. Unauthenticated abuse of API / auth endpoints — FIXED
- **Symptom:** no throttling; brute-force sign-in and endpoint flooding possible.
- **Fix:** `express-rate-limit`:
  - `authLimiter` — 100 req / 15 min on `/api/auth/*` (sign-up, sign-in, etc.)
  - `apiLimiter` — 600 req / 15 min on `/api/v1/*`
  - `standardHeaders: true`, `RateLimit-Policy` header observed on live server.
- **Verified:** live burst test returned 97×200 then 13×429.

---

## ⚠️ High (4/4 fixed)

### H1. Error responses leak internal details (stack traces, Mongo errors) — FIXED
- **Symptom:** unknown errors returned raw error messages / stack traces to clients.
- **Fix:** `error-handler.ts` logs the full error server-side via pino (with `[REDACTED]` for sensitive headers) and returns a generic `500 "Internal server error"` to the client. No stack or internal message exposure.
- **Verified:** live transaction with invalid id returned `{"success":false,"message":"Internal server error","errors":[]}`.

### H2. Verbose `console.log` / `console.error` noise in server logs — FIXED
- **Symptom:** unstructured console output with no log levels, request context, or redaction.
- **Fix:** pino + `pino-http` (`server/src/config/logger.ts`). Structured JSON logs, levels via `LOG_LEVEL` (default `info` prod / `debug` dev), serializers emit only `id`, `method`, `url` (query stripped), `remoteAddress`, `statusCode`. All `console.*` removed from `server/src`.
- **Verified:** no `console.` matches in `server/src`; server build passes.

### H3. Missing security headers — FIXED
- **Fix:** `helmet` mounted first in `app.ts`. Observed live: CSP, HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Cross-Origin-Opener-Policy, etc.

### H4. BetterAuth mounted after `express.json()` breaks non-JSON bodies — FIXED
- **Symptom:** auth endpoints with non-JSON payloads (e.g. `multipart/form-data` for Google OAuth callback) could be consumed/corrupted by `express.json()`.
- **Fix:** mount BetterAuth `before` `express.json()` in `app.ts`.
- **Verified:** BetterAuth endpoints respond correctly on live server.

---

## 🟠 Medium (remaining)

- **M1.** Google OAuth requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in prod env; not live-tested yet (email/password verified).
- **M2.** Email verification flow (`emailVerified`) not end-to-end tested in production mode.
- **M3.** Analytics "all spaces" aggregation (`spaceId=all` → `$in` on owner's spaces) needs a prod-size data sanity check.
- **M4.** Delete-account cascade (`deleteUserWithData` → spaces → transactions → user) not destructive-tested in prod.
- **M5.** MongoDB indexes: unique sparse `betterAuthId`, and per-space `spaceId`/`date`/`type` index for analytics aggregations — confirm in prod.
- **M6.** No integration tests in CI yet (only `tsc` builds). Consider a smoke-test script against `/health` + auth flow.

---

## 🔵 Low (remaining)

- **L1.** `client/.env.example` should document `VITE_API_URL` default behavior (relative when behind same-origin proxy).
- **L2.** `server/.env.example` should add `LOG_LEVEL` and `CORS_ORIGIN` with comments.
- **L3.** Favicon / meta (OG) tags for the deployed domain.

---

## 🚀 Pre-deploy checklist (v1)

- [x] `NODE_ENV`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `CORS_ORIGIN` set on host
- [x] Server + client production builds pass (`tsc`, `vite build`)
- [x] Live smoke test: sign-up → session → spaces → transaction → analytics (single + "all") → recurring
- [x] Rate limits and security headers verified on live server
- [ ] Google OAuth keys set (if enabling social login) — else keep email/password only
- [ ] `BETTER_AUTH_URL` points to the public HTTPS origin
- [ ] Database indexes checked on prod cluster
- [ ] Tag `v1` created; deploy from that tag

---

## 🧭 Architecture / pipeline notes

- **Auth:** BetterAuth (email/password + Google) → Mongoose `users` collection synced via `databaseHooks.user.*` (`upsertUserFromAuth`, `deleteUserWithData`). `authenticate` middleware is read-only (`resolveUserIdFromAuth` — read-first, create-if-missing) so app users are always resolvable from a valid session.
- **Two user stores by design:** BetterAuth `user`/`session`/`account`/`verification` + app `User` (linked via `betterAuthId`). Spaces/Transactions FK to app `User._id`.
- **API:** `/api/v1` (app), `/api/auth/*` (BetterAuth), `/health`. Rate-limited + helmet-protected.
- **Logging:** pino JSON logs; `req.headers.*`, passwords, tokens, secrets redacted. Query strings stripped from request URLs.
- **Env validation:** `validateEnv()` fail-fast in production only (dev falls back to safer defaults).