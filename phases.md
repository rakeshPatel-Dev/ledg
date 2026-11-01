# Performance Phases

Goal: make the app feel fast **without** changing the database engine.

Migration to PostgreSQL is explicitly **out of scope**. The measured problem is
round trips + cold starts, not query execution, and the existing compound
indexes already cover the dashboard queries.

## Status

| Phase | What | Status |
|---|---|---|
| 1 | Dashboard 6 queries → 1 `$facet` | done |
| 2 | Analytics page 5 queries → 1 `$facet` | done |
| 3 | Redis cache for dashboard + write invalidation | done |
| 4 | Auth: cookie cache + drop redundant user lookup | done |
| 5 | Parallelize list count + page | done |
| 6 | Connection pool + response-time logging | done |

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
3. `resolveUserIdFromAuth` in `authenticate` → the *same* `UserModel.findOne`
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

**Deployment action (not code).** Put the Mongo cluster and the Vercel
functions in the same region. This is often the single largest remaining cost
and cannot be fixed from the repository.

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
