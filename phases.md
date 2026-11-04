# Performance Phases

Goal: make the app feel fast **without** changing the database engine.

Migration to PostgreSQL is explicitly **out of scope**. The measured problem is
round trips + cold starts, not query execution, and the existing compound
indexes already cover the dashboard queries.

Part 2 (below) covers the approved feature wave. Everything still deferred lives
in `Remainingplan.md`.

## Status

| Phase | What                                            | Status |
| ----- | ----------------------------------------------- | ------ |
| 1     | Dashboard 6 queries → 1 `$facet`                | done   |
| 2     | Analytics page 5 queries → 1 `$facet`           | done   |
| 3     | Redis cache for dashboard + write invalidation  | done   |
| 4     | Auth: cookie cache + drop redundant user lookup | done   |
| 5     | Parallelize list count + page                   | done   |
| 6     | Connection pool + response-time logging         | done   |
| 7     | Feature wave: 6 approved items (Part 2)         | done   |

Files added: `server/src/domains/analytics/cache.ts`.
Files changed: `analytics/{repository,service}.ts`, `spaces/{repository,service}.ts`,
`transactions/{repository,service}.ts`, `dues/service.ts`, `auth.ts`,
`common/middlewares/authenticate.ts`, `database/index.ts`, `app.ts`.

Verified with `npm run typecheck`, `npm --prefix server run lint`, and a seeded
local Mongo run that compared the new `$facet` output against a hand-computed
reference for totals, category breakdowns, payment methods, recent
transactions, and the current/previous analytics ranges.

Each phase is independently shippable. Do them in order — later phases assume
the earlier ones.

---

## Phase 1 — Dashboard: 6 queries → 1

**Problem.** `getDashboardSummary` fires six separate aggregation pipelines
(`analytics/service.ts`). Each is a full network round trip to Atlas. Two of
them (`getSpaceSummary` with no date range) scan the user's entire history.

**Change.**

- Add `getDashboardData(spaceIds, monthStart)` in
  `server/src/domains/analytics/repository.ts` using a single `$facet`
  pipeline: `allTime`, `month`, `expenseCategories`, `incomeCategories`,
  `paymentMethods`, `recentTransactions`.
- Add `findSpaceIdsForUser` to `server/src/domains/spaces/repository.ts` so the
  `"all"` path fetches only `_id` instead of full space documents with members.
- Rewire `getDashboardSummary` to call it once.

**Result.** 6 round trips → 1, and 6 scans → 1.

**Trade-off.** `$facet` sub-pipelines run in memory after the initial indexed
`$match`, so the month buckets are filtered in memory instead of via the
`{spaceId, date}` index. At personal-finance volume (thousands of docs) this is
a large net win. If a user ever reaches ~1M transactions, split the month
buckets back into indexed queries.

---

## Phase 2 — Analytics page: 5 queries → 1

**Problem.** `getAnalyticsSummary` runs five pipelines (current totals, previous
totals, current expense categories, previous expense categories, current income
categories) via `Promise.all` — parallel, but still five round trips and five
scans.

**Change.**

- Add `getAnalyticsSummaryData(spaceIds, range, prevRange)` using `$facet`
  with `current`, `previous`, `currentExpenseCategories`,
  `previousExpenseCategories`, `currentIncomeCategories`.
- Rewire `getAnalyticsSummary`.

**Result.** 5 round trips → 1. Same trade-off note as Phase 1.

---

## Phase 3 — Cache the dashboard in Redis

**Problem.** Every dashboard mount / window focus re-runs the aggregation, and
`refetchOnWindowFocus: true` makes that frequent. Redis is already installed
(`config/redis.ts`) but only used for notification spam windows.

**Change.**

- New `server/src/domains/analytics/cache.ts`:
  - `getCachedDashboard(userId)` / `setCachedDashboard(userId, data)`
  - 60s TTL, key `dash:v1:{userId}`
  - No-ops when Upstash env vars are absent (local dev), so nothing breaks.
  - Never throws — cache failures degrade to the DB path.
- `getDashboardSummary` checks the cache **before** resolving spaces, so a hit
  costs 0 Mongo queries.
- Invalidate on every write that changes totals:
  - `transactions/service.ts` — create / update / move / delete
  - `dues/service.ts` — create / settle / undo / delete (dues writes create
    `source: "dues"` transactions that count toward totals)
  - `spaces/service.ts` — create / delete / remove member / leave / transfer
    ownership
- Invalidate for the actor **and** every member of the affected space, since
  the dashboard aggregates all spaces the user belongs to.

**Result.** Repeat dashboard loads become a single Redis read (~10–20ms)
instead of a Mongo aggregation.

**Note.** Shared-space writes invalidate all members immediately. If a write
path is ever missed, the 60s TTL is the backstop.

**Hardening (after the first real run).** A failing Upstash call was holding
the dashboard request open for ~15s. The client's default is 5 retries with
exponential backoff (`Math.exp(n) * 50`), so a dead endpoint cost ~9.7s on the
read and ~5.1s on the write. Fixes:

- `config/redis.ts`: `retries: 0` and a per-request `AbortSignal.timeout`.
- `analytics/cache.ts`: after 3 consecutive failures, skip the cache for 30s
  (per-process circuit) so requests stop paying even the timeout.
- Cache failures log with the `err` key so pino serialises the real cause
  (`error` was being dropped as `{}`).

Measured against a blackholed endpoint: one timeout per call, then 0ms once the
circuit opens. A Redis outage costs at most a couple of timeouts on the first
few requests per instance and nothing afterwards.

**Cold-start follow-up.** The first timeout cap was 500ms. A fresh process also
pays DNS + TLS on its first call (~200–400ms observed), so cold starts were
losing the race and silently skipping the cache — the endpoint was fine, the
budget was too tight. Cap raised to 1s, and `warmRedis()` now pings once at boot
(fire-and-forget) so local dev pays the handshake at startup rather than on the
first request.

Verified against the live Upstash instance:

```
warmup (cold)            203ms
ping (warm)               52ms
dashboard cache miss      51ms
dashboard cache hit       49ms
create transaction      key gone
delete transaction      key gone
```

Invalidation was checked through the real service layer: creating a 1-unit
transaction dropped the cache key and the next summary reflected exactly +1;
deleting it dropped the key again and the probe row was removed.

`getDashboardSummary` also logs `Dashboard aggregation slow` when the
aggregation itself exceeds 250ms, so remaining latency can be attributed to
Mongo rather than the cache.

---

## Phase 4 — Auth: stop paying 3 DB queries per request

**Problem.** Every authenticated request currently does:

1. `auth.api.getSession()` → session lookup in Mongo
2. `customSession` plugin → `UserModel.findOne` for the domain user
3. `resolveUserIdFromAuth` in `authenticate` → the _same_ `UserModel.findOne`
   again

**Change.**

- Enable Better Auth's cookie cache (`session.cookieCache`, 5 min, `compact`).
  Step 1 becomes a signed-cookie read on the hot path.
- Add `userId` (domain `_id`) as a Better Auth `additionalFields` entry and sync
  it from the `databaseHooks.user.create/update` handlers. `customSession` then
  reads it from the session payload and only falls back to the DB when it is
  missing (first request for pre-existing users — it heals itself).
- `authenticate` / `optionalAuthenticate` use `session.user.userId` directly
  and only call `resolveUserIdFromAuth` when it is absent.

**Result.** 3 Mongo queries → 0 on the steady-state auth path.

**Rollout note.** Existing users are backfilled lazily on their next request.
No migration script required, but running
`server/src/scripts/backfill-created-by.ts`-style backfill is optional.

---

## Phase 5 — Parallelize list count + page

**Problem.** `findTransactions` awaits `countDocuments` and then `find`
sequentially — two round trips end-to-end.

**Change.** `Promise.all` them in
`server/src/domains/transactions/repository.ts`.

**Why not `$facet` here.** The list query relies on the
`{spaceId, date}` index for its sort. Wrapping it in `$facet` would force an
in-memory sort of every matching document. Parallel round trips keep the
index-backed sort and still halve the latency.

`findDebtsByUser` is already parallel — no change.

---

## Phase 6 — Connection + visibility

**Change.**

- `database/index.ts`: explicit pool settings (`maxPoolSize`, `minPoolSize`,
  `serverSelectionTimeoutMS`, `maxIdleTimeMS`) so warm serverless instances
  reuse connections instead of opening new ones.
- `app.ts`: include `responseTime` in the pino-http `res` serializer so
  per-route latency is visible in logs.
- Optional: `MONGOOSE_DEBUG=true` logs every query + duration for local
  profiling.

**Deployment action (now done in code).** Put the Mongo cluster and the Vercel
functions in the same region. `server/vercel.json` pins the function to
`bom1` (Mumbai) because the Atlas cluster lives there; leaving it on the
`iad1` default meant every API call crossed the Atlantic. The Upstash database
must live in `ap-south-1` too — a cross-region cache read costs more than the
query it replaces.

---

## Explicitly not doing

- **PostgreSQL migration.** Same network, same cold start, same round-trip
  count. You would re-create the indexes you already have and lose the working
  aggregation code. Revisit only if you need cross-entity joins or
  multi-document transactions that Mongo cannot express.
- **Changing the data model.** Nothing here requires it.

---

## Verification

After each phase:

1. `npm run typecheck` (root — covers client + server)
2. `npm run lint`
3. Hit `GET /api/v1/dashboard/summary` twice and compare `responseTime` in the
   logs. The second call should be a cache hit (Phase 3+).
4. Confirm `GET /health` reports `db.readyState: 1`.

---

# Part 2 — Feature Wave (2026-11)

**Scope:** 6 of the 29 remaining items in `Remainingplan.md`, chosen because
they either fix a broken promise, remove daily friction, or are required to
launch safely. The other 23 stay deferred. **No PostgreSQL migration** — this
wave stays on MongoDB/Mongoose.

| Item | What shipped                                   | Status |
| ---- | ---------------------------------------------- | ------ |
| P0.2 | Removed the dead `daily_digest` option         | done   |
| P0.4 | Focused Vitest suite + GitHub Actions CI       | done   |
| P1.5 | Payment-method breakdown on the analytics page | done   |
| P2.1 | Hand-rolled SVG spending trend chart           | done   |
| P3.1 | "Repeat a recent transaction" chips            | done   |
| P5.5 | Opt-in Sentry error tracking (server + client) | done   |

## P0.2 — Remove `daily_digest`

The settings sheet offered "Daily Digest", but `notify()` dropped every
transaction notification unless the preference was `"realtime"`. Choosing the
digest silently disabled alerts — the UI promised something the backend never
did.

- Removed `"daily_digest"` from `TRANSACTION_ACTIVITY_MODES`
  (`client/src/shared/enums`, synced to the server).
- Removed the option from the settings UI.
- `getPreferences()` maps any legacy stored value to `"off"` and heals the row
  in place. `"off"` matches what those users actually experienced.

No scheduler, digest queue, or email delivery was added. If digest delivery is
ever wanted, it starts from `Remainingplan.md` P0.1/P0.2 as a real feature.

## P0.4 — Tests + CI

Focused coverage, not exhaustive coverage. Four files, 14 tests:

| File                                              | Covers                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `server/src/domains/analytics/period.test.ts`     | Asia/Kathmandu period boundaries (the UTC+05:45 cases), custom ranges, previous ranges                                       |
| `server/src/domains/analytics/repository.test.ts` | `$facet` totals, previous totals, category/payment-method breakdowns, day/month trend buckets, dues + cross-space exclusions |
| `server/src/domains/analytics/cache.test.ts`      | Versioned key, cache hit, circuit breaker after 3 failures, deduped invalidation                                             |
| `server/src/common/utils/session.test.ts`         | `domainUserIdFromSession` valid/invalid ids                                                                                  |

- Runner: Vitest 5 in `server/` (`npm --prefix server test`). Vite is a dev
  dependency because Vitest 5 declares it as a peer.
- The repository test uses a real Mongo database
  (`MONGODB_TEST_URI`, default `mongodb://localhost:27017/ledg_test`) and drops
  it before/after. `fileParallelism: false` keeps the shared DB deterministic.
- `server/tsconfig.build.json` excludes `*.test.ts` so tests never land in
  `dist/`; `tsc --noEmit` still typechecks them.
- `.github/workflows/ci.yml` runs `npm ci` for root/server/client, syncs shared
  types, then typecheck → lint → test against a `mongo:7` service container.
- Root `npm test` proxies to the server suite.

## P1.5 — Payment methods on analytics

The dashboard already computed `byPaymentMethod`, but the analytics page never
showed it.

- Added a `paymentMethods` bucket to the existing analytics `$facet` (expenses
  only, `source !== "dues"`, null → `cash`), so no extra round trip.
- `getAnalyticsSummary` returns `byPaymentMethod`.
- `/analytics` renders a "Payment methods" card with icon, amount, share bar,
  and transaction count.

## P2.1 — Spending trend chart

No chart library was added. The chart is hand-rolled SVG, matching the existing
`SavingsRing` approach and keeping the bundle small.

- Server: a `trend` bucket in the same `$facet` groups by
  `$dateToString` in `+05:45`, returning `{ key, income, expense }`.
- Granularity rule: today → hour, month/3M → day, year/all → month,
  custom → day when the span is ≤ 92 days, otherwise month.
- The service fills missing buckets so the x-axis is continuous (skipped for
  "all time", where the start is unknown).
- Client: `client/src/components/analytics/spending-trend-chart.tsx` draws
  income and expense lines, an expense area, grid lines, x-axis ticks, and
  native `<title>` tooltips per point. The SVG has a `role="img"` summary for
  screen readers.

## P3.1 — Repeat a recent transaction

No `Template` model, no management UI. The form reuses
`useDashboardSummary().recentTransactions`.

- Up to 3 deduplicated chips appear when adding (not editing) a transaction.
- Tapping one fills type, category, amount, note, payment method, and space,
  then sets the date to today.
- The dashboard query is already cached, so this adds no request.

## P5.5 — Error tracking

Opt-in, no-op without a DSN.

- Server: `server/src/config/error-tracking.ts` initialises at module load
  (`app.ts`) so Vercel picks it up, and captures unhandled errors in
  `error-handler.ts`, `uncaughtException`/`unhandledRejection`, and startup
  failures.
- Client: `client/src/lib/error-tracking.ts` initialises in `main.tsx`;
  `ErrorBoundary.componentDidCatch` reports the error and component stack.
- Env: `SENTRY_DSN` (server) and `VITE_SENTRY_DSN` (client), both optional and
  documented in the `.env.example` files.
- `tracesSampleRate: 0` — errors only. Performance tracing can be turned on
  later without touching call sites.

## Verification

- `npm run typecheck` — client + server, clean.
- `npm run lint` — 0 errors (only pre-existing warnings).
- `npm --prefix server test` — 4 files, 14 tests passed.
- `npm run build:server` — clean; no `*.test.js` in `dist/`.
- `npm run seed` — demo data now includes six recent-day transactions so the
  trend chart has multiple points even when seeded early in a month.

## Deliberately not built

The scheduler and everything that depends on it (due reminders, monthly email,
recurring auto-create), accounts, custom categories, PWA/offline, command
palette, savings goals, per-category budgets, anomaly detection, forecast,
streak, roles, API versioning, shared-package migration, and DB ping. See
`Remainingplan.md` for the full list and the trigger for each.

---

# Part 3 — Data Portability (2026-11)

Export already shipped: CSV from the Activity page, and CSV + JSON in Settings →
Data & Backup. This wave adds the other half — import.

## Import

- `POST /api/v1/import` accepts up to 5,000 normalised rows and validates each
  one independently, so a single bad line does not reject the file.
- Duplicate rows are matched on space, type, amount, category, note and local
  day. That is the coarsest key a CSV export can round-trip, since the export
  carries only a date and time. Duplicate skipping is on by default and can be
  turned off.
- Destination is either one chosen space, or the spaces named in the file. In
  the latter case missing spaces are created, up to the existing 10-space cap.
- Rows are inserted in chunks of 500 with `ordered: false`, and dashboard caches
  are invalidated for every member of every affected space.
- Imports do not emit per-row notifications. Restoring a backup should not spam
  the other members of a shared space.
- The client parser accepts the app's own CSV export (Date, Time, Type,
  Category, Amount (NPR), Note, Payment Method, Space), a flexible header map,
  the JSON backup shape (`{ spaces, transactions }`), or a bare transaction
  array.
- UI: Settings → Data & Backup → Import Transactions. The preview shows the row
  count, date range, spaces, and skipped-row errors before anything is written.

## Verification

- `npm run typecheck` — client + server, clean.
- `npm run lint` — 0 errors (12 pre-existing warnings).
- `npm --prefix server test` — 5 files, 20 tests passed (6 new import tests).
- Client parser checked against the real CSV export, quoted commas, escaped
  quotes, bad rows, and the JSON backup shape.
