# Shared Spaces — QC & Best-Practice Review

**Date:** August 2026
**Scope:** Full review of the shared-spaces feature set added since doc #34 — invitations by email/`@username`/token, member lifecycle (accept, reject, remove, leave, owner transfer), in-app notification feed + shared copy templates, idempotent space creation, point-in-time identity snapshots (`username`), backfill scripts, and the client UI (`/invite/:token`, notification center, shared-space member sheets, transaction attribution).
**Baseline:** `typecheck:server`, `typecheck:client`, `lint:server`, `lint:client` all pass (0 errors). Backfills run + verified. Nothing committed yet.

Severity colors follow `BUGS_AND_UPGRADES.md` conventions. Items marked ✅ are confirmed working as designed; unmarked items are open issues or recommendations.

---

## Critical — Fix Immediately

### C1. Idempotent space creation is NOT race-safe (duplicate spaces) and swallows all write errors
- **Files:** `server/src/domains/spaces/idempotency.ts`, `server/src/domains/spaces/controller.ts:31-48`
- **Issue:** `createSpace` does check-then-act: `getCachedResponse` (miss) → create space → `storeCachedResponse`. Two concurrent `POST /spaces` with the same `Idempotency-Key` both miss the cache, both create a space, and the second `storeCachedResponse` hits the `{userId, key}` unique index — whose error is swallowed by `.catch(() => null)` (`idempotency.ts:73`). Result: a duplicate space with no signal to either caller. The swallow also hides transient Mongo failures, in which case a retry re-creates the space.
- **Fix:**
  1. Turn the idempotency record into a lease/lock: `insertOne` a placeholder record (add a `pending: true` flag; make `statusCode` optional) *before* running the handler. Unique-key error on insert ⇒ a concurrent request is in flight ⇒ poll `getCachedResponse` briefly and return its result, or 409 `Conflict` "request already in progress".
  2. Only swallow duplicate-key (`E11000`) errors; rethrow everything else from `storeCachedResponse`.
  3. Consider staging the whole create+invite as a Mongo transaction or at least making the invite failure results idempotent-safe (they already are, since pending invites are de-duped by the partial unique index).
- **Status:** ✅ **FIXED (Sep 2026)** — `acquireLease` inserts a `pending: true` placeholder before the handler blocks concurrent duplicates; `finalizeLease` only swallows `E11000` and rethrows everything else; TTL refresh on replay removed. Poll-or-409 on in-flight requests. Handler failures now call `releaseLease` (`idempotency.ts` `deleteOne {userId, key, pending: true}`) so a failed create doesn't leave the lease pending until the 24h TTL — the client's retry with the same key gets a fresh lease.

### C2. Public invitation preview endpoint is unauthed and unrate-limited
- **File:** `server/src/domains/invitations/routes.ts:10`
- **Issue:** `GET /invitations/by-token/:token` runs a no-auth DB lookup with no rate limiter. Guessing a 32-byte (`base64url`) token is infeasible, so this is not a bypass — but it is a public, unrate-limited DB-touching surface (abuse/DoS vector) and every raw token is logged via the URL.
- **Fix:** Add the existing IP-based `apiLimiter` (or a dedicated limiter) to this route. Optional hardening: read the token from `Authorization: Bearer` or `X-Invite-Token` instead of the URL path so it doesn't land in request logs.
- **Status:** ✅ **FIXED (Sep 2026)** — Added `publicReadLimiter` (60/15min) to the preview route.

---

## High — Fix Soon

### H1. Client invite-page mismatch gate is stricter than the server → users who changed email are stuck
- **Files:** `client/src/pages/invite.tsx:76-77`, `server/src/domains/invitations/service.ts:286-294`
- **Issue:** The invite page computes `mismatch = user.email !== preview.inviteeEmail` and blocks Accept/Decline ("please switch account"). The server, however, also accepts when the invitation's `inviteeId` matches the signed-in user — which is exactly the user who changed their email after being invited. They can no longer sign in with the old email, so the UI shows a dead end while the API would accept them.
- **Fix:** Make the client mirror the server rule: allow accept when `user.id === preview.inviteeId` (return `inviteeId` in the preview) even if emails differ, or have the server compute `canAccept` in the preview response. Reject should use the same rule (`service.ts:503-509`).
- **Status:** ✅ **FIXED (Sep 2026)** — Server preview now returns `inviteeId`; client mismatch gate is `email differs AND user.id !== inviteeId`. The client now mirrors the server's accept/reject authorization rule.

### H2. `getPreferences` first-call race → `E11000` duplicate-key crash
- **File:** `server/src/domains/notifications/service.ts:39-56`
- **Issue:** Two concurrent first-time calls both miss the `findOne`, both hit `NotificationPreferenceModel.create`, and one throws a duplicate-key error that propagates up through `notify()` (`getPreferences` is called at `service.ts:103`). The other preference path already uses `findOneAndUpdate({ upsert: true })` (`service.ts:66-70`) — the read path should do the same.
- **Fix:** Replace find-then-create with `findOneAndUpdate({ userId }, { $setOnInsert: defaults }, { upsert: true, returnDocument: "after" })`.
- **Status:** ✅ **FIXED (Sep 2026)** — `getPreferences` now uses `findOneAndUpdate` with `$setOnInsert` defaults, `upsert: true`, atomic against concurrent first calls.

### H3. Profile rename fan-out covers only `Space.members` — invitations and transaction attribution go stale
- **File:** `server/src/domains/users/service.ts:432-438`
- **Issue:** Renaming name/username updates member snapshots only. `SpaceInvitation` snapshots (`inviterName`, `inviterUsername`, `inviteeUsername`) and `Transaction.createdBy.{name,username}` are left stale:
  - Pending invites from the renamed user show the old inviter identity until the invitee re-invites (re-invite does refresh, `invitations/service.ts:159-168`).
  - Transaction attribution is a deliberate point-in-time snapshot, but nothing documents that for joined spaces.
- **Fix:** Fan out name/username to `SpaceInvitation` where `inviterId`/`inviteeId` matches, using the previous username/name to target the old string (mirror the `members` upsert pattern). Decide explicitly whether `Transaction.createdBy` is a permanent audit snapshot; if yes, document it and stop the UI from presenting it as current.
- **Status:** ✅ **FIXED (Sep 2026)** — Pending `SpaceInvitation` snapshots now update: `inviterName`/`inviterUsername` where the renamed user is inviter, `inviteeUsername` where they are the invitee. `Transaction.createdBy.{name,username}` is also fanned out on rename (`users/service.ts`) so shared-space lists show the current identity; invitation + transaction updates use direct model imports (a `mongoose.model()` lookup throws synchronously before the `.catch()` if the model module hasn't loaded).

---

## Medium — Plan to Fix

### M1. Notification spam window is per-process, in-memory, never pruned, and mislabeled
- **File:** `server/src/domains/notifications/service.ts:16-37`
- **Issue:** `spamWindow` is a `Map<string, number[]>` guarded only on access.
  - With multiple server instances (e.g. Vercel lambda scaling) each instance keeps its own window, so the 10/min threshold is per-instance, not global.
  - Dormant keys are never evicted (a space that went quiet leaks its entry forever). Trivial at this scale, but unbounded.
  - The comment says the key is `${userId}:${spaceId}` but the value passed is `data.actorId` (`service.ts:109`). Working as intended (the actor's fingerprint across all recipients), but the comment lies.
- **Fix:** Move the window to a shared store (Redis) or add a periodic prune; fix the comment. Add a unit test around the window semantics.
- **Status:** ✅ **FIXED (Sep 2026)** — The window now lives in **Upstash Redis** (sorted-set sliding window with TTL, via `@upstash/redis`), so the 10/min threshold is global across serverless instances. Comment corrected to actor/space fingerprint. A per-process Map fallback + lazy prune keeps local dev working if Upstash env vars are absent. Unit test still open.

### M2. Idempotency layer is dormant from the client + replays extend TTL + `Mixed` body
- **Files:** `server/src/domains/spaces/idempotency.ts:45-74`, `client/src/lib/api.ts`
- **Issues:**
  - The client never sends `Idempotency-Key` (`api.ts` `spaces.create` has no header), so the whole server feature is dead code in practice.
  - `storeCachedResponse` sets `createdAt: new Date()` on replay, refreshing the 24h TTL every time the same key is replayed.
  - `responseBody: Schema.Types.Mixed` is untyped against any response shape.
  - Key format/prefix is not validated.
- **Fix:** Either wire the client (generate `crypto.randomUUID()` per submit, reuse until the request settles) or delete the server code. Together with C1, pick one coherent design and test it.
- **Status:** ✅ **FIXED (Sep 2026)** — Client now sends `Idempotency-Key` (`crypto.randomUUID()`, reused until the request settles via `useCreateSpace`) in `api.ts spaces.create`. TTL no longer refreshed on replay (C1 rewrite removed `createdAt` bump). `validateIdempotencyKey` enforces the key format server-side. Remaining: `Mixed` type accuracy.

### M3. Duplicate index on `Transaction.createdBy.userId` (pre-existing warning)
- **File:** `server/src/domains/transactions/model.ts`
- **Issue:** Easier to trigger after this round of schema work; observed as a Mongoose duplicate-index warning during the backfill run. The field declares `index: true` *and* the schema defines `transactionSchema.index({ "createdBy.userId": 1 })` — two identical indexes, one redundant.
- **Fix:** Keep a single declaration.
- **Status:** ✅ **FIXED (Sep 2026)** — Removed the redundant `transactionSchema.index({ "createdBy.userId": 1 })`; field `index: true` retained. Also fixed identical duplicates in `dues` (`debtSettlementSchema.index({ userId: 1 })`) and `notifications` (`unique: true` + `index: true` on preference `userId`).

### M4. `findSpaceById` defaults the role to `"member"` when `ownerId` is omitted
- **File:** `server/src/domains/spaces/repository.ts`
- **Issue:** `const role: "owner" | "member" = ownerId ? "owner" : "member"` — a future caller that omits `ownerId` silently gets the space as a "member" even when they own it. All current callers pass it, so no live bug, but the default is unsafe.
- **Fix:** Derive the role from the document (`space.ownerId.toString() === userId ? "owner" : "member"`) or throw when the ambient user is unknown.
- **Status:** ✅ **FIXED (Sep 2026)** — Role is now derived from the document: `doc.ownerId.toString() === (ownerId?.toString() ?? "") ? "owner" : "member"`.

### M5. `transaction_modified` and `space_deleted` bypass all notification preferences
- **File:** `server/src/domains/notifications/service.ts:103-131`
- **Issue:** Preference gating covers `transaction_added`, the invite trio, and the member quartet. `transaction_modified` (edit/delete) and `space_deleted` are always on even with `transactionActivity: "off"`. Might be intended (direct-action + irreversible events), but it's invisible in the prefs UI.
- **Fix:** Decide and document; if "transaction activity off" is meant to silence edits too, gate `transaction_modified` on the same pref (it would need variant-aware titles only when shown, which templates already support).
- **Status:** ✅ **FIXED (Sep 2026)** — `transaction_modified` now obeys the `transactionActivity` pref (silenced unless `realtime`, same as `transaction_added`). `space_deleted` stays always-on (irreversible/direct-action) and is now explicitly documented in the settings prefs UI.

### M6. Member cap is enforceable at accept but bookable at invite — owners can over-book
- **File:** `server/src/domains/invitations/service.ts:121-125`
- **Issue:** `inviteMember` rejects only when `space.members.length >= 10`; pending invites don't reserve a slot. A 9-member space can have 10 pending invites, and the 2nd+ concurrent accept gets a 409 "space full" even though the owner was allowed to send the invites. The accept side (`service.ts:363-383`) is correctly atomic (decision #12).
- **Fix:** Surface pending-invite counts in the owner UI (`space-detail.tsx` invite list already shows them). Optionally make invite-time counting the member cap + pending count (still becomes a soft limiter without an atomic reservation).
- **Status:** ✅ **FIXED (Sep 2026)** — `inviteMember` now reserves outstanding pending invites: rejects when `members.length + pendingCount >= 10`. Re-inviting an already-pending invitee refreshes without consuming a new slot. New `countPendingInvitationsBySpace` repo helper.

### M7. `getPendingForUser` filters by email only — pending invites from `@username` matching a re-signed-in user
- **File:** `server/src/domains/invitations/service.ts:618-620`
- **Issue:** `listPendingInvitationsForEmail` queries `inviteeEmail`, which is correct because username invites are resolved to the user's email at invite time. Not a bug, but a note: a user who changes email loses their pending list view (the inviteeId-accept path still works). See also H1.
- **Fix:** (note — align with H1) also match by `inviteeId` in the pending list.
- **Status:** ✅ **FIXED (Sep 2026)** — `findPendingInvitationsByEmail(email, userId)` now queries `$or: [{ inviteeEmail }, { inviteeId }]`; controller passes the signed-in user's id. Users who changed email still see their pending invites.

---

## Low — Nice to Have

- **L1.** `getAuthUserInfo` is copy-pasted in `spaces/controller.ts:18-27` and `invitations/controller.ts:9-18` — extract a shared helper (e.g. `users/context.ts`).
- **L2.** DTO mappers (`invitations/repository.ts:97-103`, `notifications/service.ts:233-240`, `spaces/access.ts`) use `{ ...doc } as unknown as T` against `Record<string, unknown>` — fine, but typed lean generics or a `parse` step would surface field drift earlier.
- **L3.** `notification-center.tsx` badge count adds *all* pending invitations to the unread count, including invites the user ignores. Acceptable, but consider weighting or capping. The accessible label now states both parts (`X unread, Y pending invitations`) and the counter is a `destructive` (red) pill so it reads as attention-worthy.
- **L4.** `transaction-item.tsx` `showAttribution` always defaults to `true` and is never passed `false` anywhere — dead prop (or wire the personal-space/compact variant to pass `false`).
- **L5.** Invitation + notification `lean()` queries fetch whole documents with no `select` projection — negligible at current scale; add projections when it matters.
- **L6.** `resendInvitation` rotates the token hash but not the identity snapshot for an existing registered user (re-invite via `inviteMember` does refresh it, resend does not). Minor consistency tooltip for the pending-list UI.

---

## Best-Practice Upgrades

| Area | Current | Target | Status |
|------|---------|--------|--------|
| Shared notification copy | `NOTIFICATION_TEMPLATES` + `renderNotification(type, data, variant?)` | Validate every `{var}` in a template against the payload at render time (throw on missing) so UI never shows literal `{amount}`; add a Vitest case per template/variant | ⏳ |
| Notification preference gating | Ad-hoc `if` at `notify()` | Table-driven `type → pref` map, unit-tested per type | ⏳ |
| Idempotency | Check-then-act + swallow-all (C1/M2) | Lease/lock + client wiring + error isolation, tested for replay AND concurrency | ✅ lease/lock + error isolation (C1); client wiring & tests still ⏳ |
| Spam suppression | In-memory Map | Redis/shared store + prune + comment fix (M1) | ✅ Upstash Redis sorted-set w/ TTL + fallback (M1) |
| Profile rename fan-out | `Space.members` only | + `SpaceInvitation` (H3); document transaction attribution as snapshot | ✅ `SpaceInvitation` fan-out (H3); `Transaction.createdBy` also refreshed on rename ✅ |
| `getPreferences` | find-then-create (race) | atomic upsert (H2) | ✅ (H2) |
| Indexes | Duplicate `createdBy.userId` (M3) | single declaration | ✅ (M3, incl. dues + notifications dupes) |
| `Transaction.createdBy` | Snapshot, undocumented | Decide: backfill/refresh on rename or document as immutable | ✅ decided: refreshed on rename (kept as point-in-time for historical rows) |
| Rate limits | All state-changing + invite endpoints hold it; public preview doesn't (C2) | Extend to preview route | ✅ (C2) |
| DTO mapping | `as unknown as T` casts (L2) | typed lean / parse | ⏳ |

### Recommended test list (Vitest; framework is still pending per BUGS_AND_UPGRADES #30)
1. `renderNotification` — every `NotificationType` × variant renders with sample data; unknown placeholder raises (fail-fast).
2. Idempotency — sequential replay returns the cached space; same-key concurrent creates produce exactly one space.
3. Invitation authz matrix — email match, `inviteeId` match, email changed, expired, wrong user, owner-as-invitee rejection.
4. `executeAcceptance` — concurrent accepts can't exceed the member cap (decision #12 regression test).
5. Notification gating — each pref off/on suppresses the right types (M5 coverage).
6. Spam window — burst of 11 txns suppresses the 11th; window resets after 60s.
7. Profile rename fan-out — member snapshots + invitation snapshots updated; unrelated spaces untouched.
8. Backfill scripts — re-running after success is a no-op (idempotency guard already fixed in `backfill-member-usernames.ts`).

---

## Already ✅ Confirmed Good
- **Token minting/hashing:** 32-byte `base64url` token, stored only as SHA-256 hash; pending-only + expiring lookups for preview/accept/reject. `tokenHash` is unset on accept/reject/cancel.
- **Acceptance atomicity:** single conditional `updateOne` enforces `members.userId $ne`, size `< 10`, and non-deleting status; distinguishes "already joined" from "full" (decision #12).
- **Authorization:** every by-id invitation endpoint verifies invitee (`accept`/`reject`) or **current space owner** (`resend`/`cancel` — resolved via `ownerId` of the invitation's space, not `inviterId`, so a transferred space's previous owner loses invite powers and the new owner gains them); `removeMember`/`transferOwnership`/`leaveSpace` gate on owner/role. `req.params` array-cast from Express 5 wildcards is defended in the controllers.
- **Username uniqueness:** sparse unique index + `generateUsername` digit-suffixing + duplicate-key retry in the repo; username availability check endpoint exists.
- **Transaction attribution:** `createdBy.{userId,name,username}` snapshot on create; move/edit paths resolve ownership against the *source* space (decision #15 per doc #35).
- **Public preview PII:** `inviterEmail` removed from the response (doc #38); preview limited to `spaceName`, inviter name/username, invitee email/username, `expiresAt`.
- **Notification copy:** 13 call sites centralized on shared templates; email/data surfaces (recipient, inviteeEmail, IPS) intentionally not templated.