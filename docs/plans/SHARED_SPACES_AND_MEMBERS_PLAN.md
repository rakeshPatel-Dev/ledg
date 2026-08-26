# Collaborative Shared Spaces & Member Management Plan

This document details the complete end-to-end architecture, database schemas, authorization model, email notification workflows, API specifications, and UI/UX design patterns for implementing **Shared Spaces & Member Collaboration** in Ledg.

---

## 1. Executive Summary & Vision

Ledg is evolving from a single-user money tracker into a collaborative finance tool tailored for households, couples, trips, and shared ventures.

### Key Goals
1. **Ownership vs Membership**:
   - **Owner (Creator)**: Complete authority over space configuration (name, budget, type), member invitations, member removals, and cascade deletion.
   - **Member**: Collaborative partner who can create transactions and manage their own entries (the owner may edit or delete anyone's), with the autonomy to leave at any time.
2. **Frictionless Invites via Email & In-App**:
   - Owner can invite members during space creation via email chips or on-the-fly from the space details page.
   - Invitees receive a branded email via **Resend** and an interactive in-app notification with inline **Accept** and **Reject** buttons.
3. **Dedicated Space Segmentation**:
   - Spaces page (`/spaces`) features intuitive **Personal** and **Shared** tabs with member avatar stacks.
4. **Real-time Notifications & Activity Attribution**:
   - In-app notification center (bell in header) with unread counters and actionable invitation cards.
   - Transactions display member attribution (*"Added by Rikesh"*) to foster transparency.

---

## 2. Database & Data Model Design

### 2.1 Space Schema Update (`server/src/domains/spaces/model.ts`)

```typescript
export interface SpaceMember {
  userId: Types.ObjectId;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: Date;
}

export interface SpaceDoc {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  type: SpaceType;
  monthlyBudget?: number | null;
  isShared: boolean;
  members: SpaceMember[];
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// Mongoose Schema
const spaceMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Add to spaceSchema:
members: [spaceMemberSchema],
isShared: { type: Boolean, default: false }
```

#### Ownership & Sharing Invariants

All ownership fields are governed by a single invariant that must hold at rest:

1. **`ownerId` is authoritative.** Authorization checks (`req.userId === space.ownerId`) always read `ownerId`; `members[].role` is denormalized display data and never overrides it when values diverge.
2. **The owner must be represented in `members`.** Exactly one entry has `role: "owner"`, and its `userId` MUST equal `ownerId`.
3. **All related fields change atomically.** Space creation inserts `ownerId`, the owner's `members` entry (`role: "owner"`), and `isShared` in one document write. Every membership mutation (invite accept, remove, leave, transfer) updates `members[]` and recomputes `isShared` (`true` ⇔ at least one non-owner member exists) in the same update, so authorization, member lists, and Personal/Shared tab classification can never disagree.

---

### 2.2 Space Invitation Schema (`server/src/domains/invitations/model.ts`)

```typescript
export interface SpaceInvitationDoc {
  _id: Types.ObjectId;
  spaceId: Types.ObjectId;
  spaceName: string;
  inviterId: Types.ObjectId;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: Types.ObjectId | null;
  role: "member";
  status: "pending" | "accepting" | "accepted" | "rejected" | "canceled";
  tokenHash?: string | null; // SHA-256 of the raw token while the invitation is redeemable — the raw token is NEVER stored. The field carries no `required` constraint: acceptance/cancellation `$unset` it, so terminal documents legitimately have no hash.
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// One active invitation per space and normalized invitee email
spaceInvitationSchema.index(
  { spaceId: 1, inviteeEmail: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
```

**Tokens are single-use credentials:**
- Generated with a CSPRNG (`crypto.randomBytes(32)` → base64url, ~192 bits of entropy).
- Only `tokenHash = SHA-256(rawToken)` is persisted; redemption looks up by hash comparison.
- Because storage holds only the hash, the raw token is never persisted anywhere — so the async email worker must be able to mint it. The delivery worker therefore **generates the token at send time**: it atomically claims its outbox job, persists the new `tokenHash` (+ fresh `expiresAt`) on the invitation in that same update, renders the deep-link URL from the in-memory plaintext, and discards the plaintext once the send completes (successfully or not). The identical mint → hash → send path serves initial delivery and resend, and because resend rotates the hash it instantly invalidates every previously issued link. An invitation whose job has not yet run has no `tokenHash`, so links cannot be accepted before first delivery — preserving the single-use contract.

**State transitions must be atomic and idempotent.** Accept/reject/cancel/resend use a conditional atomic update so exactly one request wins:

```typescript
// Accept example — only an unexpired pending invitation transitions
const invited = await SpaceInvitationModel.findOneAndUpdate(
  { _id: id, status: "pending", expiresAt: { $gt: new Date() } },
  { $set: { status: "accepted" }, $unset: { tokenHash: "" } }, // token invalidated after use
  { new: true }
);
// If null → expired/already-transitioned → return the current state (idempotent) or 410 Gone
```

By-token acceptance additionally pins `tokenHash` to the presented token's hash in this filter (`{ …, tokenHash: sha256(rawToken) }`, see 4.2), so a resend that rotates the hash renders every older link un-acceptable; id-based acceptance relies on the `$unset` above to invalidate outstanding tokens.

The invitation transition, membership creation, and notification dispatch must be recoverable as **one unit of work**, so a crash can never strand an accepted invitation without membership:

- Where the deployment supports transactions, all three steps execute inside a single database transaction and commit or roll back together.
- Otherwise the winning request moves the invitation to an explicit intermediate `status: "accepting"` and enqueues a durable post-acceptance job before responding. The job creates the membership and dispatches notifications idempotently (member upsert keyed by `{spaceId, userId}`, notifications deduped by `{invitationId, type}`), then flips the status to `"accepted"`. Retries of an interrupted run resume safely because every step is a conditional no-op when its effect already exists.

Expired invitations are treated as terminal: redemption fails with an expiry response, and cancellation (`status: "canceled"`, token hash unset) makes all outstanding links inert immediately.

---

### 2.3 Notification Schema (`server/src/domains/notifications/model.ts`)

```typescript
export type NotificationType =
  | "space_invite"
  | "invite_accepted"
  | "invite_rejected"
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "transaction_added"
  | "space_deleted";

export interface NotificationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // recipient
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: {
    spaceId?: string;
    spaceName?: string;
    /** The only invitation reference carried in a notification. Raw tokens
     *  are NEVER embedded in notifications — the client acts through the
     *  recipient-authorized invitation endpoints (4.2), and any deep link is
     *  resolved server-side per request. */
    invitationId?: string;
    actorId?: string;
    actorName?: string;
    transactionId?: string;
    amount?: number;
  };
  createdAt: Date;
}
```

> **No credentials in notification payloads.** Notifications carry `invitationId` only. A deep link is never reconstructed from stored data: it is either delivered exclusively inside the invite email by the minting worker (2.2) or resolved on demand through a recipient-authorized endpoint / protected one-time exchange that returns the link target to the matching authenticated user once and scrubs any credential after use.

---

### 2.4 Transaction Attribution Update (`server/src/domains/transactions/model.ts`)

```typescript
// Add creator metadata to transaction
createdBy: {
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
}
```

**Migration & Backfill (required before enforcing the schema above):**

1. Existing single-user transactions have no attribution data. A migration must backfill every transaction missing `createdBy` **before** `userId`, `name`, and `email` become `required`.
2. **Fallback creator identity:** when the original creator is unavailable (e.g. legacy rows), attribute the transaction to the owning user of its space (`space.ownerId` → that user's current `name`/`email`). If the owner record itself is unrecoverable (deleted account, orphaned space), stamp a documented system fallback (`name: "Unknown"`, `email: "unknown@ledg.app"`) so the invariant still holds and rows remain traceable.
3. The same backfill + fallback rules apply to the transaction model's migration section — run as an idempotent script (`filter: { createdBy: { $exists: false } }`) that is safe to re-run, then tighten the schema to `required`.

---

## 3. Authorization & Permissions Matrix

| Action | Space Owner | Space Member | Non-Member |
| :--- | :---: | :---: | :---: |
| **View Space & Transactions** | ✅ | ✅ | ❌ (403/404) |
| **Create Transactions** | ✅ | ✅ | ❌ |
| **Update / Delete Own Transactions** | ✅ | ✅ | ❌ |
| **Update / Delete Others' Transactions** | ✅ | ❌ | ❌ |
| **Edit Space Name / Budget / Type** | ✅ | ❌ | ❌ |
| **Invite New Members** | ✅ | ❌ | ❌ |
| **Remove Members** | ✅ | ❌ | ❌ |
| **Transfer Ownership** | ✅ (to an eligible existing member) | ❌ | ❌ |
| **Leave Space** | ❌ (after transferring ownership; otherwise delete space) | ✅ | ❌ |
| **Delete Space (Cascade Deletion)** | ✅ | ❌ | ❌ |

> The owner-exit path is **ownership transfer**: an owner leaves only after atomically transferring ownership to another member (or by deleting the space). The permissions matrix, endpoint specification (4.1), and UI behavior (6.3) all follow this single supported path.

---

## 4. API Endpoints Specification

### 4.1 Spaces & Members
- `GET /api/v1/spaces` — Returns both owned spaces and spaces where user is a member (`members.userId = req.userId`).
- `POST /api/v1/spaces` — Accepts `name`, `type`, `monthlyBudget`, optional `inviteEmails: string[]`, and a **required client-supplied `Idempotency-Key` header**. The server persists every key under a `{ userId, key }` unique index in a dedicated idempotency-key collection that snapshots the created space id and the original response body. A retried request carrying a seen key replays the originally created space and invitation results instead of executing again; only the first request performs the work. As a second layer, invitation deduplication by the `{spaceId, inviteeEmail}` pending-uniqueness index still guards the original creation request's own retries, so repeated requests never create duplicate invitations. Delivery remains decoupled and asynchronous (see 4.1.2).
- `GET /api/v1/spaces/:id/members` — List space members. Accessible to any member of the space; **pending invitation data is never included** in this response so non-owners cannot enumerate outstanding invites.
- `GET /api/v1/spaces/:id/invitations` — Pending invitations for the space (**Owner only**). This dedicated endpoint replaces embedding pending invites in the members response; authorization is enforced server-side, not by client-side filtering.
- `POST /api/v1/spaces/:id/members/invite` — Invite member by email (`{ email: string }`). Owner only.
- `DELETE /api/v1/spaces/:id/members/:userId` — Remove member (Owner only). The path parameter is the existing `SpaceMember.userId` identifier; lookup matches the entry in `space.members` whose `userId` equals `:userId`. No separate membership identifier is introduced.
- `POST /api/v1/spaces/:id/transfer-ownership` — Owner only. Body: `{ userId: string }` naming an existing accepted member. Atomically (single document update): sets `ownerId = userId`, flips both members' roles (`old owner → "member"`, `new owner → "owner"`), and recomputes `isShared`. Fails with 400 if the target is not a current member. After a successful transfer the former owner may call `POST /api/v1/spaces/:id/leave` like any member.
- `POST /api/v1/spaces/:id/leave` — Leave space (Member only). Owners must transfer ownership or delete the space first (409 otherwise).

#### 4.1.1 Delete Space — Cascade Deletion

`DELETE /api/v1/spaces/:id` (Owner only) removes more than the `SpaceDoc`. Deletion runs as an ordered, idempotent cleanup keyed by `spaceId`, so a crashed run can be retried safely (each step re-runs as a no-op when its targets are already gone):

| Order | Target | Action |
| :--- | :--- | :--- |
| 0 | SpaceDoc (deletion lease) | **Before any cascade step**, atomically set a terminal-pending deletion state on the space document (`status: "deleting"` + `deletingAt` lease timestamp). Retried runs re-assert/refresh it idempotently; every subsequent step re-checks it on entry. |
| 1 | Transactions | `deleteMany({ spaceId })` |
| 2 | Invitations | Cancel all (`status: "canceled"`, token hashes unset) so outstanding links/tokens die immediately |
| 3 | Notifications | Delete notifications referencing the space (`data.spaceId`) |
| 4 | Cached pages / analytics caches | Invalidate space-scoped cache entries and query keys |
| 5 | Email links | No server action needed — deep links resolve through the token lookup, which now returns "invitation no longer available"; the UI shows an expired/revoked state |
| 6 | SpaceDoc | Remove the space document itself (last, as the ownership root) |

**Deletion guard.** While the `status: "deleting"` lease is active, all space-scoped mutations reject with 409 — at minimum space-transaction creation and invitation mutations (accept/reject/cancel/resend), which check the flag in their authorization/update filters before doing work. Because the guard lives on the SpaceDoc itself and the SpaceDoc is removed only at step 6, it stays effective across the entire cascade, including non-transactional partial runs: any interleaved mutation attempt after step 0 hits the rejecting state, and once step 6 completes the space no longer exists for lookups to succeed against.

Steps execute within a transaction where the deployment supports it; otherwise the ordering above guarantees safe resumability: partial completion leaves only already-deleted data behind, and retrying completes the remaining steps (re-establishing the lease first).

#### 4.1.2 Email Delivery Outbox

> **⚠️ SUPERSEDED** by `SHARED_SPACES_BUILD_PLAN.md` decision #21: invitations are sent **inline within the request** (same pattern as verification emails), with no outbox collection, worker, or cron. The owner's Resend action is the manual retry path and re-mints the token; multi-invite creation sends in parallel via `Promise.allSettled`. Token lifecycle rules below (hash-only storage, rotation on resend, expiry) remain fully in force.

Invitation email delivery is decoupled from space creation and invitation persistence:

- **Persist first:** creating an invitation writes only the invitation document plus a delivery job in an outbox collection (`{ invitationId (unique index), attempts, status: "queued" | "sending" | "sent" | "failed", lastError?, nextAttemptAt }`). The job is created through an atomic upsert keyed by `invitationId`, so at most one job can ever exist per invitation even under concurrent creation paths.
- **Deliver async:** a worker drains the queue and calls Resend, retrying with backoff on failure (`status: "failed"` after a bounded attempt count). A job is claimed with a conditional atomic update (`findOneAndUpdate({ _id, status: "queued" }, { status: "sending" })`), so two workers can never send the same invitation simultaneously.
- **Idempotency is enforced by the outbox itself:** invitation-document deduplication alone cannot prevent duplicate jobs (e.g. racing enqueue attempts), so the unique `invitationId` key is the authoritative guard — a duplicate enqueue attempt upserts onto the existing row instead of inserting a second one. Client retries of `POST /spaces` or `POST .../invite` additionally reuse the existing pending invitation via the `{spaceId, inviteeEmail}` uniqueness index.
- **Repair path:** failed deliveries surface in the owner's pending-invitations UI ("Resend"), which claims the existing outbox row for its `invitationId` through the same conditional atomic update used by the worker (see 4.2 resend endpoint) — concurrent resends therefore enqueue at most one delivery.

### 4.2 Invitations
- `GET /api/v1/invitations/pending` — List pending invitations for logged-in user's email.
- `GET /api/v1/invitations/by-token/:token` — Resolves a deep-link token **before** acceptance: hashes the raw token, validates existence + `status: "pending"` + `expiresAt > now`, and returns only non-sensitive context (`spaceName`, `inviterName`, `inviterEmail`, `expiresAt`). Expired/used/canceled tokens return 410 Gone. This is what makes the email deep link (`/invite/{token}`, section 5) actionable.
- `POST /api/v1/invitations/by-token/accept` — Body: `{ token }`. Same validation as above, then performs the atomic accept transition (2.2) and membership creation. **Authorized recipient only — identical rules to `:id/accept`:** the request must satisfy `req.userId === invitation.inviteeId`, or — when `inviteeId` is null — the normalized authenticated email (`req.userEmail.toLowerCase()`) matches `invitation.inviteeEmail`; unauthorized requests are rejected with 403 **without modifying the invitation**. The atomic update pins the presented token's hash in its filter (`{ …, status: "pending", expiresAt: { $gt: now }, tokenHash: SHA-256(token) }`), so accepting can never succeed against a rotated hash and a concurrent resend cannot leave an older token valid.
- `POST /api/v1/invitations/:id/accept` — Accept invitation (adds user to `space.members`, creates notifications, invalidates cache). **Authorized recipient only:** the request must satisfy `req.userId === invitation.inviteeId`, or — when `inviteeId` is null — the normalized authenticated email (`req.userEmail.toLowerCase()`) matches `invitation.inviteeEmail`. Unauthorized requests are rejected with 403 **without modifying the invitation**.
- `POST /api/v1/invitations/:id/reject` — Reject invitation. Same recipient authorization rules as accept; unauthorized requests are rejected without state changes.
- `DELETE /api/v1/invitations/:id` — Cancel invitation (Owner only).
- `POST /api/v1/invitations/:id/resend` — Owner only. Re-mints the single-use token via the mint → hash → send path inline (new hash, fresh `expiresAt`), which invalidates all previously issued links, and re-notifies the invitee. Idempotent semantics: repeated calls within a short cooldown return the current invitation state without stacking duplicate deliveries; resending an already-resolved invitation returns 409.

The pending list and owner-only cancellation behavior are unchanged by these additions; only authorization on mutations is tightened.

### 4.3 Notifications
All operations are scoped to the authenticated recipient — every query and mutation filters or updates with `userId: req.userId`, so notifications can only be read or modified by their recipient:
- `GET /api/v1/notifications` — List notifications **where `userId = req.userId`**, with pagination and unread counter.
- `PATCH /api/v1/notifications/:id/read` — Mark as read via update filter `{ _id, userId: req.userId }`; a mismatch is a 404, never another user's notification.
- `POST /api/v1/notifications/read-all` — Mark all as read for `userId = req.userId` only.

---

## 5. Email Workflows (Resend)

```
[Owner invites friend@email.com]
        │
        ├── 1. In-App Notification created for friend (if already registered)
        └── 2. Email dispatched via Resend (inline, decision #21 in the build plan):
               Subject: Rikesh invited you to join "Trip to Pokhara" on Ledg
               Body:
               - Space Name & Type badge
               - Inviter details
               - Clear CTA: "Accept Invitation" / "Decline"
               - Direct deep-link: https://ledg.app/invite/{token}
                 → opens GET /api/v1/invitations/by-token/{token} (4.2),
                   which validates the token before showing Accept/Decline,
                   and acceptance posts to /api/v1/invitations/by-token/accept
```

---

## 6. UI & UX Architecture

### 6.1 Spaces Page Segmentation (`/spaces`)
- **Tabs**: `Personal` | `Shared` | `All`
- **Space Cards**:
  - Personal: Standard icon + balance + budget.
  - Shared: Member avatar stack (e.g. overlapping circular initials + `Shared` badge + Owner indicator).

### 6.2 Space Creation with Email Chips
- Interactive input in Create Space sheet:
  - Typing email + hitting `Enter` or `Comma` adds a pill chip: `[sara@gmail.com ✕]`.
  - Email format validation with duplicate prevention.

### 6.3 Member Management Sheet in Space Detail (`/spaces/:id`)
- **For Owner**:
  - Member list with role badges (`Owner`, `Member`).
  - Pending invitations section with `Resend` (calls `POST /api/v1/invitations/:id/resend`, 4.2) and `Revoke` buttons.
  - "Invite member" input.
  - "Transfer ownership" action per eligible member: confirmation sheet explains the owner becomes a regular member and must use Leave afterwards; success re-renders roles from the server response.
- **For Member**:
  - Member list view (no pending invitation data — that is owner-only per 4.1).
  - Prominent "Leave this Space" action with confirmation sheet. Hidden for owners, who see the transfer-ownership / delete-space paths instead.

### 6.4 Interactive Header Notification Center
- Bell icon in `Header` shows an unread indicator dot and badge count.
- Clicking opens a modern Shadcn Sheet / Popover:
  - Invitation Cards with instant **[Accept]** and **[Decline]** buttons.
  - Activity logs (*"Sara added an expense of Rs. 1,200 for Groceries"*).
  - "Mark all as read" button.

---

## 7. Implementation Roadmap & Milestones

1. **Milestone 1**: Database Schemas & Shared DTOs (`Space`, `SpaceInvitation`, `Notification`).
2. **Milestone 2**: Backend Services & Middleware (Member verification, Invite service, Cascade deletion).
3. **Milestone 3**: Resend Email templates & mailer integration for space invites.
4. **Milestone 4**: Notifications API & In-App Notification Center UI.
5. **Milestone 5**: Space Creation Email Chips & Space Page Segmentation (`Personal` vs `Shared`).
6. **Milestone 6**: Space Detail Member Management Sheet & Leave Space workflow.
7. **Milestone 7**: Testing, Typecheck, and End-to-End verification.
