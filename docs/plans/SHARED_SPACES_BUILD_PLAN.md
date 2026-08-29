# Shared Spaces — Readiness Audit & Build Plan

**Date:** August 2026
**Companion doc:** `SHARED_SPACES_AND_MEMBERS_PLAN.md` (full architecture & API spec — read that for schemas/endpoint details; this doc is the *execution* plan)

---

## 1. What the feature is (plain explanation)

Today every space belongs to exactly one person (`space.ownerId`), and only that person can see or touch it. Shared Spaces turns a space into a small collaboration group:

1. **Owner invites people by email** (during space creation, or later from the space detail page).
2. **Invitees get two things:** a branded email (Resend) with a single-use deep link (`/invite/{token}`), and an in-app notification with inline Accept / Decline buttons.
3. **Accepted members manage their own transactions** — a member creates/edits/deletes only what they added; the **owner can edit or delete anyone's**. Members cannot rename the space, change its budget, invite others, or delete it.
4. **Everything is attributed** — each transaction records who added it ("Added by Rikesh"), so shared finances stay transparent.
5. **Owner keeps control:** remove members, transfer ownership before leaving, cancel/revoke pending invites, cascade-delete the whole space.
6. **The Spaces page splits into Personal | Shared tabs**, shared cards show a member avatar stack.

Authorization in one line: `ownerId` is the single source of truth for ownership; membership = your userId appears in `space.members[]`; everyone else gets 404.

---

## 2. Readiness audit (answer to "is it ready?")

| Component | Status | Detail |
|---|---|---|
| Space model (`members[]`, `isShared`) | ❌ Not ready | `spaces/model.ts` has only `ownerId/name/type/monthlyBudget`. Needs embedded `SpaceMember[]` subdocuments + invariant helpers. |
| Invitation model + tokens | ❌ Does not exist | No `domains/invitations` module at all. |
| Notification model + service | ❌ Does not exist | No `domains/notifications` module. |
| Transaction attribution (`createdBy`) | ❌ Does not exist | Needs field + backfill migration before tightening to `required`. |
| Authorization layer | ⚠️ Owner-only hardcoded | Every service calls `resolveSpace(spaceId, ownerId)`; needs a role-aware access resolver. |
| Email infrastructure | ⚠️ Half ready | Resend client is wired (`lib/email.ts`, key + from-address validated in prod) — but only one verification template exists. Need: invite template (new Resend template id) + an invite sender called inline, same pattern as the verification email (decision #21). |
| Client UI | ❌ Not started | No tabs/chips/member sheet/notification bell. |
| Tests | ❌ None in repo | Feature must ship with tests (see §5). |

**Verdict: greenfield build.** The design doc is thorough; nothing is coded yet.

---

## 3. Build phases (ordered, each phase ships compilable code)

### Phase 0 — Config groundwork (½ day)
- Deep-link base URL derived from `CORS_ORIGIN`'s first origin (decision #20) — no new env var.
- Extend `.env.example` where needed.
- Create Resend template for invites in dashboard → record its id in `lib/email.ts` alongside `VERIFICATION_TEMPLATE_ID`.

### Phase 1 — Data model (2 days)
Files: `spaces/model.ts`, new `domains/invitations/model.ts`, new `domains/notifications/model.ts`, `transactions/model.ts`, `scripts/backfill-created-by.ts`

- [ ] `SpaceMember` subdocument schema + `members[]` + `isShared` on spaceSchema (invariants from design doc §2.1: owner always present, `ownerId` authoritative, atomic recompute of `isShared`).
- [ ] `SpaceInvitationModel` with partial unique index `{spaceId, inviteeEmail}` where `status: "pending"`.
- [ ] `NotificationModel` with `{userId, createdAt}` and `{userId, read}` indexes, plus a ~90-day TTL index (decision #17).
- [ ] Token minting at invite time (decision #21): `crypto.randomBytes(32)` → base64url; only the SHA-256 hash is persisted; email sent inline in the same request.
- [ ] `NotificationPreferenceModel` (per user): `{ userId unique, transactionActivity: "realtime" | "daily_digest" | "off", inviteEvents: boolean, memberChanges: boolean }` with sensible defaults (`realtime`, `true`, `true`).
- [ ] `createdBy` on transactions as **optional first** + idempotent backfill script (attribute legacy rows to `space.ownerId`; fallback `"Unknown" <unknown@ledg.app>`), run it, then flip fields to `required`.
- ✅ Acceptance: models load, indexes created on a scratch DB, backfill re-runnable.

### Phase 2 — Access control core (1–2 days)
Files: `domains/spaces/access.ts` (new), touchpoints in `transactions/service.ts`, `analytics/service.ts`, `spaces/service.ts`

- [ ] `resolveSpaceAccess(spaceId, userId): { space, role: "owner"|"member" } | null` — one indexed query (`$or: [{ownerId}, {"members.userId"}]`).
- [ ] Replace owner-only `resolveSpace()` calls: transaction **create** + analytics accept **member or owner**; transaction **update/delete/move** enforce `createdBy.userId === req.userId` OR owner (move path included — members move only their own txns, decision #15); space update/delete/invite remain **owner-only** (matrix §3).
- [ ] `GET /spaces` returns owned ∪ member-of spaces (flag each response item `role`).
- [ ] **Membership-aware analytics:** update `resolveSpaceIds("all")` / dashboard / recurring aggregations to union owned + member-of spaces (decision #14) — otherwise shared activity vanishes from Insights.
- ✅ Acceptance: existing single-user flows unchanged; member can CRUD their own transactions; member editing another's transaction or space settings → 403.

### Phase 3 — Invitations domain (3 days)
Files: new `domains/invitations/{model,repository,service,controller,routes}.ts`, mount in `routes.ts`

- [ ] Token minting: `crypto.randomBytes(32)` → base64url; store SHA-256 hash only.
- [ ] Atomic state machine: pending → accepting → accepted / rejected / canceled; conditional `findOneAndUpdate` filters (status + expiry + pinned tokenHash); idempotent replays return current state.
- [ ] Endpoints per spec §4.2: `pending`, `by-token/:token` (resolve), `by-token/accept`, `:id/accept`, `:id/reject`, `:id/resend`, `DELETE :id`. Recipient authorization = `inviteeId === req.userId` OR normalized email match; 403 otherwise, no mutation.
- [ ] Accept unit-of-work: transaction where supported; else `accepting` status + durable job (member upsert keyed `{spaceId,userId}`, notifications deduped by `{invitationId,type}`, then `accepted`).
- [ ] Rate limit invite mutations with `sensitiveActionLimiter`; cap members (10/space → 409 beyond).
- [ ] **Abuse ceiling** (decision #16): max ~20 outstanding pending invites per owner; uniform invite response — registration status of the target email never leaks (decision #11); reject self-invites and already-member emails (409).
- [ ] Token hygiene (decision #19): 7-day expiry, strict Referrer-Policy on the invite route, raw tokens never logged.
- [ ] Accept-time atomicity: member-cap check rides inside the same conditional accept update/transaction so concurrent accepts can't exceed 10 (decision #12).

#### Non-registered invitee journey (finalized)

```
Owner adds sara@x.com ──► invitation{status:pending, inviteeEmail, inviteeId:null}
        │                       + token minted, email sent inline (await)
        ▼
Sara clicks ► preview screen (NO auth): "Rikesh invited you to 'Trip'"
        │  not registered ► [Sign up to join]
        ▼
Signs up WITH THE SAME EMAIL (verifies it) ► redirected back to /invite/{token}
        ▼
Taps [Accept] ► server validates: token pending + unexpired
               + authenticated email === inviteeEmail (normalized)
        ▼
Atomic: invitation→accepted; members[] gains {userId, name from her account}
        ▼
Space shows her username/avatar; owner gets invite_accepted notification
```

Key rules & edge cases:
- **No auto-join on signup.** Registration only makes the invitation *claimable*; acceptance is always an explicit tap. Registered and never-registered invitees follow one identical accept/reject path.
- **Email match is the claim key.** Signup with a different address → 403, invitation stays pending for the original email. Tokens are not transferable between accounts.
- **Preview before auth.** `GET /invitations/by-token/:token` returns non-sensitive context without login so people see what they're joining before creating an account.
- **Member entry created at accept time** from the accepter's account — no email→username migration exists; the invitation stores only the claim email.
- Expired token → 410 screen; resend rotates hash (old link dies); reject → terminal state, re-invite possible later; never signs up → invitation silently expires.

### Phase 4 — Email delivery (1 day)
Files: `lib/email.ts` (extend only — no worker, no outbox, decision #21)

- [ ] `sendInvitationEmail({to, spaceName, inviterName, acceptUrl})` using the new Resend template.
- [ ] **Inline send:** token minted → hash persisted → email awaited within the invite request itself (same pattern as the verification email in BetterAuth hooks). Send failure does NOT roll back the invitation — it stays pending and the owner's Resend button re-mints + re-sends (manual retry path).
- [ ] Space creation with multiple `inviteEmails[]` sends in parallel via `Promise.allSettled`; per-invite failures are isolated and reported per chip in the response.
- [ ] Resend rotates the token hash + refreshes `expiresAt`, instantly invalidating all previously issued links; short cooldown guards against spamming.
- ✅ Acceptance: resend invalidates prior links; failed send surfaces as a "not delivered" state on the owner's pending list with a working Resend action.

### Phase 5 — Notifications & preferences (3 days)
Files: new `domains/notifications/{service,controller,routes,model}.ts`

**Finalized event map** (in-app for everything except #1; email = invite delivery only):

| # | Event | In-app recipients | Notes |
|---|---|---|---|
| 1 | `space_invite` | invitee | + Resend invite email w/ token link |
| 2 | `invite_accepted` | owner | — |
| 3 | `invite_rejected` | owner | — |
| 4 | `member_joined` | all other members | fired after membership created |
| 5 | `member_left` | owner + remaining members | — |
| 6 | `member_removed` | the removed person | — |
| 7 | `ownership_transferred` | new owner + former owner **only** | other members not notified |
| 8 | `transaction_added` | other members, per recipient's txn-activity pref | realtime / digest / off |
| 9 | `transaction_modified` | the transaction's creator | when owner edits/deletes someone else's txn; message says which + by whom |
| 10 | `space_deleted` | all remaining members | in-app only, no email |

- [ ] Service `notify(userId, type, title, message, data)` implementing the map above — never stores tokens, only `invitationId`.
- [ ] Routes: list (paginated + unread count), mark-read, read-all — all filtered by `req.userId`.
- [ ] **Transaction activity (decided): real-time per transaction by default** — on create in a shared space, notify all *other* members whose preference allows it.
- [ ] **Notification preferences API:** `GET /me/notification-preferences` + `PUT /me/notification-preferences` — per-user config: transaction activity mode (`realtime` | `daily digest` | `off`), toggle groups for invite events and member changes; "off" silences everything.
- [ ] Digest path (note): a true daily summary needs *some* scheduled trigger, which we've deliberately avoided (decision #21). Ship v1 with `realtime` and `off`; when a scheduler eventually exists (e.g. Vercel Cron for other features), add `daily digest` on top — preferences schema already reserves the value so no migration needed.

### Phase 6 — Spaces API upgrades (2 days)
Files: `domains/spaces/{service,repository,controller,routes,validator}.ts`

- [ ] Create accepts `inviteEmails[]` + required `Idempotency-Key` header (idempotency-key collection replaying first response).
- [ ] Members list (any member, no pending-invite leakage), owner-only pending-invitations endpoint.
- [ ] Remove member (`:members/:userId`), transfer-ownership (atomic single-doc swap + `isShared` recompute), leave (409 for owners until transfer/delete).
- [ ] Cascade deletion upgrade per spec §4.1.1: `deleting` lease → transactions → cancel invitations → delete notifications → cache invalidation → drop space; guard rejects mutations while lease active.
- [ ] **Account-deletion interplay** (decision #10): `deleteUserWithData` blocks with 409 while the user owns shared spaces that still have members (must transfer/delete first); when *deleting* their own account, scrub their `members[]` entries from all shared spaces and notify remaining owners.
- [ ] **Rename fan-out** (decision #13): profile/username updates propagate `name` into every `members[]` entry where the user appears (historical `createdBy` snapshots intentionally left stale).

### Phase 7 — Client (4–5 days)
Files: `pages/spaces.tsx`, `pages/space-detail.tsx`, new `components/notifications/*`, `lib/queries.ts`, `lib/api.ts`, shared types

- [ ] Personal/Shared tabs; avatar stacks on shared cards.
- [ ] Email-chip input in create sheet (Enter/comma pills, dedupe, format check).
- [ ] Member management sheet: roles, pending invites w/ Resend+Revoke, invite input, transfer-ownership confirm, leave-space confirm (hidden for owner).
- [ ] Header bell → notification sheet: unread badge, invitation cards with Accept/Decline, mark-all-read.
- [ ] **Settings page — Notifications section:** transaction activity selector (Real-time / Off at v1; "Daily digest" shown as coming-soon until a scheduler exists), invite-event and member-change toggles; wired to the preferences API with optimistic updates.
- [ ] Transaction rows show `createdBy.name` when ≠ current user; edit/delete affordances hidden (and server-enforced 403) for other members' txns unless viewer is owner; optimistic updates extended for membership changes.
- [ ] Deep-link route `/invite/:token` → resolve screen → accept/reject → redirect into space.

### Phase 8 — Hardening & verification (1–2 days)
- [ ] Vitest unit tests: token mint/hash roundtrip, invitation state machine races, access resolver matrix, cascade ordering, timezone-independent expiry.
- [ ] Manual E2E checklist: two accounts, all paths in permissions matrix §3.
- [ ] Lint/typecheck clean; sync-shared run; docs updated.

---

## 4. Suggested commit sequence (mirrors phases)

```
feat(spaces): embed members with isShared invariant
feat(invitations): schema, tokens and atomic state machine
feat(notifications): model, service and recipient-scoped routes
feat(users): per-user notification preferences with digest mode
feat(email): invite template + inline sender with token rotation
fix(auth): role-aware space access replaces owner-only checks
feat(spaces): invites on create, transfer, leave, cascade delete v2
feat(client): personal/shared tabs and invite chips
feat(client): member management and notification center
test(shared): invitation and access-control suites
```

## 5. Test checklist (minimum)

- Token: mint→hash→resolve→accept; reuse → 410; after resend old token → 410; expired → 410.
- Authz: non-member 404 on space + transactions; member can CRUD own txns, blocked from editing others' (403) and from space settings/invite/remove; owner-only endpoints reject members.
- Idempotency: double-click invite → 1 invitation, 1 email; retried create with same Idempotency-Key → same space.
- Cascade: delete space → txns gone, invites canceled, notifications purged, links inert.
- Concurrency: simultaneous accept/reject → exactly one wins, other idempotent.
- Preferences: realtime mode notifies other members per txn; "off" silences all; digest mode emits exactly one summary per cycle and zero realtime pings; preferences apply only to the owner of that setting.
- Notification map: each of the 10 events reaches exactly its specified recipients (e.g. transfer → only the two owners; owner-edit → only the creator); no email fires for events 2-10.
- Unregistered journey: invite → signup with matching email → explicit accept → member entry uses account identity; signup with different email → 403 and invitation untouched; preview screen resolves without auth.
- Stress cases: concurrent accepts at 9/10 members → exactly 10; invite response byte-identical for registered vs unknown emails; owner of shared space cannot delete account (409) until transfer/delete; member account deletion leaves zero stale `members[]` entries; rename propagates to all shared spaces; analytics totals include member-of spaces.

## 6. Effort summary

| Phase | Days |
|---|---|
| 0 Config | 0.5 |
| 1 Data model | 2 |
| 2 Access control | 1.5 |
| 3 Invitations | 3 |
| 4 Email (inline) | 1 |
| 5 Notifications + preferences | 3 |
| 6 Spaces API | 2 |
| 7 Client | 5 |
| 8 Hardening | 1.5 |
| **Total** | **~19.5 dev-days** |

## 7. Decisions (finalized)

| # | Question | Decision |
|---|---|---|
| 1 | Member cap per shared space | **10** — invite rejected with 409 beyond cap |
| 2 | Transaction activity notifications | **Real-time per transaction by default**, but user-configurable in Settings: Real-time / Daily digest / Off, plus toggles for invite-event and member-change notification groups. Preferences are per-user; the actor never controls who gets notified — each recipient's own setting decides. |
| 3 | Inviting unregistered emails | **Yes** — invitation pends keyed to the normalized email; redeemable when a user signs up with that email (recipient authorization matches on `inviteeId` OR normalized email) |
| 4 | Ownership transfer eligibility | **Any current member, no default preselection** — owner picks from a flat member list in the transfer sheet |
| 5 | Member transaction scope | **Members CRUD only their own transactions; owner can CRUD anyone's** — server-enforced 403, UI hides edit/delete on others' txns for non-owners |
| 6 | Email policy | **In-app only beyond the invite email** — Resend is used exclusively for invitation delivery |
| 7 | Owner edits/deletes another's txn | **Notify the creator** (`transaction_modified`) |
| 8 | Ownership transfer visibility | **New + former owner only** — other members are not notified |
| 9 | Member leaves / is removed | **Transactions stay**, still attributed to the creator |
| 10 | Account deletion while owning shared spaces | **Blocked** — user must transfer ownership or delete those spaces first. Symmetrically, a *member* deleting their account is cleaned out of every `members[]` they appear in |
| 11 | Invite enumeration | **Uniform response** — `POST invite` replies identically whether the email is registered or not; registration status never leaks |
| 12 | Member-cap enforcement | **Atomic** at accept time (conditional space-doc update) — no race to 11 members |
| 13 | Stale denormalized names | **Fan-out on rename** via existing profile-update hook; minor staleness tolerated for historical `createdBy` snapshots |
| 14 | Analytics scope | **Membership-aware everywhere** — dashboard/analytics/all-transactions include shared spaces the user belongs to |
| 15 | Cross-space moves | Members move **their own** txns personal↔shared; others' txns are owner-only on the move path too |
| 16 | Invite abuse ceiling | Max ~20 outstanding pending invites per owner + daily email budget |
| 17 | Notification retention | TTL index ~90 days on notifications |
| 18 | Bulk-create spam guard | Suppress realtime `transaction_added` when >K txns created within M minutes by one actor |
| 19 | Token hygiene | 7-day expiry, strict Referrer-Policy on invite route, raw tokens never logged |
| 20 | Deep-link base URL | Derived from `CORS_ORIGIN`'s first origin — no separate `APP_URL` env |
| 21 | Email delivery mechanism | **Inline await, same pattern as verification emails** — no outbox collection, no worker, no cron. Owner's Resend button doubles as the manual retry path (mints fresh token). Space-creation invites send in parallel via `Promise.allSettled`. |

### ✅ Previously deferred — resolved

- ~~Email delivery mechanism on Vercel~~ → decision #21. The outbox/worker/cron subsystem was dropped: serverless background work is unreliable, and the resend button provides the retry guarantee an outbox would have bought. Token lifecycle is unaffected — minted at invite time, rotated on resend.

### Derived work from decision #2
- `NotificationPreferenceModel` (Phase 1), preferences API endpoints and dispatch gating (Phase 5), Settings UI section (Phases 5/7) — already folded into the phases above (+1.5 days vs original estimate). Digest mode deferred until a scheduler exists (decision #21 follow-up).
