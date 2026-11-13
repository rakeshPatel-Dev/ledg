# Dues Gaps & Shared-Space Deletion Plan

**Date:** 13 November 2026
**Status:** Proposed — confirm the decisions in §12 before implementation
**Scope:** Finish the practical dues gaps and make shared-space deletion safe.
**Related docs:** `DUES_FEATURE_PLAN.md`, `UI_UX_AUDIT.md` (D2, D4, D5, D7, D8, T6, T7), `SHARED_SPACES_AND_MEMBERS_PLAN.md`

---

## 1. What this plan fixes

| ID     | Gap                                                               | Outcome                                                                  |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **D2** | A due cannot be edited                                            | Edit person, amount, dates, note and payment method from due detail      |
| **D4** | Same-name people merge in the person view                         | Group by linked user → normalized phone → name, with a stable group key  |
| **D5** | “Set a repayment reminder” promises a reminder that is never sent | Truthful due-date copy that explains overdue flags, not reminders        |
| **D7** | Due detail does not show the ledger entries it created            | “Linked ledger entries” section with opening entry and settlements       |
| **T7** | Activity cannot link back to the due                              | A Due chip/deep link on loan entries; due-linked entries edited via Dues |
| **D8** | A due with settlements cannot be deleted                          | Delete with an explicit cascade warning and correct ledger cleanup       |
| **T6** | Shared-space deletion is one tap + a light confirm                | Overflow-menu only, type-to-confirm, export-first, correct cascade       |

**Supporting fix:** deleting a space must also remove its dues and settlements. Today it does not,
which leaves orphaned `Debt` / `DebtSettlement` documents and stale dues totals.
Account deletion has the same orphan problem; fix both through one helper.

### Explicitly out of scope

- **D3** — floating “I Lent / I Borrowed” buttons and desktop placement.
- **D6** — app-wide loan/direction colour semantics.
- **Real reminders** — no scheduler, cron or push/email job exists. The fix is copy, not a
  notification system.
- **Archive / cancel due** — this plan uses destructive delete with an explicit cascade.
- **Moving a due to another space**, or changing its direction after creation.
- **Linking a due to a Ledg user from the UI** — `linkedUserId` stays in the schema and is
  preserved, but is not exposed in this pass.
- Per-member dues breakdowns, custom categories, accounts/balances.

---

## 2. Current behaviour (verified against the tree)

| Area                        | Today                                                                                                                | File                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Due detail actions          | Record Settlement, Undo settlement, Delete only when `status === "open"` and no settlements                          | `client/src/components/dues/due-detail-sheet.tsx`                              |
| Due edit API                | None                                                                                                                 | `server/src/domains/dues/routes.ts`                                            |
| Due delete API              | Returns 409 if any settlement or `settledAmount > 0`                                                                 | `server/src/domains/dues/service.ts`                                           |
| Ledger backlink             | `Debt.transactionId` and `DebtSettlement.transactionId` point to transactions; transactions have no due backlink     | `server/src/domains/dues/model.ts`, `server/src/domains/transactions/model.ts` |
| Person grouping (server)    | Keyed by `counterparty.name.trim().toLowerCase()`                                                                    | `server/src/domains/dues/repository.ts`                                        |
| Person grouping (client)    | Same name-only key; expand state also keyed by name                                                                  | `client/src/pages/dues.tsx`                                                    |
| Reminder copy               | Placeholder says “Set a repayment reminder”; only the overdue badge exists                                           | `client/src/components/dues/create-due-sheet.tsx`                              |
| Loan transaction edit       | Client warns that the due will not update; server allows the edit                                                    | `transaction-form.tsx`, `transactions/service.ts`                              |
| Space deletion cascade      | Deletes transactions, cancels invitations, notifies members, then deletes every notification with `data.spaceId`     | `server/src/domains/spaces/service.ts`                                         |
| Space deletion notification | The `space_deleted` notification is created **before** `deleteNotificationsBySpace`, so members usually never see it | `server/src/domains/spaces/service.ts`                                         |
| Space delete client cache   | Invalidates spaces, transactions and dashboard; not dues or notifications                                            | `client/src/lib/queries.ts`                                                    |
| Space delete entry points   | Trash icon on every owned space card + overflow menu in space detail; both use a normal destructive button           | `client/src/pages/spaces.tsx`, `client/src/pages/space-detail.tsx`             |

---

## 3. Decisions

### 3.1 Delete due = destructive cascade

Deleting a due removes:

1. the due,
2. every settlement belonging to it,
3. every linked ledger entry (the opening principal entry and each settlement entry).

The confirmation must state the exact counts before the action. There is no archive or soft-delete
in this pass. This matches the selected scope and avoids adding a new lifecycle state.

### 3.2 Editing after settlements is allowed, with one hard guard

- The principal may be changed after a partial settlement.
- The new principal **must be ≥ the already-settled amount**. The server rejects lower values and
  tells the user to undo settlements first.
- If the new principal equals the settled amount, the due becomes `settled`.
- If it is above the settled amount, the due becomes `partially_settled` or `open` as appropriate.
- The UI shows a warning with the new remaining amount before saving.

### 3.3 The due is the source of truth for its ledger entries

Due edits update the linked opening transaction’s amount, date, payment method and note.
Settlement transactions are not edited by this form.

To keep the two views from drifting, **editing a dues-sourced transaction from Activity is blocked**
and redirected to the due. Deleting one is already blocked. This replaces the current “warn but
allow” behaviour.

### 3.4 Grouping key

Use the same helper on server and client:

```ts
getCounterpartyKey({ linkedUserId, phone, name }):
  1. linkedUserId  → "user:<id>"
  2. normalized phone (digits, last 10) → "phone:<digits>"
  3. normalized name (trim, collapse spaces, lowercase) → "name:<name>"
```

- `linkedUserId` wins because it survives a name or phone correction.
- `phone` wins over name when both are present.
- Same-name people with different phones become separate groups.
- Same-name people with no phone still merge; there is no identifier to separate them. This is
  acceptable and called out in the UI with the phone as a disambiguator when duplicate display names
  remain.

### 3.5 Reminder copy

The due date remains an overdue marker. No reminder is scheduled.

- Placeholder becomes **“When should it be repaid?”** (or “Pick a due date”).
- Helper text: **“Overdue dues are flagged on Home and Dues. Ledg does not send reminders yet.”**
- The same copy is used in create and edit modes.

### 3.6 Shared-space deletion confirmation

- Remove the trash icon from space cards. Deletion lives only in the space-detail overflow menu.
- Require typing the space name, exactly as the account-deletion flow does.
- Send `confirmName` to the server; the server validates it too. A missing or wrong name returns
  400 and deletes nothing.
- Show an **“Export CSV first”** action in the confirmation sheet, using the already-loaded
  space transactions. If transactions failed to load, disable export with an explanation.
- Copy distinguishes personal vs shared spaces. For shared spaces, state that every member loses
  access immediately.
- No re-authentication in this pass: Google OAuth users may not have a password to re-enter.
  Mention this as a future hardening option.
- Apply the same confirmation to personal spaces; deleting the only ledger is still destructive.

### 3.7 Space deletion cascade order

The order matters:

1. Set the `deleting` lease.
2. Delete transactions in the space.
3. Delete dues settlements, then dues, for the space.
4. Cancel outstanding invitations.
5. Delete existing notifications that reference the space.
6. Notify remaining members with `space_deleted`.
7. Delete the space.
8. Invalidate dashboard caches for the owner and all members.

Step 5 must come before step 6. Today it comes after, which deletes the notification that was just
created. If a later step fails, the lease is cleared and the owner can retry; on retry, old
notifications (including a previous `space_deleted`) are removed and members are notified again.

### 3.8 D3 and D6 stay out

Both are real, but they are visual/consistency work rather than data-integrity gaps. Keeping them out
keeps this pass testable. They can be a separate small UI pass.

---

## 4. Contracts and data model

Edit shared files in `client/src/shared/`; `npm run sync-shared` copies them to
`server/src/shared/`. Do not edit the server copy by hand.

### 4.1 Transaction gains an optional due backlink

`server/src/domains/transactions/model.ts`

```ts
dueId: {
  type: Schema.Types.ObjectId,
  ref: "Debt",
  default: null,
},
```

- Set it when creating the opening transaction and each settlement transaction.
- Do **not** accept it from client transaction input; it is server-owned.
- No new index in v1: Activity reads the field directly, and due detail fetches transactions by the
  ids already stored on `Debt` / `DebtSettlement`. If a future query filters by `dueId`, add
  `{ dueId: 1 }` then.
- Shared `Transaction` type gains `dueId?: string | null`.
- Legacy rows are filled by the backfill script in §7.

### 4.2 Due detail gains linked transactions

Shared `Debt` type:

```ts
linkedTransactions?: Transaction[];
```

`GET /dues/:id` attaches the opening transaction and all settlement transactions. List responses do
not attach them, so `GET /dues` stays cheap.

### 4.3 Person summary gains a stable key

Shared `PersonDuesSummary`:

```ts
key: string;
linkedUserId?: string | null;
```

`key` is the output of `getCounterpartyKey`. The client still builds its own groups from the due
list, but both sides now use the same helper and the same ordering rules.

### 4.4 New shared schemas

```ts
export const debtUpdateSchema = z.object({
  counterparty: z
    .object({
      name: z.string().trim().min(1).max(100),
      phone: z.string().trim().max(30).nullable().optional(),
      linkedUserId: z
        .string()
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/)
        .nullable()
        .optional(),
    })
    .optional(),
  principal: z.number().positive().optional(),
  date: dateStringSchema.or(z.date()).optional(),
  dueDate: dateStringSchema.or(z.date()).nullable().optional(),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
});

export const spaceDeleteSchema = z.object({
  confirmName: z.string().trim().min(1, "Type the space name to confirm"),
});
```

`debtUpdateSchema` deliberately omits `direction` and `spaceId`.

### 4.5 Shared helper

`client/src/shared/utils/index.ts`

```ts
export function getCounterpartyKey(person: {
  name: string;
  phone?: string | null;
  linkedUserId?: string | null;
}): string;
```

Also add a small display helper if useful:

```ts
export function getCounterpartyDisambiguator(phone?: string | null): string | null;
```

The latter returns the last four digits in a readable form, or `null`.

---

## 5. Phase 1 — Backend: dues

### 5.1 `PATCH /dues/:id`

Files: `dues/routes.ts`, `dues/controller.ts`, `dues/validator.ts`, `dues/service.ts`,
`client/src/lib/api.ts`, `client/src/lib/queries.ts`.

Request body: `DebtUpdateInput`.

Service rules:

1. Load the due by `{ _id, userId }`. 404 if missing.
2. Reject `principal` below `settledAmount` with a 400 that names the settled amount.
3. Recompute status when the principal changes:
   - `settledAmount >= principal` → `settled`
   - `settledAmount > 0` → `partially_settled`
   - otherwise → `open`
4. Preserve `linkedUserId` when the update does not provide it.
5. Update the due document.
6. Sync the opening transaction when it exists and `source === "dues"`:
   - `amount` ← new principal
   - `date` ← new due date
   - `paymentMethod` ← new payment method
   - `note` ← new note trimmed, or the default `Lent to X` / `Borrowed from X`
   - `category` and `type` stay unchanged because direction is immutable.
7. Invalidate the dashboard cache for the owner and space members.
8. Return the updated due with settlements.

Ordering note: update the due first, then the opening transaction. If the transaction write fails,
the due remains the source of truth and a retry re-syncs it. Do not use a Mongo transaction; the CI
Mongo service is standalone.

Error cases:

| Case                         | Response                                           |
| ---------------------------- | -------------------------------------------------- |
| Due not found / not owned    | 404                                                |
| Principal < settled amount   | 400 “Principal cannot be less than Rs. X settled”  |
| Invalid date / amount / enum | 400                                                |
| Empty body                   | 400                                                |
| Linked transaction missing   | Update due, log a warning, do not fail the request |

### 5.2 Delete with settlements

`DUES deleteDue` becomes:

1. Load the due by `{ _id, userId }`; 404 if missing.
2. Load all settlements for the due.
3. Collect transaction ids from the due and settlements.
4. Delete the settlement documents.
5. Delete the due document.
6. `deleteMany` the collected transaction ids.
7. Invalidate caches.
8. Return `{ id, deletedSettlements, deletedTransactions }`.

Order matters: document rows go first so a failed transaction cleanup leaves visible ledger rows the
user can delete, not a due pointing at missing entries. The transaction delete is idempotent and
skips missing ids.

No 409 for settlements anymore. The only guard is ownership.

### 5.3 Linked transactions in due detail

- Add `findTransactionsByIds(ids)` to `server/src/domains/transactions/repository.ts`, returning
  normal transaction DTOs (`id`, not `_id`).
- In `getDue`, collect the opening and settlement transaction ids, fetch them in one query, and
  attach them to the DTO.
- Preserve the order: opening entry first, then settlements newest-first (or match the settlement
  timeline order).

### 5.4 Server-side person grouping

`getDuesSummary`:

- Sort debts by `date: -1, _id: -1` so the most recent name/phone wins.
- Key the map with `getCounterpartyKey`.
- Store `key` and `linkedUserId` in each `PersonDuesSummary`.
- Keep the existing totals and rounding.

### 5.5 Transaction backlink writes

- `createDue`: add `dueId: debtDoc._id` to the opening transaction. Because the debt doc is created
  after the transaction today, either:
  - create the debt first with no `transactionId`, then create the transaction and update the debt,
    or
  - create the transaction, create the debt, then update the transaction with `dueId`.
    Prefer the second: it preserves the existing order and adds one small update.
- `settleDue`: set `dueId: debt._id` on the settlement transaction.
- `undoSettlement`: already deletes the linked transaction; no extra work.
- `deleteDue`: deletes all linked transactions.
- Space deletion: deletes all transactions, so no separate transaction cleanup for dues is needed.

### 5.6 Block editing dues-sourced transactions

`updateUserTransaction` in `server/src/domains/transactions/service.ts`:

- If `existingTxn.source === "dues"`, throw `ConflictError("This entry is linked to a due. Edit the due instead.")`.
- This matches the existing delete guard and makes the due the single source of truth.
- Add a regression test.

---

## 6. Phase 2 — Backend: space deletion

### 6.1 Confirm name

- `spaces/validator.ts` validates `spaceDeleteSchema`.
- `spaces/controller.ts` passes `confirmName` to the service.
- `spaces/service.ts` compares it to `space.name` case-insensitively after trimming. Mismatch → 400
  `"Type the space name to confirm deletion"`.
- Add `sensitiveActionLimiter` to the delete route.

### 6.2 Dues cascade

Add to `server/src/domains/dues/repository.ts`:

```ts
deleteSettlementsBySpace(spaceId): Promise<number>
deleteDebtsBySpace(spaceId): Promise<number>
deleteDuesBySpaceIds(spaceIds): Promise<{ debts: number; settlements: number }>
```

`deleteUserSpace` calls `deleteDuesBySpaceIds([spaceId])` after deleting transactions and before
deleting the space.

Also update `server/src/domains/users/repository.ts` account deletion: when deleting owned spaces,
call `deleteDuesBySpaceIds(ids)` alongside `TransactionModel.deleteMany`. This closes the orphan
hole for account deletion without changing its user-facing flow.

### 6.3 Notification ordering

Reorder `deleteUserSpace`:

```
delete transactions
delete dues
cancel invitations
deleteNotificationsBySpace(spaceId)   // old notifications, before the new one
notifyMembers(space_deleted)
delete space
invalidate caches
```

Keep the notification failure non-fatal: log it, still delete the space. The notification is a
courtesy; the deletion must not be blocked by a notification write.

### 6.4 Return shape

`deleteUserSpace` returns:

```ts
{
  id: string;
  deletedTransactions: number;
  deletedDebts: number;
  deletedSettlements: number;
  notifiedMembers: number;
}
```

The client only needs `id`, but counts make tests and logs useful.

---

## 7. Phase 3 — Migration / backfill

Scripts follow the existing `server/src/scripts/*` pattern and are safe to run more than once.

### 7.1 `backfill-transaction-due-links.ts`

1. Find debts with a `transactionId`.
2. For each, update the transaction `{ _id, source: "dues" }` with `dueId`.
3. Find settlements with a `transactionId`.
4. Update those transactions with `dueId`.
5. Use chunked `bulkWrite`, log updated/missing counts.

Run after deploying the model change, before relying on the Activity Due chip for old data.

### 7.2 `cleanup-orphan-dues.ts`

1. Find distinct `spaceId` values in `Debt` and `DebtSettlement`.
2. Check which spaces still exist.
3. Delete settlements and debts whose space is gone.
4. Log counts.

This cleans up data from spaces deleted before this fix. It is optional but recommended for any
environment that has already deleted a space with dues.

### 7.3 Rollout order

1. Deploy the additive schema (`dueId`) and API changes.
2. Run the two scripts.
3. Deploy the client.
4. Smoke-test create/edit/settle/delete due and delete space.

No downtime: `dueId` is optional and old clients simply omit the new UI.

---

## 8. Phase 4 — Client: dues

### 8.1 Shared due form (create + edit)

Refactor `client/src/components/dues/create-due-sheet.tsx` into a form that accepts an optional
`due`:

```ts
interface DueFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  due?: Debt | null; // present = edit
  defaultDirection?: DebtDirection;
  defaultPerson?: string;
  defaultPhone?: string;
  onSaved?: (due: Debt) => void;
}
```

- Keep `CreateDueSheet` as a thin wrapper so existing call sites do not all change.
- Edit mode initialises every field from the due.
- Edit mode replaces the direction toggle with a read-only “I lent / I borrowed” banner.
- Edit mode hides the space selector; space is immutable.
- Edit mode button reads “Save changes”; create mode keeps “Record Lending / Borrowing”.
- If `due.settledAmount > 0` and the amount changes, show an inline warning:
  “Rs. X is already settled. The remaining amount will become Rs. Y.”
- If the typed amount is below `settledAmount`, show a field error and disable submit.
- Send `linkedUserId: due.counterparty.linkedUserId ?? null` in edit mode so it is preserved.

### 8.2 Due detail actions

`client/src/components/dues/due-detail-sheet.tsx`:

- Add an **Edit** button (outline, pencil icon) in the actions area, available in every status.
- Keep **Record Settlement** when not settled.
- Keep **Delete** available in every status. Replace the toast confirm with an inline confirmation
  block:
  - “Delete this due?”
  - “This removes N settlements and N+1 linked ledger entries.”
  - If the due is in a shared space, add: “These entries are in a shared ledger; other members will
    lose them too.”
  - Buttons: `Keep` and `Delete due`.
- Add the linked-ledger section:
  - Heading “Linked ledger entries”.
  - One row per transaction: direction icon, “Opening entry” or “Settlement #n”, amount, date,
    payment method.
  - Each row has a “View in Activity” action that navigates to
    `/transactions?space=<spaceId>&txn=<transactionId>`.
  - If `linkedTransactions` is absent (older API response), hide the section rather than showing a
    misleading empty state.
- The edit action emits `onEdit(due)`; the page owns the edit sheet.

### 8.3 Dues page wiring and grouping

`client/src/pages/dues.tsx`:

- Add `editingDue` and `editOpen` state.
- `onEdit`: close detail, open the edit sheet with the due.
- `onSaved`: close edit, reopen detail for the updated due (optional but keeps context).
- Replace name grouping with `getCounterpartyKey`.
- Store `key`, `name`, `phone`, `linkedUserId` in each group.
- Key `expandedPeople` by group key, not lowercased name.
- Use `key={group.key}` and `togglePersonExpand(group.key)`.
- When two groups share a display name, show the phone/last-4 under the name (e.g.
  “Anita · …9841”) so the two groups are visually distinct.
- Read `?due=<id>` in the same way the page reads `?add=due`: open the due detail and remove the
  marker with `replace: true`.
- Add `useUpdateDue` and invalidate `["dues"]`, the individual due, spaces, transactions and
  dashboard.

### 8.4 API and hooks

`client/src/lib/api.ts`:

```ts
dues: {
  update: (id, data: DebtUpdateInput) =>
    request<{ due: Debt }>(`/dues/${id}`, { method: "PATCH", body: JSON.stringify(data) })
      .then((r) => r.due),
  // remove stays the same, but the response may now include counts
}
```

`client/src/lib/queries.ts`:

```ts
export function useUpdateDue() { ... }
```

Invalidation mirrors `useSettleDue`.

### 8.5 Reminder copy

In the shared form:

- `placeholder="When should it be repaid?"`
- Add helper text below the picker:
  “Overdue dues are flagged on Home and Dues. Ledg does not send reminders yet.”
- Keep the label “Due date” and the optional clear action.

---

## 9. Phase 5 — Client: Activity and space deletion

### 9.1 Activity Due chip and deep link

- `transaction-item.tsx`: when `transaction.source === "dues"`, render the existing Loan badge as a
  link/button when `dueId` exists:
  - label “Due”
  - `onClick` stops propagation and navigates to `/dues?due=<dueId>`
  - if `dueId` is missing, keep it as a non-interactive Loan badge.
- `useTransactionForm().openEdit`: if `transaction.source === "dues"`, do not open the edit form.
  - With `dueId`: navigate to `/dues?due=<dueId>`.
  - Without: navigate to `/dues`.
  - This covers Dashboard, Activity and Space detail because they all use the same `openEdit`.
- `server/src/domains/transactions/service.ts` blocks the actual update, so the redirect is not the
  only guard.
- Update the defensive banner in `transaction-form.tsx` to say the entry is managed by a due and
  must be edited from Dues.

### 9.2 Transactions page deep link

If we want “View in Activity” to open the exact row, add to `client/src/pages/transactions.tsx`:

- `useSearchParams`.
- On mount, `space` sets `spaceFilter`.
- When data is loaded, `txn` matches an item → `openEdit(item, item.spaceId)`.
- If the transaction is not on the current page, call a new
  `getApi().transactions.get(spaceId, id)` (`GET /spaces/:spaceId/transactions/:id`) and open it.
- Clear `txn` from the URL after opening.

This is a small addition and makes the due-detail link exact. If it causes layout/scroll churn
during implementation, fall back to opening Activity filtered by the space and leave the exact-row
link as a follow-up.

### 9.3 Space cards

`client/src/pages/spaces.tsx`:

- Remove the trash icon and the `Delete {space.name}` button from every space card.
- Keep the edit pencil.
- Remove the now-dead delete sheet, `deletingSpace` state, `handleDelete`, `deletingSummary`,
  `summaryFor` and the `useDeleteSpace` import if nothing else uses them.
- Space cards already navigate to the detail page, where deletion lives.

### 9.4 Space detail delete sheet

`client/src/pages/space-detail.tsx`:

- Keep the overflow menu entry “Delete Space” for owners.
- Add state `deleteConfirmName`.
- Sheet copy:
  - Personal: `This permanently deletes "{name}" and everything in it.`
  - Shared: `This permanently deletes "{name}" for all N members and removes everything in it.`
- Add a warning block with counts:
  - `N transactions`
  - `N dues and settlements` when known
  - “This cannot be undone.”
- Add **Export CSV first**:
  - calls the existing `handleExportCSV`
  - disabled when `transactionsUnavailable`
  - keeps the sheet open after export
- Add the type-to-confirm input:
  - label: `Type {space.name} to confirm`
  - `autoComplete="off"`, `autoCapitalize="none"`, `spellCheck={false}`
  - compare trimmed, case-insensitive
- Disable the destructive button until the name matches.
- Reset the input when the sheet closes or the space changes.
- On success: toast, close, navigate `/spaces`.
- On failure: toast the server message; keep the sheet open so the user can retry.

### 9.5 Client cache invalidation for space deletion

`useDeleteSpace`:

- Invalidate `["dues"]` (covers summary, list and individual due queries).
- Invalidate `["notifications"]`.
- Keep the existing spaces, transactions and dashboard invalidation.
- Remove the deleted space’s query and transaction-list queries optimistically as today.
- On error, restore the previous spaces and transaction lists.

### 9.6 Space delete API

`client/src/lib/api.ts`:

```ts
remove: (id: string, confirmName: string) =>
  request<{ id: string }>(`/spaces/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmName }),
  }).then((r) => r.id),
```

`useDeleteSpace` passes the typed name through the mutation variables.

---

## 10. Phase 6 — Tests

Server tests run against the existing Mongo test URI and Vitest setup.

### 10.1 `server/src/domains/dues/service.test.ts`

Setup: connect, drop DB, create a user and a personal space.

Cases:

1. **Edit basic fields** — counterparty name/phone, note, date, due date and payment method persist.
2. **Edit syncs the opening transaction** — amount, date, payment method and note change together.
3. **Principal below settled amount is rejected** — 400, due and transaction unchanged.
4. **Principal equal to settled amount** — status becomes `settled`.
5. **Principal above settled amount** — status becomes `partially_settled`; remaining recalculates.
6. **Edit after settlements keeps settlement amounts** — `settledAmount` does not change.
7. **Delete open due** — removes due and opening transaction.
8. **Delete partially settled due** — removes due, all settlements and all linked transactions.
9. **Delete settled due** — removes due, settlements and linked transactions.
10. **Delete leaves unrelated transactions alone**.
11. **Linked transactions in `getDue`** — opening and settlement entries are returned.
12. **Due-linked transaction update is blocked** — `ConflictError`.
13. **Summary grouping**:
    - same name + different phones → two entries
    - same phone formatted differently → one entry
    - same `linkedUserId` with different names → one entry
    - no phone → name fallback
14. **Stable keys** — `PersonDuesSummary.key` matches `getCounterpartyKey`.

### 10.2 `server/src/domains/spaces/service.test.ts`

Setup: owner, member, shared space, transactions, a due + settlement, an old notification with
`data.spaceId`, and a pending invitation.

Cases:

1. **Wrong confirm name** — 400, nothing deleted.
2. **Correct confirm name**:
   - space deleted
   - transactions deleted
   - debts and settlements deleted
   - invitations canceled / token cleared
   - old notifications with `data.spaceId` deleted
   - each remaining member has a new `space_deleted` notification
   - owner does not get `space_deleted`
   - dashboard cache invalidation called (or at least no error)
3. **Second delete** — 404.
4. **Notification failure does not block deletion** — mock/spy `notifyMembers` to reject; space is
   still deleted.
5. **Personal space deletion** — same cascade, no member notification.

### 10.3 Client verification

No client test runner is configured, so verify with:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual smoke script in §11.

If client tests are added later, cover `getCounterpartyKey` and the type-to-confirm comparison as
pure functions.

### 10.4 Commands

```bash
npm run sync-shared
npm run typecheck
npm run lint
npm test
npm run build
```

Targeted during development:

```bash
npm --prefix server test -- src/domains/dues/service.test.ts
npm --prefix server test -- src/domains/spaces/service.test.ts
```

---

## 11. Manual acceptance checklist

### Dues

- [ ] Create a due with a note and a due date.
- [ ] Open it, edit the person’s name and phone, save, reopen — values persist.
- [ ] Edit the amount before any settlement — Activity shows the new amount.
- [ ] Record a partial settlement, then edit the amount above the settled amount — warning shows the
      new remaining amount; save works.
- [ ] Try to edit the amount below the settled amount — inline error; save is disabled; server also
      rejects.
- [ ] Delete a due with two settlements — confirmation lists 2 settlements and 3 linked entries;
      after delete, Dues, Home and Activity no longer show any of them.
- [ ] Due detail lists the opening entry and both settlements; “View in Activity” opens the matching
      activity row.
- [ ] Activity shows a Due chip on loan entries; tapping it opens the due detail.
- [ ] Trying to edit a loan entry from Activity redirects to the due.
- [ ] Create a due — the due-date field no longer promises a reminder, and the helper text explains
      the overdue flag.

### Grouping

- [ ] Create two dues for two different “Anita” contacts with different phones — two person groups.
- [ ] Create two dues for the same phone with different formatting — one group.
- [ ] Collapse one group; the other group and the same-name group stay independent.

### Space deletion

- [ ] Space cards have no trash icon.
- [ ] Space detail overflow still offers Delete Space for the owner.
- [ ] Delete opens a sheet that requires typing the space name.
- [ ] The destructive button stays disabled until the name matches.
- [ ] “Export CSV first” downloads the full space (not just the filtered page) and keeps the sheet
      open.
- [ ] Wrong name typed → destructive button disabled; forced API call with wrong name → 400.
- [ ] Delete a shared space with transactions, a due and a settlement:
  - [ ] space disappears
  - [ ] transactions disappear
  - [ ] dues/settlements disappear
  - [ ] each member sees a “Space Deleted” notification
  - [ ] the owner does not
  - [ ] Home and Dues summaries refresh without a reload
- [ ] Delete a personal space — same cascade, no member notification.
- [ ] After deletion, navigating back to the old space URL does not resurrect it.

---

## 12. Decisions to confirm before coding

1. **Delete-due semantics**
   - Recommended: destructive cascade (due + settlements + linked ledger entries).
   - Alternative: archive/cancel the due and keep ledger history.

2. **Principal edits after settlements**
   - Recommended: allow, but reject a new principal below `settledAmount`.
   - Alternative: lock the principal once any settlement exists.

3. **Dues-linked transaction edits**
   - Recommended: block editing in Activity and redirect to the due.
   - Alternative: keep the current warn-but-allow behaviour and accept possible drift.

4. **D3 / D6**
   - Recommended: out of scope for this pass.
   - Alternative: include the floating-button refactor (D3) and/or the app-wide colour semantics
     pass (D6).

5. **Server-side name confirmation**
   - Recommended: require `confirmName` in `DELETE /spaces/:id` as well as the UI.
   - Alternative: UI-only guard.

6. **Account-deletion dues cleanup**
   - Recommended: include the small `deleteDuesBySpaceIds` call so account deletion does not create
     orphans.
   - Alternative: leave it for a separate cleanup pass.

---

## 13. Suggested implementation order

1. Shared types, schemas, helper, `dueId` model field.
2. Dues backend: update endpoint, delete cascade, linked transactions, grouping.
3. Dues tests.
4. Dues UI: shared form, edit wiring, detail actions, linked entries, grouping.
5. Activity Due chip + edit redirect + deep link.
6. Space deletion backend: confirm name, dues cascade, notification ordering.
7. Space deletion UI: remove card icon, type-to-confirm, export-first, cache invalidation.
8. Space tests.
9. Backfill/cleanup scripts and docs.
10. Full typecheck, lint, test, build and manual smoke.

This order keeps the API stable before the UI depends on it, and keeps the destructive space
changes last so they can be tested against real dues data.
