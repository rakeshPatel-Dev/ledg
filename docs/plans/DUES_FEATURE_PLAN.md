# Dues — Lend & Borrow Tracking Feature Plan

**Date:** August 2026
**Status:** Approved design — ready to build (queued behind Shared Spaces)
**Companion context:** `SHARED_SPACES_BUILD_PLAN.md` (notification infra reused later), `../quality/BUGS_AND_UPGRADES.md`

---

## 1. Problem statement

When you lend Ramesh Rs 5,000 from your wallet, cash goes **out** — but it is *not* an expense, and his repayment is *not* income. Forcing this into the existing `Transaction` model (expense/income) makes balances and analytics lie. Ledg needs first-class tracking of money owed **to** you and **by** you.

## 2. Finalized decisions

| # | Question | Decision |
|---|---|---|
| 1 | Relation to Transaction model | **Separate `Debt` entity** with its own domain + UI — never pseudo expense/income types |
| 2 | Counterparty identity | **Any contact** — free-text name (+ optional phone); `linkedUserId` reserved for future Ledg-account linking |
| 3 | Settlement effect on ledger | **Auto-create the matching cash transaction** so total balance stays truthful; flagged `source: "dues"` so analytics exclude it |
| 4 | Scope | **Personal-only v1** (per user); space-scoped dues revisit after Shared Spaces ships |

---

## 3. Data model (`server/src/domains/dues/model.ts`)

```ts
interface DebtDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;          // owner — personal-only in v1
  direction: "lent" | "borrowed";  // lent = someone owes me; borrowed = I owe them
  counterparty: {
    name: string;                  // required free text
    phone?: string;
    linkedUserId?: Types.ObjectId | null; // reserved — always null in v1
  };
  principal: number;               // > 0
  date: Date;                      // when the money moved
  dueDate?: Date | null;           // optional reminder target
  note?: string;
  status: "open" | "partially_settled" | "settled";
  settledAmount: number;           // denormalized sum of settlements
  createdAt: Date;
  updatedAt: Date;
}

interface DebtSettlementDoc {
  _id: Types.ObjectId;
  debtId: Types.ObjectId;
  userId: Types.ObjectId;          // denormalized owner for authz filters
  amount: number;                  // > 0, capped at remaining balance
  date: Date;
  paymentMethod?: PaymentMethod | null;
  note?: string;
  transactionId?: Types.ObjectId;  // backlink to the auto-created cash txn
  createdAt: Date;
}
```

Indexes:
- `{ userId: 1, status: 1 }` — list queries
- `{ userId: 1, "counterparty.name": 1 }` — per-person grouping
- Partial index on `{ userId: 1, dueDate: 1 }` where `status != "settled"` — overdue lookups

Shared zod schemas (`client/src/shared/schemas`, synced to server): `debtCreateSchema`, `settlementSchema`, `duesQuerySchema`. Add `source: z.enum(["manual", "dues"]).default("manual")` to the existing transaction schema.

### Status invariant
`status` and `settledAmount` are derived, kept correct by construction inside the settlement write path:
- Σ(settlements) === principal → `"settled"`
- 0 < Σ < principal → `"partially_settled"`
- Σ === 0 → `"open"`

A settlement that would exceed the remaining balance is rejected with 400 (client prefills remaining so this is a guard, not a UX feature).

---

## 4. The ledger-interaction design (the subtle part)

Repayments aren't income; repaying isn't spending. But wallet truthfulness requires the money movement to hit the balance. Resolution:

- Transactions gain `source: "manual" | "dues"` (default `"manual"`).
- **Balance-including queries** (`getSpaceSummary` totals → `totalBalance`, dashboard month in/out) treat both sources equally.
- **Analytics-excluding queries** (category breakdowns, insights/deltas, savings rate, recurring detection, payment-method breakdown) add `$match: { source: { $ne: "dues" } }` — or equivalently `source: "manual"`.

Result: Ramesh paying back Rs 5,000 raises your balance but never triggers *"You spent 30% less than last month"* nonsense.

### Auto-created transactions
| Debt direction | Settlement event | Created transaction |
|---|---|---|
| `lent` | counterparty repays me | `type: "income"`, category `"Due received"`, `source: "dues"` |
| `borrowed` | I repay counterparty | `type: "expense"`, category `"Due paid"`, `source: "dues"` |

The linked `transactionId` is stored on the settlement row.

### Undo semantics
Deleting a settlement also deletes its linked transaction (both in one unit of work / ordered idempotent steps). Settling is otherwise append-only — no editing of past settlements in v1 (keep history trustworthy).

---

## 5. API surface (`/api/v1/dues`, authenticated)

| Method & path | Purpose |
|---|---|
| `POST /dues` | Create due — `{direction, counterparty:{name, phone?}, principal, date, dueDate?, note?, paymentMethod?}` |
| `GET /dues` | List — filters `status`, `direction`, `person`; pagination; sorted by `date desc` |
| `GET /dues/:id` | Single due with its settlements |
| `POST /dues/:id/settle` | `{amount, date, paymentMethod?, note?}` — creates settlement (+linked txn), updates `settledAmount`/`status` atomically |
| `DELETE /dues/:id/settlements/:sid` | Undo settlement — removes it and its linked txn, recomputes status |
| `DELETE /dues/:id` | Delete due — only when unsettled, else 409 (avoid silent history loss) |
| `GET /dues/summary` | `{ owedToMe, iOwe, byPerson: [{name, net, direction}] }` |

All queries filter by `userId` (personal scope). Ownership checked on every mutation. Standard validators via shared zod schemas; invalid ObjectIds → 400 (same regex pattern as transactions).

---

## 6. UI/UX

### Dues page (new route `/dues`)
- Entry point in bottom nav / header alongside Activity
- Two tabs: **You're owed** · **You owe**
- Cards grouped **per person**, showing *net* outstanding when both directions exist with the same contact ("Sara — net Rs 2,000 you owe")
- Each card: person avatar-initials, principal, progress bar of settled vs remaining, due-date chip
- **Overdue styling**: red chip "12 days overdue" — computed live from `dueDate` vs today (no scheduler needed)

### Create sheet
Direction toggle (Lent / Borrowed) → contact name (+optional phone) → amount keypad (reuse transaction form's amount pad) → date (quick chips) → optional due date → optional payment method at origination → note → space selector (personal spaces only, v1).

### Settle sheet
- Prefilled remaining amount; quick chips (+500 / +1000)
- Date + method picker + optional note
- On full settlement → success toast "Due settled 🎉"-style confirmation, card moves to collapsed Settled section

### Due detail sheet
Principal, settlement history list (each with undo), edit note/due-date, delete (unsettled only).

### Dashboard widget
Compact card above recent activity: **"You're owed Rs 12,500 · You owe Rs 3,000"** — renders only when non-zero; taps through to `/dues`.

---

## 7. Reminders — honest scoping

No scheduler exists in the stack (decision #21 in the build plan killed cron). V1 overdue handling is computed live:
- Client badge on Dues tab + red overdue chips + dashboard nudge text ("2 dues overdue").

Future (after a scheduler exists for any reason): push-style notifications "Loan to Ramesh due tomorrow", riding the notification-center + preference toggles built for Shared Spaces. No model changes needed — `dueDate` is already indexed.

---

## 8. Implementation phases (~6–7 days)

| Phase | Work | Days |
|---|---|---|
| 1 | Models, shared schemas, sync-shared, indexes | 0.5 |
| 2 | Repository/service/routes incl. settlement↔transaction linking + undo | 1.5 |
| 3 | Analytics exclusion guards across all aggregate call sites | 1 |
| 4 | Dues page, create/settle/detail sheets, bottom-nav entry | 2 |
| 5 | Dashboard widget + overdue states | 0.5 |
| 6 | Tests + typecheck/lint/docs | 0.5–1 |

Suggested commit sequence:
```
feat(dues): debt and settlement models with ledger-linked statuses
feat(transactions): source flag separates dues transfers from manual entries
feat(dues): settle/undo flows creating linked cash transactions
fix(analytics): exclude dues transfers from insights, keep balances true
feat(client): dues page with per-person net view and settle sheets
feat(client): dashboard outstanding-dues widget
test(dues): settlement math, undo, and analytics exclusion suites
```

## 9. Test checklist (minimum)

- Settlement math: partial → partial_settled → exact-final-payment flips to settled; over-settle → 400.
- Undo: deleting a mid settlement recomputes status correctly; linked txn removed with it.
- Ledger: after lend + full repay, `totalBalance` returns to baseline; category breakdowns show zero dues noise; month in/out includes the movements.
- Authz: user B cannot read/settle/delete user A's dues (404).
- Edge: settle a settled due → 409; delete a partially-settled due → 409; counterparty name trimmed/case-preserved for grouping.

## 10. Explicitly out of v1

- Interest calculation
- In-app settle requests to linked Ledg users (`linkedUserId` stays null)
- Shared-space / group dues (post–Shared Spaces)
- Recurring loans / EMIs
- Push due-date notifications (needs a scheduler)
