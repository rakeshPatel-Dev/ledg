# Bugs & Upgrades

**Date:** August 2026

---

## Critical — Fix Immediately

### 1. ~~Regex Injection in Search Keyword~~ ✅ FIXED
- **File:** `server/src/domains/transactions/repository.ts`
- **Issue:** User-supplied search keyword is passed directly into `new RegExp(keyword, "i")` — an attacker can inject ReDoS patterns (e.g., `(a+)+$`) to freeze the server
- **Fix:** Escape regex special characters before passing to RegExp, or use `$regex` with `$options` in Mongoose (which also needs escaping)

### 2. Shared Module Fully Duplicated Between Client and Server
- **Files:** `client/src/shared/` and `server/src/shared/`
- **Issue:** The entire shared directory (enums, schemas, types, constants, utils) is copy-pasted. Any change to one side breaks the API contract silently
- **Fix:** ~~Create a proper `shared/` package in the monorepo root.~~ **DONE:** `scripts/sync-shared.js` auto-copies `client/src/shared/` → `server/src/shared/` on every `build:server`, `dev:server`, and `typecheck:server` run. Client is the source of truth.

### 3. ~~N+1 Query in `useAllData()`~~ ✅ FIXED
- **File:** `client/src/lib/queries.ts`
- **Issue:** `useAllData()` fetches all spaces, then fires a separate `getTransactions(spaceId)` for each space. 10 spaces = 11 API calls
- **Fix:** Added `GET /api/v1/transactions/all` backend endpoint that returns all transactions across all user spaces in one query with pagination. Client `useAllData()` now uses single endpoint.

### 4. ~~Transaction Cascade Delete Without Ownership Verification~~ ✅ FIXED
- **File:** `server/src/domains/transactions/service.ts`
- **Issue:** `deleteTransaction` calls `deleteTransactionsBySpace(spaceId)` — but the space ownership check may not run before the cascade delete in some code paths
- **Fix:** Verify space ownership first, then delete transaction, then recompute space balance — always in a transaction/batch

---

## High — Fix Soon

### 5. ~~No Error Boundary in React App~~ ✅ FIXED
- **File:** `client/src/app/App.tsx`
- **Issue:** No `<ErrorBoundary>` wrapping the app tree. Any unhandled component error shows a blank white screen
- **Fix:** Added `ErrorBoundary` component at app root with user-friendly error UI and reload button

### 6. ~~No CSRF Protection on State-Changing Endpoints~~ ✅ FIXED
- **File:** `server/src/app.ts`
- **Issue:** No CSRF token middleware. While BetterAuth handles sessions, state-changing POST/PUT/DELETE endpoints accept requests with only a session cookie
- **Fix:** Added Origin/Referer header verification middleware (`server/src/common/middlewares/csrf.ts`). Checks that state-changing requests originate from trusted origins.

### 7. ~~Missing `express.json()` Body Size Limit~~ ✅ FIXED
- **File:** `server/src/app.ts`
- **Issue:** `express.json()` has no `limit` option — defaults to 100KB but should be explicit. Large payloads could cause memory issues
- **Fix:** Added `{ limit: "1mb" }` to `express.json()`

### 8. ~~No Password Change Endpoint~~ ✅ FIXED
- **File:** `server/src/domains/users/routes.ts`
- **Issue:** Users can change email but not password. No `POST /me/password` endpoint exists
- **Fix:** Added `POST /api/v1/me/password` endpoint with current/new password validation, password hashing via `better-auth/crypto`, and session invalidation. Frontend settings page updated with Change Password UI.

### 9. Hardcoded Currency (NPR)
- **Files:** `client/src/shared/constants/index.ts`, `client/src/lib/format.ts`
- **Issue:** Currency is hardcoded to NPR everywhere. The `CURRENCIES` array exists but is never used
- **Fix:** ~~Add currency to user settings~~ **KEPT AS-IS:** Users are from Nepal only. Currency selection removed from settings page. `CURRENCIES` constant marked as unused/dead code.

### 10. ~~No ESLint or Prettier Configuration~~ ✅ FIXED
- **Files:** Root, `client/`, `server/`
- **Issue:** No linting or formatting tools configured. Code style is manually maintained and inconsistent
- **Fix:** Added ESLint 9 flat config for both client (React + TypeScript) and server (TypeScript). Added Prettier with `.prettierrc`. Added `lint`, `format`, and `format:check` scripts to root package.json.

---

## Medium — Plan to Fix

### 11. Theme System Doesn't Listen for OS Changes
- **File:** `client/src/lib/theme-provider.tsx`
- **Issue:** When theme is "system", the provider reads the OS preference once on mount but never updates if the user toggles dark mode in OS settings
- **Fix:** Add `window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ...)` listener

### 12. `useTheme` Guard Never Triggers
- **File:** `client/src/lib/theme-provider.tsx`
- **Issue:** `useTheme` checks `if (!context)` but the context is initialized with `initialState` (not null), so the error throw never happens
- **Fix:** Initialize context as `null` and check for `null` instead, or remove the dead guard

### 13. Missing Database Indexes
- **Files:** `server/src/domains/users/model.ts`, `server/src/domains/spaces/model.ts`
- **Issues:**
  - `User.email` has no index — `changeEmail` does a full collection scan
  - `Space(ownerId, type)` compound index missing — `ensureDefaultSpace` queries both fields
  - `Transaction(type, date)` compound index missing — analytics aggregation matches on type without space filter
- **Fix:** Add the missing indexes

### 14. Missing Input Length Validation on Email
- **File:** `server/src/domains/users/service.ts`
- **Issue:** `email.trim().toLowerCase()` is the only sanitization. No check for excessively long strings
- **Fix:** Add `.max(255)` or appropriate limit to the Zod email schema

### 15. `RESEND_FROM_EMAIL!` Non-Null Assertion
- **File:** `server/src/lib/email.ts`
- **Issue:** `process.env.RESEND_FROM_EMAIL!` will pass `undefined` to Resend API if the env var is missing, causing a runtime crash
- **Fix:** Validate the env var exists at startup (add to `validateEnv()`) and remove the `!` assertion

### 16. Missing `select` on Space Queries
- **File:** `server/src/domains/spaces/repository.ts`
- **Issue:** `findSpacesByOwner` fetches all fields including `budget` and `savingsGoal` (unused). Adds overhead to every space query
- **Fix:** `.select('-budget -savingsGoal')` or only select needed fields

### 17. Optimistic Update Race on Rapid Create/Delete
- **File:** `client/src/lib/queries.ts`
- **Issue:** If two creates happen rapidly, optimistic temp IDs could be replaced out of order
- **Fix:** Use `queryClient.cancelQueries()` before each mutation, or use a queue-based approach

### 18. Vercel Server Config Missing API Rewrites
- **File:** `server/vercel.json`
- **Issue:** No `routes` or `rewrites` defined. Express API deployed to Vercel will return 404 for all API requests
- **Fix:** Add `{ "routes": [{ "src": "/(.*)", "dest": "/server.js" }] }` or equivalent

### 19. Vercel Install Command Forces Global npm
- **Files:** `client/vercel.json`, `server/vercel.json`
- **Issue:** `"installCommand": "npm install -g npm@10 && npm ci"` — fragile, could break with Node version changes on Vercel
- **Fix:** Remove the global npm install. Use Vercel's built-in Node version settings instead

### 20. `.env.local` Files May Not Be Gitignored Properly
- **Files:** `server/.env.local`, `client/.env.local`
- **Issue:** Root `.gitignore` lists `.env.local` but these files exist and are readable. Verify actual git tracking status
- **Fix:** Run `git rm --cached` if tracked, add to `.gitignore` at each package level

---

## Low — Nice to Have Fixes

### 21. Dead Code Cleanup
- `todayKey()` in `client/src/lib/format.ts` — exported but never imported
- `CURRENCIES` array in shared/constants — defined but never used
- `DEFAULT_SPACE_TYPE` in shared/constants — exported but never imported
- `createUserSchema` in shared/schemas — defined but never used (user creation is handled by BetterAuth)
- `pluralize()` in shared/utils — exported but never imported in client
- `formatCurrency()` in server shared/utils — defined but never used server-side
- `APP_NAME` duplicated in both client and server shared/index.ts
- **Fix:** Remove all dead code

### 22. GoogleIcon Component Duplicated
- **Files:** `client/src/pages/sign-in.tsx`, `client/src/pages/sign-up.tsx`
- **Issue:** Identical `GoogleIcon` SVG component defined in both files
- **Fix:** Extract to `client/src/components/common/google-icon.tsx`

### 23. Space Edit Logic Duplicated
- **Files:** `client/src/pages/spaces.tsx`, `client/src/pages/space-detail.tsx`
- **Issue:** Nearly identical space create/edit/submit logic in both files
- **Fix:** Extract shared logic into a custom hook `useSpaceForm()`

### 24. ~~Mixed Locale Codes~~ ✅ FIXED
- **Files:** `client/src/lib/format.ts`, `client/src/components/transactions/transaction-item.tsx`, `client/src/components/analytics/category-drilldown-sheet.tsx`
- **Issue:** Inconsistent date formatting (Nepal vs India locale)
- **Fix:** Standardized to `en-NP` across all files

### 25. Inconsistent Filename Casing
- **Issue:** `AppLogo.tsx` (PascalCase) vs `bottom-nav.tsx`, `app-shell.tsx` (kebab-case)
- **Fix:** Standardize to kebab-case for all component files

### 26. Missing `verbatimModuleSyntax` on Client
- **File:** `client/tsconfig.app.json`
- **Issue:** Server enforces `import type` for type-only imports, client does not — mixed `import` and `import type` usage
- **Fix:** Add `"verbatimModuleSyntax": true` to client tsconfig

### 27. `Error.captureStackTrace` V8-Specific Guard Missing
- **File:** `server/src/common/errors/index.ts`
- **Issue:** `Error.captureStackTrace` is V8-specific and will throw in non-V8 runtimes
- **Fix:** Guard with `if (Error.captureStackTrace)`

### 28. Missing `outputDirectory` in Server Vercel Config
- **File:** `server/vercel.json`
- **Issue:** Missing `"outputDirectory": "dist"` — Vercel may not detect the build output correctly
- **Fix:** Add the field

### 29. No Unified Build/Start/Test Script in Root
- **File:** `package.json`
- **Issue:** Only has individual `dev:*`, `build:*`, `typecheck:*` scripts. No unified `build`, `start`, or `test`
- **Fix:** Add combined scripts or adopt a monorepo tool (Turborepo, Nx)

### 30. `shadcn` CLI in Runtime Dependencies
- **File:** `client/package.json`
- **Issue:** `"shadcn": "^4.16.1"` is in `dependencies` instead of `devDependencies`
- **Fix:** Move to `devDependencies`

### 31. `@formspree/react` v3 Outdated
- **File:** `client/package.json`
- **Issue:** Using Formspree SDK v3 (legacy). Current version is v4.x
- **Fix:** Upgrade to `@formspree/react@^4.x` and update API usage

### 32. `Error.captureStackTrace` V8-Only
- **File:** `server/src/common/errors/index.ts`
- **Issue:** `Error.captureStackTrace(this, this.constructor)` is V8-specific
- **Fix:** Wrap in `if (typeof Error.captureStackTrace === "function")`

### 33. Missing Transaction Cascade Ownership Check
- **File:** `server/src/domains/spaces/service.ts`
- **Issue:** `deleteSpace` calls `deleteTransactionsBySpace` before verifying ownership in some code paths
- **Fix:** Always verify ownership before any destructive operation

---

## Upgrade Checklist

| Upgrade | Current | Target | Priority |
|---------|---------|--------|----------|
| `@formspree/react` | v3 | v4 | Medium |
| ESLint + Prettier | None | Configured | High |
| Shared module extraction | Copy-paste | Monorepo package | Critical |
| Test framework | None | Vitest | Critical |
| Error boundary | None | React ErrorBoundary | High |
| Database indexes | Partial | Complete | Medium |
| Vercel config | Broken rewrites | Working API routes | High |
| Body size limit | Unset | 1MB | Medium |
| Currency config | Hardcoded NPR | User-selectable | High |
| Password change | Missing | Implemented | High |
