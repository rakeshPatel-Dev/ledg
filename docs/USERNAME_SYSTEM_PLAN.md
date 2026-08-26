# Username System — Design & Implementation Plan

## Overview

Every Ledg user gets a unique **`@username`** — a clean short handle used for space member invitations, profile identity, and future social features, removing the friction of typing full email addresses.

---

## Goals

1. Every user has a unique, lowercase `@username` (3–30 chars, `a-z`, `0-9`, `_` only).
   - **Invariant enforcement:** existing records created before this system may have no username. Ship a one-time migration that generates valid, collision-checked unique usernames for every user missing one (`filter: { username: { $exists: false } }`, idempotent, reuses `generateUsername`), plus a lazy backfill in profile resolution (`/me/profile` and auth-user resolution) as a safety net for anything the migration missed. New account-creation paths always allocate a username at insert time so the invariant can never regress.
2. **Email sign-up**: `@username` is a required field with real-time format + availability validation.
3. **Google OAuth**: Auto-generate from email prefix (`john@gmail.com` → `john`). Collision? Append 3 random digits (`john_742`). Changeable later via Profile.
4. **Profile Page**: Dedicated profile management in Settings — name, `@username`, email, provider, member since.
5. **Username search**: Used for space member invitations (`@username` chip lookup) instead of raw email.

### Authorized Username Lookup Contract

The availability endpoint (`GET /me/username/check`) answers `{ available: boolean }` for the caller's own handle choice; it is **not** an enumeration oracle and never resolves other users. Invitation flows resolve an `@username` to a target through a dedicated authenticated contract:

- `POST /api/v1/spaces/:id/members/resolve` — Owner of the space only.
  - Request: `{ username: string }`
  - Success response: `{ userId: string, username: string, name: string }` (no email — the owner confirms the handle, not the address).
  - Errors: `404` when no user holds the handle; `403` when the caller is not the space owner.
- The returned `userId` is passed to the invite flow, which sets `inviteeId` on the invitation (falling back to email-only invites with `inviteeId: null` when resolution fails).

---

## Data Model Changes

### `server/src/domains/users/model.ts`

```typescript
username: {
  type: String,
  unique: true,
  sparse: true,
  trim: true,
  lowercase: true,
  minlength: 3,
  maxlength: 30,
  match: /^[a-z0-9_]+$/,
}
```

```typescript
userSchema.index({ username: 1 }, { unique: true, sparse: true });
```

### `client/src/shared/types/index.ts`

```typescript
export interface User {
  id: string;
  betterAuthId: string;
  email: string;
  name: string;
  username: string | null;   // NEW
  fullName: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Typed Profile Response Contract

The profile endpoint returns its own contract — not the raw `User` type, whose fields don't match what `/me/profile` actually serves (`provider` and `joinedAt` have no `User` equivalent, and `createdAt`/`updatedAt` are not returned):

```typescript
export interface ProfileResponse {
  name: string;
  fullName: string;
  username: string | null;
  email: string;
  image: string | null;
  emailVerified: boolean;
  provider: string;      // "credential" | "google" | "unknown"
  joinedAt?: string;     // ISO timestamp of account creation; may be absent
}

// Success envelope
export type ProfileSuccess = { success: true; data: ProfileResponse };

// Error envelope (shared API error shape)
export type ProfileError = { success: false; message: string; errors?: string[] };
```

The endpoint implementation and all documentation reference this contract consistently.

---

## Username Auto-Generation for Google OAuth

In `upsertUserFromAuth` (`repository.ts`), for new OAuth users, generate a username at insert time:

```typescript
// Reuse the existing reserved-name validation (RESERVED_USERNAMES set) — do not duplicate rules
async function generateUsername(emailPrefix: string): Promise<string> {
  const sanitized = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24)
    .padEnd(3, "0");

  // Reserved names get an unreserved suffix at every stage of generation
  const ensureAllowed = (candidate: string) =>
    RESERVED_USERNAMES.has(candidate) ? `${candidate}_user` : candidate;

  const base = ensureAllowed(sanitized);

  // Try base username
  if (!await UserModel.exists({ username: base })) return base;

  // Try up to 10 times with 3-digit suffix — each candidate re-checked
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = ensureAllowed(`${base.slice(0, 24)}_${suffix}`);
    if (!await UserModel.exists({ username: candidate })) return candidate;
  }

  // Timestamp fallback — also checked against the reserved list
  return ensureAllowed(`${base.slice(0, 18)}_${Date.now().toString().slice(-6)}`);
}
```

This runs only via `$setOnInsert` so existing users are not affected.

**Race handling (mandatory):** existence checks are not atomic — two concurrent allocations can both pass the check for the same handle. The allocation flow must therefore:

1. Treat `generateUsername` as a proposal step only; uniqueness is enforced by the write.
2. Catch duplicate-key conflicts (`E11000`, key pattern `username`) from the upsert/insert, regenerate a fresh candidate, and retry allocation — bounded to a small attempt count (e.g. 5).
3. Apply the same catch-and-retry to the timestamp fallback path; it is checked and regenerated on collision like any other candidate.

```typescript
for (let attempt = 0; attempt < MAX_ALLOC_ATTEMPTS; attempt++) {
  const candidate = await generateUsername(emailPrefix);
  try {
    const user = await UserModel.findOneAndUpdate(filter, { $setOnInsert: { ...attrs, username: candidate } }, { upsert: true, new: true });
    return user;
  } catch (err) {
    if (err.code === 11000 && String(err.keyPattern ?? {}).includes("username")) continue;
    throw err;
  }
}
throw new Error("Failed to allocate a unique username");
```

---

## API Endpoints

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/api/v1/me/profile` | Full profile — returns the typed `ProfileResponse` contract (name, username, email, image, emailVerified, provider, joinedAt) |
| `GET` | `/api/v1/me/username/check?username=x` | Availability — `{ available: boolean }` |
| `PATCH` | `/api/v1/me/username` | Update username |
| `PATCH` | `/api/v1/me/profile` | Update name + username |
| `PATCH` | `/api/v1/me/email` | Change email. Sets `emailVerified: false` immediately and sends a verification link to the new address |

### Email Change Behavior
- **Re-verification state:** after a change, `emailVerified` is reset to `false`; sign-in continues with the password until re-verified.
- **Recovery:** if the new address is never verified, the user can still sign in and either re-request the verification email or change the address again; support-initiated recovery uses the previous address on record from the audit trail.
- Duplicate addresses are rejected with `409 Conflict`.

### Validation Rules
- Length: 3–30 characters
- Allowed: `a-z`, `0-9`, `_` (no spaces, hyphens, dots, uppercase)
- Unique (case-insensitive index)
- Reserved: `admin`, `ledg`, `api`, `me`, `null`, `undefined`, `support`

---

## Sign-Up Form (`client/src/pages/sign-up.tsx`)

Add `@username` field between "Full name" and "Email":

```
Full Name:  [ John Doe                    ]
Username:   [ @ | john_doe              ] ✅ Available
Email:      [ john@gmail.com             ]
Password:   [ ••••••••                   ]
```

- Format validated on every keystroke (regex, length).
- Uniqueness checked via debounced API call (500ms) — shows spinner → ✅ Available / ❌ Taken.
- **The selected `username` is included in the account-creation request itself** (`signUp.email({ name, email, password, username })`) and is persisted atomically as part of user creation before success is reported — availability between the check and the write is enforced by the unique index plus the duplicate-key regeneration/retry protocol above. A follow-up `PATCH /me/username` is **not** relied upon to persist the handle; it exists only as a best-effort reconciliation call for legacy clients. If the atomic creation fails due to a uniqueness race, the client surfaces "username taken" and re-validates — no partial account is left without its requested handle.

---

## Profile Management Sheet (Settings)

The "Edit Profile" button in Settings opens a full-featured sheet:

| Field | Editable |
|:------|:---------|
| Avatar (initials fallback) | View only |
| Full Name | ✅ |
| `@username` | ✅ (with availability check) |
| Email | ✅ (triggers re-verification) |
| Sign-in Provider | View only |
| Member Since | View only |

---

## UX Design Principles

1. **`@` prefix**: Non-removable `@` character shown as an input adornment (not part of stored value).
2. **Instant feedback**: Three states — 🔄 Checking / ✅ Available / ❌ Taken.
3. **Character counter**: `"john_doe"` → `8 / 30` shown subtly below input.
4. **OAuth hint**: First-time Google users see: *"We created @john_742 for you. You can change it anytime."*

---

## Implementation Milestones

1. `[server]` Add `username` + index to `UserModel`
2. `[server]` Implement `generateUsername()` in `repository.ts`, wire into `upsertUserFromAuth`
3. `[server]` Add `/me/profile`, `/me/username/check`, `PATCH /me/username`, `PATCH /me/profile` endpoints
4. `[shared]` Add `username` to `User` type + sync
5. `[client]` Update `api.ts` with new `me.*` calls
6. `[client]` Add `@username` field to Sign-Up form with debounced validation
7. `[client]` Build Profile Sheet in Settings page
8. `[client]` Expose `username` from `useAuth`
9. Typecheck + build
