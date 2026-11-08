# Remaining Features Plan

**Status:** Living document
**Last reviewed:** 2026-11-01
**Scope:** Features and platform work still missing from the Ledg app.
**Out of scope:** the database engine. `phases.md` records why we are staying on MongoDB.

This file is the single source of truth for "what is left". The older product docs
(`docs/product/PROPOSED_FEATURES.md`, `docs/product/PRD.md` §14, `docs/product/ANALYTICS_ROADMAP.md`)
were written in August 2026 and are now partly stale — several items they list as missing have shipped.
Where they disagree with this file, trust this file and the code.

---

## How this list was derived

Checked against the current tree, not just the docs:

- `server/src/domains/*` — actual models, routes, services
- `server/src/routes.ts` — mounted API surface
- `client/src/pages/*` and `client/src/components/*` — what the UI exposes
- `client/src/lib/{api,queries,export,categories}.ts` — client capabilities
- `server/vercel.json` — deployment config (no cron entries)
- `docs/plans/PUSH_NOTIFICATIONS_PLAN.md` — fully specified, entirely unbuilt
- `docs/quality/{BUGS_AND_UPGRADES,CODEBASE_ISSUES}.md` — remaining debt items

---

## 1. What already ships

Keep this list in mind so nothing below is built twice.

| Area               | Shipped                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transactions**   | Create, edit, delete, move between spaces, type/space/keyword filters, pagination, server-side search (debounced), CSV + JSON export, CSV + JSON import with duplicate skipping |
| **Spaces**         | Personal/shared, owner/member roles, invites by email or `@username`, token invite landing, resend/cancel, transfer ownership, remove member, leave space, 10-member cap        |
| **Dues**           | Lent/borrowed, partial settlements, undo settlement, overdue tracking, ledger-linked transactions, group-by-person and flat views                                               |
| **Dashboard**      | Balance, month income/spend, expense + income categories, payment-method breakdown, recent transactions, dues summary                                                           |
| **Analytics**      | Period selector (today / month / 3M / year / all / custom), month-over-month deltas, insights, category drill-down, recurring detection                                         |
| **Budget**         | Space-level monthly budget, spent-vs-budget bar on the spaces list and space detail                                                                                             |
| **Notifications**  | In-app center, unread badge, preferences (`realtime` / `off`), invite + member events, spam suppression                                                                         |
| **Auth & account** | Email/password, Google, email verification, password change, username system, profile, account deletion                                                                         |
| **Performance**    | `$facet` dashboard/analytics, Redis dashboard cache with invalidation, auth cookie cache, Mongo pool tuning                                                                     |
| **Dev**            | `npm run seed` demo data across every feature                                                                                                                                   |

---

## 2. Remaining work at a glance

Priority: **P0** = users are misled or a documented behaviour does not work · **P1** = PRD MVP goals still missing ·
**P2** = depth/insight · **P3** = retention · **P4** = collaboration · **P5** = platform/quality.

| ID   | Feature                                               | Priority | Effort | Depends on     |
| ---- | ----------------------------------------------------- | -------- | ------ | -------------- |
| P0.1 | Scheduled job runner                                  | P0       | 2–3 d  | —              |
| P0.2 | Make `daily_digest` real                              | P0       | 2 d    | P0.1           |
| P0.3 | Due-date reminders                                    | P0       | 2 d    | P0.1           |
| P0.4 | Test framework + CI                                   | P0       | 3–5 d  | —              |
| P1.1 | Accounts module                                       | P1       | 4–6 d  | data migration |
| P1.2 | Custom categories per space                           | P1       | 4–5 d  | data migration |
| P1.3 | PWA: service worker, offline shell, install prompt    | P1       | 2–3 d  | —              |
| P1.4 | Global search + command palette                       | P1       | 2–3 d  | —              |
| P1.5 | Analytics payment-method + top-merchant breakdown     | P1       | 2 d    | —              |
| P2.1 | Spending trend chart                                  | P2       | 3–4 d  | chart layer    |
| P2.2 | Income vs expense (6 months) + net trend              | P2       | 2–3 d  | chart layer    |
| P2.3 | Savings goals                                         | P2       | 3–4 d  | —              |
| P2.4 | Budget v2: per-category, alerts, dashboard card       | P2       | 4–5 d  | P0.1 (alerts)  |
| P2.5 | Anomaly detection                                     | P2       | 3–4 d  | —              |
| P2.6 | Cash-flow forecast / calendar                         | P2       | 3–5 d  | chart layer    |
| P3.1 | Quick-add templates                                   | P3       | 2 d    | —              |
| P3.2 | Daily logging streak                                  | P3       | 1–2 d  | —              |
| P3.3 | Monthly email summary                                 | P3       | 3–4 d  | P0.1           |
| P3.4 | Recurring v2: confirm/dismiss, next date, auto-create | P3       | 3–4 d  | P0.1           |
| P4.1 | Expense splitting + settle-up                         | P4       | 6–8 d  | new spec       |
| P4.2 | Link a due to a Ledg user                             | P4       | 2–3 d  | —              |
| P4.3 | Per-member spending breakdown                         | P4       | 2 d    | —              |
| P4.4 | Admin/Viewer roles                                    | P4       | 4–5 d  | new spec       |
| P5.1 | Proper shared package                                 | P5       | 1–2 d  | —              |
| P5.2 | API versioning policy                                 | P5       | 1 d    | —              |
| P5.3 | Request correlation IDs                               | P5       | 1 d    | —              |
| P5.4 | DB connection health ping                             | P5       | 0.5 d  | —              |
| P5.5 | Error tracking / observability                        | P5       | 1–2 d  | —              |
| P5.6 | Accessibility audit                                   | P5       | 2–3 d  | —              |

---

## 3. P0 — Fix what is already promised

These are not new ideas. Each one is either visible in the UI or documented as
working, but does not actually work today.

### P0.1 Scheduled job runner

**Why this is first.** Four separate features are blocked on the same missing
piece: daily digest, due-date reminders, monthly email summary, and recurring
auto-create. There is no cron, queue, or worker anywhere in the repo
(`server/vercel.json` has no `crons` entry; the only "scheduler" is an in-process
`setInterval` for spam-window pruning).

**Build**

- Add `crons` to `server/vercel.json` (or a single `/api/v1/jobs/run` endpoint
  protected by a shared secret) that Vercel calls on a schedule.
- A job registry: `{ name, cadence, run() }` so adding a job is one file.
- Idempotency: a per-job, per-period key in Redis (`job:<name>:<YYYY-MM-DD>`)
  with `SET NX EX`, so a retried invocation does not double-send.
- Batch by user with a cursor; do not load every user into memory.
- Reuse the existing Asia/Kathmandu boundary helpers (`zonedParts`/`zonedBoundary`)
  so "yesterday" and "this month" match what the UI shows.
- Structured logs per job run: processed, sent, skipped, failed.

**Done when** a job can be added without touching deployment config, and a
double invocation in the same period sends nothing twice.

---

### P0.2 Make `daily_digest` real

**Current state.** `client/src/pages/settings.tsx` offers "Daily Digest" for
transaction activity, and the enum exists in `shared/enums`. But
`server/src/domains/notifications/service.ts` does:

```ts
if (prefs.transactionActivity !== "realtime") return null;
```

So choosing "Daily Digest" silently drops the notification forever. That is the
worst of both worlds: the user thinks they opted in.

**Build**

- Store notifications for digest users instead of dropping them (either keep
  `read: false` rows or a separate queue).
- A daily job (P0.1) groups them per user and sends one summary: count, total
  spent, top category, top space.
- Deliver in-app first; email is P3.3.
- Mark the grouped rows as digested so they are not counted twice.

**Done when** a user on `daily_digest` gets exactly one summary per day and zero
individual realtime notifications.

**Interim option:** if P0.1 slips, hide the "Daily Digest" option so the UI stops
promising something the backend cannot do. Do not ship the silent drop.

---

### P0.3 Due-date reminders

**Current state.** `docs/plans/DUES_FEATURE_PLAN.md` lists this under future work
and notes it is blocked on a scheduler. `dueDate` is already indexed; no model
change is needed.

**Build**

- Daily job: find open/partially-settled dues where `dueDate` is today or overdue.
- Notify the owner (`due_reminder` notification type + template).
- De-duplicate per due per day (P0.1 idempotency key).
- Respect the existing notification preference toggles.

**Done when** a due dated tomorrow produces one reminder tomorrow, not one per
page load and not one per cron retry.

---

### P0.4 Test framework + CI

**Current state.** No test runner, no test files, no CI workflow. Every change so
far has been verified by hand. That is fine for six features; it is not fine for
the next twenty, especially money math.

**Build**

- Vitest at the repo root, one config, workspace projects for `client` and `server`.
- Priority coverage, in this order:
  1. `analytics/service.ts` — `$facet` output vs a hand-computed reference
     (already done manually; make it a test).
  2. Dues settlement math — partial → partially_settled → settled, undo.
  3. Date/period boundaries — the UTC+05:45 cases that caused the earlier bug.
  4. Cache invalidation — a write drops `dash:v1:<userId>`.
  5. Auth `customSession` fallback path.
- GitHub Actions: `typecheck`, `lint`, `test` on PR.
- `mongodb-memory-server` for repository/aggregation tests, or a `ledg_test` DB
  on the local instance.

**Done when** a PR that breaks a dashboard total or a settlement fails CI.

---

## 4. P1 — MVP completeness

Four of these are PRD MVP goals still absent from the app (`docs/product/PRD.md`
§4): accounts, custom categories, PWA, and search. P1.5 closes a smaller
inconsistency between the dashboard and the analytics page.

### P1.1 Accounts module

**Current state.** `docs/architecture/API_DESIGN.md` §Accounts specifies
`GET/POST/PUT/DELETE /accounts`. Nothing exists. Transactions carry only a
`paymentMethod` enum (`cash | card | bank_transfer | wallet`), so there are no
real balances per account.

**Build**

- `Account` model: `userId`, `spaceId?`, `name`, `type`, `openingBalance`,
  `color`, `archived`, timestamps. Index `{ userId: 1, archived: 1 }`.
- Derived balance = `openingBalance + income − expense` over linked transactions.
  Do not store a mutable balance; it drifts.
- `accountId` on transactions (nullable, so old rows still work).
- CRUD routes + client API + a Settings or Spaces sub-page.
- Transaction form: account picker, defaulting to the last used account.
- Keep `paymentMethod` for reporting, or migrate it into `Account.type` — decide
  explicitly (see §12).

**Done when** a user can create "Nabil Bank" and "Cash", assign transactions, and
see a correct per-account balance that matches the ledger.

**Risk.** This is the first schema change that touches existing transactions.
Write a backfill script and make `accountId` optional before making it required.

---

### P1.2 Custom categories per space

**Current state.** Categories are a hardcoded client array in
`client/src/lib/categories.ts` (`EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`).
The server stores a free-text `category` string and never validates it.
`API_DESIGN.md` §Categories is unimplemented.

**Build**

- `Category` model: `spaceId` (or `userId` for personal defaults), `name`, `type`,
  `icon`, `color`, `order`, `isDefault`.
- Seed the current hardcoded lists on space creation so nothing changes visually.
- CRUD routes + a management sheet reachable from the transaction form and space
  settings.
- Validate `category` against the space's categories on write, with a fallback for
  legacy strings.
- Keep the icon/color map client-side but key it by category id/name from the API.

**Done when** a user can add "Pet Care" with a paw icon and it appears in the form,
analytics breakdown, and drill-down.

**Risk.** Existing transactions reference category names. Do not rename defaults;
add new ones and leave old strings resolvable.

---

### P1.3 PWA: service worker, offline shell, install prompt

**Current state.** `client/src/public/site.webmanifest` and the icon set exist.
`index.html` links the manifest. There is no `sw.js`, no caching strategy, and no
install prompt. `docs/product/PRD.md` lists PWA as an MVP goal.

**Build**

- `client/src/public/sw.js`: precache the app shell, stale-while-revalidate for
  static assets, network-first for `/api/*` with an offline fallback page.
- Register the worker in `client/src/main.tsx` (production only, to keep HMR sane).
- `beforeinstallprompt` handling with a dismissible "Add to Home Screen" card.
- Offline banner when `navigator.onLine` is false; reads from the React Query
  cache so the last dashboard stays visible.
- Do **not** attempt offline writes yet — that is P5/exploratory, and it needs a
  conflict strategy.

**Done when** Lighthouse reports an installable PWA, and a cold reload offline
shows the shell plus the last cached dashboard instead of a browser error.

---

### P1.4 Global search + command palette

**Current state.** Per-page server search works (`GET /transactions/all` with
`keyword`, debounced 350ms, plus type/space filters). Spaces search is client-side.
There is no cross-entity search and no keyboard palette.

**Build**

- `GET /search?q=` returning grouped results: transactions, spaces, dues, members.
  Reuse the escaped-regex helper already in `transactions/repository.ts` — do not
  reintroduce ReDoS.
- `Cmd/Ctrl+K` palette component: recent + results, keyboard navigation, `Esc`.
- Result actions navigate to the right page with filters pre-applied.
- Debounce and cap each group (e.g. 5) with a "see all" link.

**Done when** typing a note, a person, or a space name from any page finds it in
under 300ms locally.

---

### P1.5 Analytics payment-method + top-merchant breakdown

**Current state.** The dashboard computes `byPaymentMethod`
(`analytics/repository.ts` `paymentMethods` facet), but the analytics page never
shows it. There is no merchant/frequency grouping at all.

**Build**

- Extend `getAnalyticsSummaryData` with a payment-method facet for the selected
  period (one more `$facet` bucket — no extra round trip).
- Add a "Payment methods" card to `/analytics`.
- Add a "Most frequent" card: group by `note` (the closest thing to a merchant),
  show count + total + average.
- Clicking either opens the existing drill-down sheet with a matching filter.

**Done when** the analytics page shows both breakdowns for every period, and the
numbers reconcile with the dashboard for the "month" period.

---

## 5. P2 — Analytics and planning depth

### P2.1 Spending trend chart

No chart library is installed (`recharts` is absent despite the roadmap naming it).
Decide: add `recharts`, or hand-roll SVG to keep the bundle small. Given the
existing custom `SavingsRing`, hand-rolled SVG is viable and consistent.

- Daily buckets for month/today, monthly buckets for 3M/year/all.
- Income vs expense lines, hover tooltip, accessible fallback table.
- Server-side bucketing in the existing `$facet` pipeline (add a `trend` bucket),
  not client-side over all transactions.

### P2.2 Income vs expense comparison

- Grouped bars for the last 6 months, net line.
- One aggregation with a `$group` by month key; reuse the timezone helpers.
- Highlight the current month and show net savings/deficit.

### P2.3 Savings goals

**Current state.** `savingsGoal` was deliberately removed from the Space model
(`CODEBASE_ISSUES.md` #23). The analytics page has a savings _rate_ ring, not a
goal. This is a new model, not a resurrection of the dead field.

- `Goal` model: `userId`, `spaceId?`, `name`, `targetAmount`, `targetDate`,
  `contribution?`, `status`.
- Progress = contributions, or net savings since `createdAt` (pick one and document).
- "On track / behind" based on remaining amount vs remaining days.
- Card on dashboard + `/analytics`.

### P2.4 Budget v2

**Current state.** Space-level `monthlyBudget` works and renders a spent/budget bar
on the spaces list and space detail. Missing: per-category budgets, alerts, and a
dashboard presence.

- `CategoryBudget` model (`spaceId`, `category`, `amount`, `month`).
- Per-category progress bars in space detail, amber at 75%, destructive over 100%.
- Alert at 75% and 100% via the notification service (needs P0.1 for scheduled
  checks, or evaluate on write).
- Optional dashboard card: total budget across spaces.

### P2.5 Anomaly detection

- Per-category mean + standard deviation over a trailing window.
- Flag transactions beyond 2σ or 2× the category average.
- Surface as an insight with "Expected" / "Investigate" actions.
- Store dismissals so the same alert does not repeat.

### P2.6 Cash-flow forecast / calendar

- Month calendar with per-day net, income green / expense red.
- Project month-end from the current run rate, with a confidence note.
- Keep it read-only; no forecasting promises beyond "at this pace".

---

## 6. P3 — Retention and automation

### P3.1 Quick-add templates

- `Template` model: `userId`, `spaceId`, `label`, `type`, `category`, `amount`,
  `note`, `paymentMethod`, `useCount`.
- "Save as template" in the transaction form; one-tap chips on the dashboard.
- Sort by `useCount`.

### P3.2 Daily logging streak

- Compute from transaction dates (no new collection needed for the basic version).
- Fire icon + day count on the dashboard; milestones at 7/30/100.
- Must use Asia/Kathmandu dates, not UTC.

### P3.3 Monthly email summary

- Resend is already wired (`server/src/lib/email.ts`) for verification and invites.
- Monthly job: income, expense, savings rate, top category, biggest change.
- Respect an email opt-out in notification preferences.
- Needs P0.1; batch and rate-limit.

### P3.4 Recurring v2

**Current state.** Detection exists (`/analytics/recurring`) and
`RecurringCard` renders patterns. There is no confirm/dismiss, no next expected
date, and no auto-create.

- Store confirmations/dismissals per user so the card stops re-suggesting.
- Show "next expected" from the detected cadence.
- Auto-create opt-in per pattern, idempotent per period (P0.1).
- Notify before auto-creating, with an undo window.

---

## 7. P4 — Collaboration

### P4.1 Expense splitting + settle-up

**Current state.** Shared spaces share one ledger; there is no notion of "this
₹3,000 dinner was split 4 ways". The PRD mentions roommates splitting rent, but no
build plan or schema exists.

**Needs a spec before code.** Suggested model: a `split` sub-document on a
transaction with `participants[{ userId, share }]`, plus a derived per-member
balance and a "settle up" flow that creates a repayment transaction.

This is the largest remaining product bet. Do not start it without deciding
equal vs exact vs percentage splits, and whether non-Ledg participants are allowed.

### P4.2 Link a due to a Ledg user

- `linkedUserId` already exists on the dues model and schema but is not exposed in
  the UI. Surface it: search by `@username`, then show the linked user's avatar.
- Once linked, the counterparty can see the due from their side (new read path).
- This is the smaller, safer half of P4.1 and can ship first.

### P4.3 Per-member spending breakdown

- In a shared space, aggregate spend by `createdBy.userId`.
- Show a member breakdown in space detail; helps answer "who is spending what".
- Requires one extra `$facet` bucket, scoped to the space.

### P4.4 Admin/Viewer roles

- The shipped design is deliberately `owner | member` (see
  `SHARED_SPACES_AND_MEMBERS_PLAN.md` decisions). The PRD originally proposed
  Admin/Viewer.
- Only build this if a real user asks. It touches every authorization check
  (`assertSpaceAccess`) and the invitation schema. Needs a spec, not just code.

---

## 8. P5 — Platform and quality

| Item                     | Current state                                                                     | Work                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **P5.1 Shared package**  | `scripts/sync-shared.js` copies `client/src/shared` → `server/src/shared` one-way | Move to `packages/shared` with npm workspaces; delete the copy step                  |
| **P5.2 API versioning**  | Everything under `/api/v1`, no policy                                             | Document deprecation/sunset rules; add `Sunset`/`Deprecation` headers when v2 starts |
| **P5.3 Correlation IDs** | pino logs a request id, but it is not propagated or returned                      | Add `x-request-id` in/out, include it in error responses                             |
| **P5.4 DB health ping**  | `cached` promise reused without a liveness check                                  | `admin().ping()` before returning a cached connection; drop and reconnect on failure |
| **P5.5 Observability**   | pino only; no error aggregation                                                   | Add Sentry (or equivalent) for server + client, with release tagging                 |
| **P5.6 Accessibility**   | No audit                                                                          | Keyboard traps, focus rings, chart alternatives, contrast, sheet focus management    |

Also worth scheduling once P1 lands: **export rate limiting** and **server-side
export** for very large ranges (today the client fetches every filtered row to
build the CSV).

---

## 9. Recommended sequence

| Milestone                         | Contents                                                                         | Why this order                                                     |
| --------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **M1 — Trust** (1–2 weeks)        | P0.1 scheduler, P0.2 digest, P0.3 reminders, P0.4 tests/CI                       | Stops the UI lying, and puts a safety net under every later change |
| **M2 — MVP complete** (3–4 weeks) | P1.1 accounts, P1.2 categories, P1.3 PWA, P1.4 palette, P1.5 analytics breakdown | Closes the remaining PRD MVP goals                                 |
| **M3 — Insight** (2–3 weeks)      | P2.1–P2.4 trend, comparison, goals, budget v2                                    | Makes the analytics page worth opening weekly                      |
| **M4 — Habit** (2 weeks)          | P3.1–P3.4 templates, streak, email summary, recurring v2                         | Drives return visits                                               |
| **M5 — Together** (2–3 weeks)     | P4.1–P4.3 splitting, due linking, member breakdown                               | The biggest new surface; needs a spec first                        |
| **Continuous**                    | P5 items as capacity allows                                                      | Keeps the platform from rotting                                    |

Ship in this order only if nothing is on fire. If a specific user request lands,
take it out of sequence but keep P0.1 and P0.4 first — everything else is cheaper
once jobs and tests exist.

---

## 10. Requirements for every item

Apply these to each feature above. They are not optional.

- **Seed data.** Extend `server/src/scripts/seed-demo-data.ts` so the feature is
  visible immediately after `npm run seed`. A feature nobody can see is not done.
- **Cache invalidation.** Any new write that changes a total must call
  `invalidateDashboardCache` for every affected member. If the dashboard payload
  shape changes, bump the `dash:v1:` key prefix.
- **Indexes.** Any new query path needs a matching compound index, added in the
  model file, with the access pattern in a comment.
- **Timezones.** All day/month boundaries go through the Asia/Kathmandu helpers.
  Never use the server's local clock.
- **States.** Loading skeleton, empty state, error state, and a filtered-empty
  state — on mobile first.
- **Types.** Shared types/schemas live in `client/src/shared` and are synced; do
  not hand-edit `server/src/shared`.
- **Accessibility.** Labels on icon-only buttons, keyboard reachability for sheets
  and the palette, and a text alternative for every chart.
- **Docs.** Update `docs/README.md` active/future plans and the relevant plan file
  when an item ships, then remove the item from this file.

---

## 11. Explicitly not planned

| Item                                      | Why not                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PostgreSQL migration**                  | The measured cost was round trips and cold starts, not query execution. Compound indexes already cover the dashboard. See `phases.md`.                 |
| **Multi-currency**                        | Deliberate product decision: users are Nepal-based and the app is NPR-only. `CURRENCIES` is dead code; do not resurrect it without a product decision. |
| **AI coaching, voice entry, receipt OCR** | MVP non-goals. Revisit only after P1 and P2 land.                                                                                                      |
| **Offline-first writes**                  | Needs a conflict-resolution model. PWA read caching (P1.3) is the safe first step.                                                                     |
| **Bank integrations**                     | Requires aggregation partners and compliance work; not a code-only task.                                                                               |

---

## 12. Decisions needed before building

1. **Digest timing** — what hour, in Asia/Kathmandu, and one digest per day or a
   weekly option too?
2. **Accounts vs payment methods** — replace `paymentMethod`, or keep both
   (`accountId` for balances, `paymentMethod` for reporting)?
3. **Category migration** — per-space categories with global defaults, or fully
   per-space from day one?
4. **Splitting model** — equal, exact amounts, percentages, or all three? Are
   non-Ledg participants allowed?
5. **Chart layer** — add `recharts`, or hand-roll SVG to protect the bundle?
6. **Roles** — is Admin/Viewer actually wanted, or does owner/member cover it?

Answer these before starting the corresponding milestone; each one changes the
schema, and schema changes are the expensive kind.
