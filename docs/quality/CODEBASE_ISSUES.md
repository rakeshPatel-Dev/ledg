# Codebase Issues & Bugs

**Date:** August 2026
**Status:** Issues discovered during codebase audit — not yet documented in BUGS_AND_UPGRADES.md

---

## Critical — Fix Immediately

### 1. ~~Date/Timezone Bug: Server Clock vs User Calendar~~ ✅ FIXED
- **Files:** `server/src/domains/analytics/service.ts`, `server/src/domains/analytics/controller.ts`
- **Issue:** Analytics "today"/"month"/"year" boundaries were computed with the server's local clock (UTC on Vercel). Users in UTC+05:45 (Nepal) had early-morning transactions land in the wrong day/month bucket vs their calendar.
- **Fix:** All period boundaries are now computed against a fixed app timezone (`APP_TZ_OFFSET_MINUTES = 345`, Asia/Kathmandu — no DST) via `zonedParts()`/`zonedBoundary()` helpers. Custom ranges parse `YYYY-MM-DD` as zoned calendar dates. Dashboard `monthStart` uses the same zone. Note: transaction creation already stored local-midnight instants which round-trip correctly for display; the server-side boundary mismatch was the real bug.

### 2. ~~CSRF Protection Missing on Auth Endpoints~~ ✅ FIXED
- **File:** `server/src/app.ts`
- **Issue:** `csrfProtection` middleware was only applied to `/api/v1/*` routes; `/api/auth/*` (BetterAuth sign-in/sign-up/etc.) had no origin verification.
- **Fix:** Added `csrfProtection` to the `/api/auth/*` mount chain. Safe methods (GET OAuth callbacks, email-verification links) pass through; state-changing requests must carry a trusted Origin/Referer.

### 3. ~~Client-Side Filtering Doesn't Scale~~ ✅ FIXED
- **Files:** `client/src/pages/transactions.tsx`, `client/src/lib/api.ts`, `client/src/lib/queries.ts`, `server/src/domains/transactions/{repository,service,controller}.ts`
- **Issue:** Activity page fetched ALL transactions via `useAllData()` and filtered/sorted/paginated in memory.
- **Fix:** `GET /transactions/all` now accepts `type`, `spaceId`, `keyword` filters alongside pagination. Page is fully server-driven: debounced search (350ms), filter chips, and pagination hit the API. Added `useFilteredAllTransactions()` hook (with `keepPreviousData`) and `fetchAllFilteredTransactions()` for full-filter CSV export. `useAllData()` remains only for consumers that genuinely need the full dataset (analytics drilldown, settings export).

---

## High — Fix Soon

### 4. Race Condition in Username Generation — VERIFIED MITIGATED (no change)
- **File:** `server/src/domains/users/repository.ts`
- **Finding on re-review:** The non-atomic existence check can race, but every write path (`writeUniqueUsername`, `upsertUserFromAuth`) catches duplicate-key errors (code 11000) from the unique index and retries with a fresh candidate up to 5 attempts. Correctness is guaranteed by the index + retry; the pre-check is just an optimization.

### 5. BetterAuth Username Sync on Every Session Check — VERIFIED NON-ISSUE (no change)
- **File:** `server/src/auth.ts`
- **Finding on re-review:** The `customSession` plugin only hits the DB when the session user has no username (first login after signup). Once backfilled into the Better Auth user record, subsequent sessions skip all lookups.

### 6. Analytics "Custom" Period Previous Range Bug — VERIFIED FALSE POSITIVE
- **File:** `server/src/domains/analytics/service.ts`
- **Finding on re-review:** When only `dateFrom` is given, `dateRangeForPeriod` already defaults `to` to that day's end-of-day, so the duration used for the previous range is a full day, not zero. Behavior was correct; the rewrite for issue #1 preserves it (and made it timezone-correct).

### 7. ~~Missing Request Validation on Analytics Controller~~ ✅ FIXED
- **File:** `server/src/domains/analytics/controller.ts`
- **Fix:** Added `parseSpaceId()` — accepts `"all"` or a valid 24-hex ObjectId, otherwise throws 400 `BadRequestError` instead of a Mongoose CastError 500. Also hardened `idParamsSchema` in shared schemas with the same regex, and added an ObjectId guard in the transactions service `resolveSpace()`.

### 8. ~~No Specific Rate Limiting on Sensitive Endpoints~~ ✅ FIXED
- **Files:** `server/src/common/middlewares/rate-limit.ts` (new), `server/src/domains/users/routes.ts`
- **Fix:** Added `sensitiveActionLimiter` (10 req / 15 min) applied on top of the general API limiter to `PATCH /me/username`, `PATCH /me/email`, and `POST /me/password`.

---

## Medium — Plan to Fix

### 9. ~~Budget Percentage Calculation Edge Case~~ ✅ FIXED
- **File:** `client/src/pages/spaces.tsx`
- **Fix:** Budget bar now renders only when `monthlyBudget > 0` (zero budget is treated as "no budget", matching `space-detail.tsx` which already guarded this way).

### 10. ~~ApiError Doesn't Handle Non-JSON Responses~~ ✅ FIXED
- **File:** `client/src/lib/api.ts`
- **Fix:** `request()` checks the `content-type` header before parsing; non-JSON bodies (e.g. HTML 502 pages from Vercel) produce a clear `Request failed with {status} {statusText}` message instead of an unhelpful parse failure.

### 11. Duplicate Space Edit Logic — WON'T FIX (documented decision)
- Previously skipped in BUGS_AND_UPGRADES.md #23: submit handlers and state management differ enough between `spaces.tsx` and `space-detail.tsx` that extraction would add complexity without clear benefit.

### 12. ~~Client-Side Username Validation Duplication~~ ✅ FIXED
- **Files:** `client/src/shared/constants/index.ts` (new shared source), `client/src/hooks/use-username-check.ts`, `server/src/domains/users/{service,controller,repository,model}.ts`
- **Fix:** `USERNAME_REGEX` and `RESERVED_USERNAMES` are now defined once in the shared package (which syncs client → server). All five duplicated copies across client hook and four server files now import from `shared`. Instant client-side format/reserved feedback kept (good UX); server remains authoritative on submit.

### 13. ~~Potential Memory Leak in useAllData Pagination~~ ✅ FIXED
- **File:** `client/src/lib/queries.ts`
- **Fix:** The page-fetch loop now receives React Query's `AbortSignal` and throws `AbortError` when the query is cancelled/unmounted mid-loop instead of fetching all remaining pages into a dead cache entry.

### 14. ~~Missing Transaction ID Validation in Update/Delete~~ ✅ FIXED
- Fixed via `idParamsSchema` ObjectId regex hardening (see #7).

### 15. ~~No Pagination on Recurring Transactions Endpoint~~ ✅ FIXED
- **Files:** `server/src/domains/analytics/{repository,service,controller}.ts`
- **Fix:** Recurring aggregation now has a `$limit` stage. Accepts optional `limit` query param clamped to 1–50 (default 20), so responses are bounded regardless of pattern count.

### 16. Inconsistent Error Response Format — VERIFIED NON-ISSUE
- Re-audit: every error path (`errorHandler`, `notFoundHandler`, rate limiters, Zod handler) already returns `{ success: false, message, errors }`. Success paths consistently return `{ success: true, data }`. No change needed.

---

## Low — Nice to Have

### 17. ~~BetterAuth User ID Conversion Try/Catch Pattern~~ ✅ FIXED
- **Files:** `server/src/domains/users/repository.ts` (new `authUserFilter()` helper), `server/src/auth.ts`, `server/src/domains/users/service.ts`
- **Fix:** Centralized the dual-format `_id` filter construction into one exported helper using an ObjectId regex test; removed all four scattered try/catch blocks.

### 18. ~~Unused CURRENCIES Constant~~ ✅ FIXED
- **File:** `client/src/shared/constants/index.ts`
- **Fix:** Removed the unused `CURRENCIES` array. `Currency` type narrowed to `"NPR"` reflecting the intentional Nepal-only currency decision (BUGS_AND_UPGRADES.md #9).

### 19. ~~Health Check Endpoint Not Documented/Used~~ ✅ IMPROVED
- **File:** `server/src/app.ts`
- **Fix:** `/health` now reports `db.readyState` so probes/monitoring can distinguish API-up-but-DB-down states.

### 20. No Input Sanitization on Transaction Note — WON'T FIX (non-issue)
- Verified: no `dangerouslySetInnerHTML` anywhere in the client. React escapes all text output by default, so stored note content cannot execute.

### 21. Space Model Missing Index on monthlyBudget — WON'T FIX (non-issue)
- No query anywhere filters or sorts by `monthlyBudget`; an index would be pure overhead.

### 22. ~~Transaction Tags Not Used~~ ✅ REMOVED
- **Files:** shared schemas/types (client + synced server copy), `transactions/model.ts`, `analytics/repository.ts`, `transaction-form.tsx`, `lib/transaction-form.tsx`, `queries.ts`
- **Fix:** Dead field fully removed from schema, model, types, aggregation projections, and form payloads. Existing DB documents keep their stale `tags` key harmlessly (Mongoose strict mode ignores it).

### 23. ~~Savings Goal Field Never Used~~ ✅ REMOVED
- **Files:** `spaces/model.ts`, shared `Space` type (client + synced)
- **Fix:** Removed from model and types alongside the related cleanup.

### 24. ~~Space Budget Map Field Type Mismatch~~ ✅ RESOLVED BY REMOVAL
- The `budget` Map field was also completely unused (schemas never accepted it, UI never read it). Removed entirely rather than aligned (#23 cleanup).

### 25. No Test Framework Configured — ⏳ PENDING (infra task)
- Remains on the upgrade checklist; requires dependency installation and CI wiring beyond a bug-fix pass.

---

## Architecture/Design Concerns

### 26. Shared Module Sync is Fragile
- **File:** `scripts/sync-shared.js`
- **Issue:** One-way sync (client → server) via file copy. If server modifies shared types, changes are overwritten on next build. No versioning, no conflict detection.
- **Fix:** Create proper monorepo package (`packages/shared`) with `npm link` or workspace protocol.

### 27. BetterAuth + Custom User Model Dual-Write Complexity
- **Files:** `server/src/auth.ts:153-183`, `server/src/domains/users/repository.ts:88-145`
- **Issue:** Two user collections (BetterAuth's `user` + custom `UserModel`) kept in sync via database hooks and manual reconciliation. Complex, error-prone, dual-write problems.
- **Fix:** Consider using BetterAuth's `additionalFields` only, or migrate fully to custom user model with BetterAuth's `databaseHooks` for all mutations.

### 28. No API Versioning Strategy
- **File:** `server/src/app.ts:150`
- **Issue:** All routes under `/api/v1` but no versioning policy (deprecation, sunset headers, breaking change process).
- **Fix:** Document versioning strategy; add `sunset` and `deprecation` headers for future versions.

### 29. No Structured Logging Correlation IDs
- **File:** `server/src/app.ts:58-75`
- **Issue:** `pinoHttp` logs request ID but no correlation ID passed to downstream services or included in error responses for debugging.
- **Fix:** Add `x-request-id` header propagation; include request ID in error responses.

### 30. Vercel Serverless Cold Start: DB Connection Reuse
- **File:** `server/src/database/index.ts:5-21`
- **Issue:** `cached` promise pattern works for Lambda reuse but `mongoose.connection.readyState` check may return stale state if connection dropped. No active ping/health check.
- **Fix:** Add `mongoose.connection.db?.admin().ping()` check before returning cached connection.

---

## Summary Table

| # | Severity | File/Location | Type | Status |
|---|----------|---------------|------|--------|
| 1 | Critical | server: analytics/service.ts | Timezone Bug | ✅ Fixed |
| 2 | Critical | server: app.ts | Missing CSRF on Auth | ✅ Fixed |
| 3 | Critical | client + server: transactions/all | Scalability | ✅ Fixed |
| 4 | High | server: users/repository.ts | Race Condition | ✔️ Verified mitigated (index + retry) |
| 5 | High | server: auth.ts | Performance | ✔️ Verified non-issue (only fires when username missing) |
| 6 | High | server: analytics/service.ts | Logic Bug | ✔️ Verified false positive |
| 7 | High | server: analytics/controller.ts | Missing Validation | ✅ Fixed |
| 8 | High | server: users/routes.ts | Rate Limiting | ✅ Fixed |
| 9 | Medium | client: spaces.tsx | Edge Case | ✅ Fixed |
| 10 | Medium | client: api.ts | Error Handling | ✅ Fixed |
| 11 | Medium | client: spaces.tsx, space-detail.tsx | Code Duplication | 🚫 Won't fix (documented) |
| 12 | Medium | client + server: username validation | Duplicated Validation | ✅ Fixed (shared constants) |
| 13 | Medium | client: queries.ts | Memory Leak Risk | ✅ Fixed (AbortSignal) |
| 14 | Medium | server: transactions/validator.ts | Missing Validation | ✅ Fixed via idParamsSchema regex (#7) |
| 15 | Medium | server: analytics/repository.ts | Pagination | ✅ Fixed ($limit + clamp) |
| 16 | Medium | various controllers | Inconsistent Errors | ✔️ Verified non-issue |
| 17 | Low | multiple files | Code Pattern | ✅ Fixed (authUserFilter helper) |
| 18 | Low | client: constants/index.ts | Dead Code | ✅ Fixed |
| 19 | Low | server: app.ts /health | Observability | ✅ Improved |
| 20 | Low | server: schemas/index.ts | Security | 🚫 Won't fix (React escapes; no raw HTML) |
| 21 | Low | server: spaces/model.ts | Missing Index | 🚫 Won't fix (no budget queries exist) |
| 22 | Low | transactions tags | Unused Field | ✅ Removed |
| 23 | Low | spaces savingsGoal | Unused Field | ✅ Removed |
| 24 | Low | spaces budget Map vs Record | Type Mismatch | ✅ Resolved by removal |
| 25 | Low | package.json files | Testing | ⏳ Pending (infra task) |
| 26 | Arch | scripts/sync-shared.js | Architecture | ⏳ Open |
| 27 | Arch | auth.ts + repository.ts | Dual-Write | ⏳ Open |
| 28 | Arch | app.ts | API Versioning | ⏳ Open |
| 29 | Arch | app.ts | Observability | ⏳ Open |
| 30 | Arch | database/index.ts | Serverless Reliability | ⏳ Open |