# Ledg UI/UX Audit

**A user-centred review of the Ledg web app: what works, what gets in the way, and what to fix first.**

| | |
|---|---|
| **Review date** | 4 November 2026 |
| **Product** | Ledg, personal finance and shared-expense tracker |
| **Surfaces reviewed** | Home, Add/Edit transaction, Activity, Insights, Spaces, Space detail, Members, Dues, Create due, Due detail, Settle due, Settings, Profile, Notifications, Welcome, Sign in, Sign up, Invite |
| **Viewports** | 390 × 844 (primary mobile), 360 × 640 (small Android), 1280 × 900 (desktop) |
| **Themes** | Light and dark |
| **Data** | Seeded review account with 3 spaces, 58 transactions, 5 dues, notifications and pending invitations |
| **Method** | Full walkthrough of the running app with realistic data, paired with a screen-by-screen review of the rendered interface, copy and interaction behaviour, then source verification of every data and state claim |
| **Implementation status** | ✅ Items 1 (“Make the money truthful”), 2 (“Make failure visible”) and 3 (“Make the common path short”) of the priority list are implemented as of 7 November 2026. ◐ A few related findings are partly fixed; the rest are open. |

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Scope, method and how to read this](#2-scope-method-and-how-to-read-this)
3. [The priority list](#3-the-priority-list)
4. [Trust and data correctness](#4-trust-and-data-correctness)
5. [Navigation and information architecture](#5-navigation-and-information-architecture)
6. [Home](#6-home)
7. [Adding and editing transactions](#7-adding-and-editing-transactions)
8. [Activity](#8-activity)
9. [Insights](#9-insights)
10. [Dues and loans](#10-dues-and-loans)
11. [Spaces and members](#11-spaces-and-members)
12. [Settings, profile and authentication](#12-settings-profile-and-authentication)
13. [Notifications and feedback](#13-notifications-and-feedback)
14. [Accessibility](#14-accessibility)
15. [Visual design, dark mode and responsiveness](#15-visual-design-dark-mode-and-responsiveness)
16. [Copy, terminology and consistency](#16-copy-terminology-and-consistency)
17. [Empty, loading and error states](#17-empty-loading-and-error-states)
18. [What works well](#18-what-works-well)
19. [Recommended roadmap](#19-recommended-roadmap)
20. [How to validate the fixes](#20-how-to-validate-the-fixes)
21. [Appendix: screens and source references](#21-appendix-screens-and-source-references)

---

## 1. Executive summary

Ledg has a clear point of view. The green identity is confident, the rounded cards feel friendly, and the model of personal spaces, shared spaces and dues is more thoughtful than most expense trackers. The first impression is strong: this feels designed rather than assembled.

The problems start when a real person tries to use it for a week.

The biggest issue is **trust in the numbers**. Creating a due also creates a normal expense or income transaction. Lending money to a friend therefore appears as spending, borrowing appears as income, and settling a due creates another transaction in the opposite direction. A user who lends Rs. 5,000 sees their monthly spend rise by Rs. 5,000 even though no money was spent on goods or services. Budgets, category breakdowns, savings rate and the home dashboard all inherit the distortion. Across all time the two entries may cancel out, but the months in between are wrong, and the user is never told that a loan is being treated as spending. This is not a cosmetic bug. It makes the core promise of the product unreliable.

The second cluster is **core-flow friction**. Adding a transaction is a long scrolling sheet with the primary button at the very bottom, so the most frequent action in the app requires a scroll every time. Choosing “+ New space…” from inside that sheet closes it and throws away everything typed. Deleting a transaction is hidden behind a swipe with no visible affordance and no keyboard equivalent. Dues, one of the product’s differentiators, is missing from the bottom navigation entirely and has no active state when opened.

The third cluster is **clarity**. The home screen shows a large “Total Balance” without explaining what it includes. Insights opens “Custom” on a single day, producing an empty chart. The savings ring and its percentage describe the same thing, but the surrounding copy does not explain the formula. An expense decrease displays as a green upward arrow. The settings page is titled “You”, offers “Motion”, “Export Transactions (CSV)” and “Full Data Backup (JSON)” as peer-level items, and puts “Sign out” at the bottom of a long scroll. These are small individually; together they make the app feel like a prototype with a beautiful coat of paint.

There are also real accessibility gaps. Primary buttons use white text on a green that measures roughly **3.3:1**, below the 4.5:1 required for normal text. Hero subtext drops to about **2.3:1**. Bottom navigation labels are **8.8 px**. Dark mode keeps the bright green hero while flipping the foreground token to dark; the full-strength text passes, but the 70%-opacity subtext falls to about **4.2:1**, and the luminous green block is visually jarring against an otherwise dark interface. Motion defaults to “Full” and ignores the operating system’s reduced-motion preference until the user finds the setting.

None of this is fatal. Most fixes are layout, copy and state changes rather than a rebuild. But the order matters: **fix the numbers first, then the add-transaction flow, then navigation and dues, then polish.** A finance app gets one chance at being trusted.

### The verdict in one line

Ledg looks like a finished product and behaves like a promising beta: the visual identity is ahead of the interaction design, and the data model leaks into the UI in ways that make ordinary users doubt their own eyes.

---

## 2. Scope, method and how to read this

### What was reviewed

Every screen reachable by a signed-in user was walked through on a mobile viewport, then re-checked at 360 px and 1280 px and in both themes. Auth screens, the welcome screen, sheets, empty states and destructive flows were included. The review used realistic data: multiple spaces, a month of transactions, open and overdue dues, shared-space members and notifications.

The review covered:

- **Home** — hero balance, income/spend cards, dues summary, category and payment breakdowns, recent activity, empty state.
- **Transactions** — add, edit, repeat, delete, search, filters, day grouping, pagination, import and export entry points.
- **Activity** — list, search, type/space filters, day totals, pagination, empty and error states.
- **Insights** — period and space selectors, custom date range, income/expense cards, deltas, savings ring, trend chart, category breakdown, drill-down, recurring card.
- **Dues** — list, person grouping, filters, search, create, detail, settle, undo settlement, delete, overdue state.
- **Spaces** — list, filters, search, create/edit, budget progress, members, invitations, ownership transfer, leave/delete.
- **Settings and profile** — appearance, motion, notification preferences, export, import, legal, sign out, profile edit, password, email, delete account.
- **Auth and onboarding** — welcome, sign in, sign up, email verification, Google sign-in, invite preview and acceptance.
- **Notifications** — badge, list, unread state, mark all read, pending invitations, accept/reject.

### What was not reviewed

- Backend performance, database design and security.
- Email or push delivery.
- Real payment integrations.
- Screen-reader output on physical devices; accessibility findings are based on the rendered DOM, computed colours and visible behaviour.
- Long-term data migration.

### Severity scale

| Level | Meaning |
|---|---|
| **Critical** | Breaks trust in the numbers or can cause data loss. Fix before calling the product reliable. |
| **High** | Blocks or significantly slows a core task, or excludes a group of users. |
| **Medium** | Causes confusion, extra effort or a visibly unfinished feel. |
| **Low** | Polish, consistency and small delights. |

### Status markers

| Marker | Meaning |
|---|---|
| ✅ | Fixed in the working tree as of 7 November 2026 |
| ◐ | Partly fixed; the remaining work is noted in the finding |
| — | Open |

Each finding below includes what the user sees, why it matters, and a recommended fix. Screen names match the app’s own labels. Source references are collected in the appendix so the report stays readable.

### A note on evidence

Findings are based on the running app at 390 × 844, 360 × 640 and 1280 × 900, in light and dark mode, with the same seeded account. Where a claim depends on behaviour that is not visible in a screenshot — for example what happens on a failed request or after deleting a space — it was verified in the client and server source. The appendix lists the files and line ranges.

---

## 3. The priority list

The table below is the short version. Every row is expanded later.

| # | Severity | Finding | Area | Why it comes first |
|---|---|---|---|---|
| 1 | **Critical** | ✅ Lending and borrowing are written into the ledger as expense and income | Dues, Home, Insights | Every spending, income, budget and savings number becomes untrustworthy |
| 2 | **Critical** | ✅ Failed requests render as Rs. 0 or an empty state, not an error | Home, Insights, Spaces, Space detail | The user believes their money disappeared, or that they have none |
| 3 | **High** | ✅ “+ New space…” inside the transaction sheet discards the form | Add transaction | Loses typed data and interrupts the most common task |
| 4 | **High** | The primary action sits below a long scroll in the add sheet | Add transaction | Adds friction to every single entry |
| 5 | **High** | A signed-out invitee loses the invitation after sign-in or sign-up | Invite, Sign in, Sign up | Blocks the shared-space onboarding path |
| 6 | **High** | Dues is not a bottom-nav destination and has no active state | Navigation | A headline feature is effectively hidden |
| 7 | **High** | The global “+” adds to Personal, even while viewing another space | Space detail, Navigation | Transactions land in the wrong space |
| 8 | **High** | Primary and hero text fail contrast; nav labels are 8.8 px | Accessibility | Core labels are hard to read for low-vision users |
| 9 | **High** | Space cards are mouse-only; swipe-to-delete has no keyboard path | Spaces, Activity | Keyboard and switch users cannot open or delete |
| 10 | **High** | ✅ “Total Balance” has no definition and ignores money owed | Home | The headline number is not a balance of anything recognisable |
| 11 | **High** | Motion defaults to Full and ignores the OS reduced-motion setting | Settings, Accessibility | Motion-sensitive users are exposed before they can opt out |
| 12 | **High** | “Invitations sent” is shown even when invites fail | Create space | The user believes people were invited when they were not |
| 13 | **High** | The default Personal space reappears after deletion | Spaces | The user cannot remove a space they deleted |
| 14 | **High** | Bulk import has no undo | Import | One mistaken file can create dozens of records with no rollback |
| 15 | **Medium** | Expense decreases show a green upward arrow | Insights | A correct number is read as the opposite trend |
| 16 | **Medium** | Desktop is a 448 px phone column in a 1280 px canvas | Layout | The app looks unfinished on laptop and tablet |
| 17 | **Medium** | Custom range opens on a single day and often empties the page | Insights | The user thinks there is no data |
| 18 | **Medium** | Validation is delivered as a toast, not beside the field | Add/Edit, Auth | Errors are easy to miss and hard to correct |

### The order to fix things

1. ✅ **Make the money truthful.** Separate loan principal and settlement cash-flow from spend/income, or label the ledger entries explicitly and exclude them from budgets and savings. Then define Total Balance.
2. ✅ **Make failure visible.** Add error states with retry to every query-backed screen. Never substitute zero for unknown.
3. ✅ **Make the common path short.** Sticky primary action in the add sheet, no data-losing branch, inline validation, and a visible delete alternative.
4. **Make navigation honest.** Put Dues in the bottom nav or make the header entry persistent, give every route an active state, and make “+” context-aware.
5. **Make it accessible.** Fix contrast, label sizes, keyboard access, reduced motion and tap targets.
6. **Then polish.** Desktop layout, copy, empty states, animation restraint.

---

## 4. Trust and data correctness

These are the findings that decide whether a user keeps using Ledg. They are not visual bugs; they change what the numbers mean.

### ✅ T1 · Lending money is recorded as spending, borrowing as income

**Severity:** Critical · **Screens:** Create due, Dues, Home, Activity, Insights, Space detail

**Status:** ✅ Fixed — dues-linked rows are excluded from every P&L total, budget and savings aggregate. Activity labels them “Loan in” / “Loan out”. Existing rows already carry `source: "dues"`, so no data migration was needed. The internal “Due paid” / “Due received” categories are hidden from manual entry so new rows cannot be misclassified.

**What the user sees.** The create-due sheet says, in small text under the direction toggle, “They owe you · creates an expense transaction” or “You owe them · creates an income transaction” (`client/src/components/dues/create-due-sheet.tsx:210`). After saving, a new transaction appears in Activity with the category “Due paid” or “Due received”. The Home “Spent” figure and the space budget both move. Settling the due later creates the reverse entry — income for a lent due, expense for a borrowed one (`server/src/domains/dues/service.ts:187-245`).

**Why it matters.** Lending Rs. 5,000 is not spending Rs. 5,000 on goods or services. It is an exchange of cash for a receivable. Recording it as an expense:

- inflates the month’s spending and the category breakdown;
- consumes the space’s monthly budget;
- lowers the savings rate;
- makes “Spent” on Home disagree with what the user believes they spent;
- creates a second, opposite distortion in the month the loan is repaid.

Across all time the entries may cancel, but monthly and period views do not. A user who lends in January and is repaid in March sees January as a bad month and March as an unusually good one. The same happens in reverse for borrowing. Because the due itself is also tracked on the Dues page, the same event exists in two places with two different meanings.

**Recommended fix.** Choose one model and make it explicit.

- **Preferred:** keep dues out of the spend/income ledger. Track principal and settlements as balance-sheet movements, and show them in a separate “Loans” section of Activity. If cash-flow visibility is needed, add a distinct `transfer` or `loan` transaction type that is excluded from spend, income, budgets, category breakdowns and savings rate.
- **If the current model stays:** rename the categories to “Loan out” and “Loan in”, exclude them from every spending and income aggregate by default, and add an explanatory banner on Home and Insights: “Loans are not counted as spending.”
- **Migration:** existing “Due paid” / “Due received” transactions need to be reclassified, not left to distort historical reports.

**Source.** `server/src/domains/dues/service.ts:91-160` (create), `:187-267` (settle), `:269-316` (undo), `:318-345` (delete); `server/src/domains/analytics/service.ts:463-465`; `client/src/components/dues/create-due-sheet.tsx:210`.

---

### ✅ T2 · “Total Balance” is an undefined all-time net, not a balance

**Severity:** High · **Screen:** Home, Space detail

**Status:** ✅ Fixed — the Home hero is now “Net saved”, captioned “All-time income minus spending” and marked “Excl. loans”. The dues summary card directly below it shows what is owed each way, so the hero is not read as available money. Space cards and the space detail hero use “Net saved” with a formula tooltip.

**What the user sees.** A large number under the label “Total Balance”, with an “Active” pill beside it. In the review data it reads **Rs. 120,400**, while the same hero shows **Rs. 127.4K** income and **Rs. 81.8K** spent this month. There is no caption, tooltip or breakdown explaining the relationship.

**Why it matters.** The number is computed as all-time income minus all-time expense across every space (`server/src/domains/analytics/service.ts:463`). It is not a bank balance, not this month’s surplus, not net worth, and it does not subtract money the user owes or add money owed to them. Borrowing Rs. 10,000 raises it by Rs. 10,000 because the borrow is recorded as income; the corresponding liability is invisible. Lending lowers it. A user cannot answer “am I doing okay?” from this number, and may make decisions on a figure that excludes their largest obligations.

**Recommended fix.** Rename it to what it is — “All-time net” or “Income minus spending” — and add a one-line caption with the date range and the spaces included. Better: replace it with a real position summary: cash balance (if accounts exist), receivables, payables, and net. At minimum, show “Owed to you” and “You owe” beside it so the number is not read as available money.

**Source.** `client/src/pages/dashboard.tsx:93-104`; `server/src/domains/analytics/service.ts:463-465`.

---

### ✅ T3 · A failed request looks like Rs. 0 or an empty account

**Severity:** Critical · **Screens:** Home, Insights, Spaces, Space detail

**Status:** ✅ Fixed — Home, Insights, Spaces, Space detail and Dues now branch on `isError` and render a shared `ErrorState` with a human-readable message and “Try again”. Activity’s existing error state gained a retry. Partial failures are shown inline without hiding successful data: spaces still render when balances fail, the summary still renders when recurring analytics fail, and members/invitations have their own retry. A global offline banner appears in the app shell. Transport, HTML and stack-trace messages are replaced with plain language, and the original error is reported to Sentry when configured.

**What the user sees.** If the dashboard, analytics or spaces request fails, the page does not show an error. Home renders **Rs. 0**, “Rs. 0” income and spend, and an empty-state card inviting the user to add their first transaction (`client/src/pages/dashboard.tsx:104,120,137,166-178`). Insights renders zeros and “No data for this period” (`client/src/pages/analytics.tsx:203-207,341-350`). Spaces renders “No spaces yet” and a create button. Space detail can render an empty transaction list and a zero balance, or a “space does not exist” state, depending on which request failed.

**Why it matters.** A finance app must never confuse “unknown” with “zero”. A user on a flaky connection sees their history vanish and may start re-entering data, create a duplicate space, or panic. The Activity page already shows a real error message instead of zero (`client/src/pages/transactions.tsx:241-252`), which proves the pattern exists; it lacks a retry and is not applied consistently elsewhere.

**Recommended fix.** Every query-backed screen should have three explicit states: loading skeleton, error with a human-readable message and “Try again”, and empty only when the request succeeded with zero records. Never use `?? 0` for a failed query. Add a global offline banner. Log the error for support, but do not show a raw stack trace.

**Source.** `client/src/pages/dashboard.tsx:104`; `client/src/pages/analytics.tsx:203-207`; `client/src/pages/spaces.tsx:59`; `client/src/pages/space-detail.tsx:194`; contrast with `client/src/pages/transactions.tsx:241-252`.

---

### T4 · Deleting the default Personal space recreates it

**Severity:** High · **Screen:** Spaces

**What the user sees.** The user deletes “Personal”, confirms the destructive sheet, sees “Deleted ‘Personal’”, and the card disappears. On the next spaces fetch — navigating away and back, or reloading — “Personal” is back, empty, with a zero balance.

**Why it matters.** The app is fighting the user. It looks like the delete failed, or like the data came back. Users who prefer a single named space, or who want to start clean, cannot get rid of the default. The behaviour also makes the “Personal (1)” filter count unreliable.

**Recommended fix.** Create the default space once, at onboarding, and never recreate it automatically after an explicit delete. If the product requires at least one space, prevent deleting the last one with a clear message (“You need at least one space. Create another before deleting this one.”) rather than silently resurrecting it. Alternatively, allow zero spaces and show a first-run create flow.

**Source.** `server/src/domains/spaces/service.ts:75-83` calls `ensureDefaultSpace` on every `getUserSpaces`; `server/src/domains/spaces/repository.ts:171-215` creates “Personal” when none exists.

---

### T5 · Bulk import has no undo

**Severity:** High · **Screen:** Import transactions

**What the user sees.** A preview with file name, date range, row count and skipped-row errors, a “Skip duplicates” toggle, and an “Import N transactions” button. After import, a result card shows how many were imported, skipped and failed, with “Done” and “Import another file”. There is no undo, no recent-import history and no way to identify the batch afterwards.

**Why it matters.** A wrong file, wrong destination space, or wrong date mapping can create hundreds of records in one tap. The only recovery is to find and delete each transaction manually. The preview is good, but it is not a substitute for reversibility. This is especially risky because the import can also create spaces automatically (`server/src/domains/import/service.ts:136-147`).

**Recommended fix.** Record an import batch ID and offer “Undo this import” for a limited window (or permanently, from Settings). Show the destination space and a sample of the first rows in the preview. If undo is too large a change, require an explicit confirmation that names the count and destination, and add a “Review imported transactions” link that filters Activity to the batch.

**Source.** `client/src/components/settings/import-transactions-sheet.tsx:106-135,338-402`; `server/src/domains/import/service.ts:97-266`.

---

### T6 · Deleting a shared space is permanent for everyone, with a light confirmation

**Severity:** High · **Screen:** Space detail, Spaces

**What the user sees.** A trash icon on the space card or “Delete Space” in the overflow menu. The confirmation sheet explains that the shared space and all transactions will be removed for all members (`client/src/pages/spaces.tsx:722-730`). The confirm button is a normal destructive button; there is no typing of the space name and no second factor.

**Why it matters.** This is the most destructive action in the product. A mis-tap on a small trash icon next to the edit pencil can erase a household’s entire history. The copy is honest, but the interaction is not proportionate. Members lose data they did not choose to delete, and there is no export prompt first.

**Recommended fix.** Remove the delete icon from the card; keep deletion inside the space’s overflow menu. Require typing the space name (as the account-deletion flow already does) and offer “Export this space first” in the confirmation. For shared spaces, consider requiring owner re-authentication.

**Source.** `client/src/pages/spaces.tsx:485-506,722-745`; `client/src/pages/space-detail.tsx:480-500`; `server/src/domains/spaces/service.ts:118-165`.

---

### ◐ T7 · Dues-linked transactions are invisible as dues in Activity

**Severity:** Medium · **Screens:** Activity, Dues detail

**Status:** ◐ Partly fixed — Activity shows “Loan in” / “Loan out” with a Loan badge. Editing warns that the due will not be updated, and deleting is blocked with a “Go to Dues” action (also enforced server-side). Still open: a direct link to the due and a list of linked ledger entries in due detail.

**What the user sees.** A transaction row with the category “Due paid” or “Due received”, a note such as “Lent to Anita Gurung”, and no link back to the due. The due detail sheet shows the principal, settlements and remaining amount, but not the ledger entries it created. Nothing in Activity says “this came from a due” beyond the category name.

**Why it matters.** When the user tries to reconcile the two views, they cannot. Editing or deleting the transaction directly can desynchronise it from the due, and the due detail gives no warning that a linked transaction exists. The relationship is the source of the confusion in T1, and the UI hides it.

**Recommended fix.** Add a small “Due” chip and a link to the due on every linked transaction. In due detail, list the linked entries with their dates and amounts. If the user edits or deletes a linked transaction, warn that the due will not be updated, or block the action and direct them to the due.

**Source.** `server/src/domains/dues/service.ts:108-128,221-240`; `client/src/components/transactions/transaction-item.tsx`; `client/src/components/dues/due-detail-sheet.tsx`.

---

### T8 · The currency is fixed, with no setting or explanation

**Severity:** Medium · **Screens:** Everywhere amounts appear

**What the user sees.** “Rs.” everywhere, including the amount input, quick-add chips, CSV export and the seeded demo data. There is no currency setting in Settings.

**Why it matters.** Ledg is a web app; users may live outside Nepal, keep accounts in another currency, or travel. A finance app that cannot display the user’s currency feels local-only, and mixed-currency users have no path at all. At minimum, the assumption should be stated.

**Recommended fix.** Add a currency setting (symbol, code, locale) in Settings, default it from the browser locale, and use it in every formatter, export and empty state. If multi-currency is out of scope, say “Amounts are in NPR” in Settings and the welcome screen.

**Source.** `client/src/lib/format.ts`; `client/src/components/transactions/transaction-form.tsx:305`; `client/src/components/dues/create-due-sheet.tsx:153`; `client/src/pages/settings.tsx`.

---

## 5. Navigation and information architecture

### N1 · Dues is missing from the bottom navigation

**Severity:** High · **Screens:** All signed-in screens, Dues

**What the user sees.** The bottom bar has four destinations — Home, Activity, a central “+”, Spaces, Insights — and no Dues. Dues is reachable from a green “Dues” pill in the Home header (`client/src/components/layout/header.tsx:38-53`) and from the dues summary card on Home, which disappears when there are no dues. On Activity, Insights or Spaces, there is no Dues entry at all. When the user does reach `/dues`, no bottom-nav item is highlighted.

**Why it matters.** Dues is one of the product’s differentiators, and it is treated as a secondary screen. A new user who lands on Activity and wants to record a loan has to know to go Home first. The missing active state makes the app feel like it has lost its place.

**Recommended fix.** Make Dues a first-class destination. Either replace one of the four tabs (Insights is the least frequently used for a new user) or move the central “+” to a floating action and use five tabs: Home, Activity, Dues, Spaces, Insights. Add an overdue badge to the Dues tab. At minimum, keep a persistent Dues link in a shared header on every tab and mark `/dues` active.

**Source.** `client/src/components/layout/bottom-nav.tsx:22-28,91-128`; `client/src/components/layout/header.tsx:38-53`.

---

### N2 · The global “+” ignores the space you are looking at

**Severity:** High · **Screens:** Space detail, Dues, Activity, Insights

**What the user sees.** While viewing “Demo · Goa Trip”, the user taps the large central “+” in the bottom nav. The add sheet opens with the space preselected to “Personal” (the first personal space), not Goa Trip. The transaction is saved to Personal. The same “+” on the Dues page opens a transaction form, not a due form, even though the page’s own floating buttons say “I Lent” and “I Borrowed”.

**Why it matters.** This is a silent wrong-destination error. The user sees the correct space name on screen, taps the most prominent action, and files the expense in the wrong place. Budgets and space balances then disagree with what the user intended. On Dues, the two competing “add” models (central + vs two floating buttons) make the page feel unpredictable.

**Recommended fix.** Make the central “+” context-aware: on a space detail, preselect and lock that space; on Dues, open the create-due sheet (or show a small chooser: “Transaction” / “Due”); elsewhere, use the last-used space or Personal with a visible space chip. Never silently default to a different space than the one on screen.

**Source.** `client/src/lib/transaction-form.tsx:38-44` (defaults to Personal); `client/src/components/layout/bottom-nav.tsx:34-37`; `client/src/pages/space-detail.tsx:708-720`; `client/src/pages/dues.tsx:485-510`.

---

### N3 · Secondary screens have no active navigation state

**Severity:** Medium · **Screens:** Dues, Settings, Profile, Notifications

**What the user sees.** On Dues, Settings and Profile, every bottom-nav item is inactive. The nav still works, but nothing tells the user where they are. On Settings and Profile, the bottom nav is present even though these are account screens reached from the avatar; the avatar itself has no selected state.

**Why it matters.** Active state is the cheapest orientation cue in a mobile app. Its absence makes deep screens feel like dead ends and weakens the mental model of the five main areas.

**Recommended fix.** Define the nav model: either these are modal/secondary screens (hide the bottom nav and show a back button) or they are part of Home (keep Home active). Do not show a nav with nothing selected. If Dues becomes a tab, this resolves itself for Dues.

**Source.** `client/src/components/layout/bottom-nav.tsx:91-128`; `client/src/pages/dues.tsx`; `client/src/pages/settings.tsx`; `client/src/pages/profile.tsx`.

---

### N4 · Desktop is a phone column in a large empty canvas

**Severity:** High · **Screens:** All

**What the user sees.** At 1280 × 900, the app is a single `max-w-md` (448 px) column centred in the viewport. The bottom navigation remains a floating phone tab bar pinned to the bottom of the browser window. Cards, sheets and the dues floating buttons stay mobile-sized. The right and left thirds of the screen are empty background. The fixed dues buttons sit at the viewport’s right edge, far from the app column.

**Why it matters.** Ledg is a web app, and many users will open it on a laptop to review a month or import a CSV. The current layout wastes the screen, makes tables and lists unnecessarily narrow, and looks like a mobile preview rather than a product. The detached floating buttons are especially confusing on desktop.

**Recommended fix.** Add a responsive shell: a persistent left sidebar or a top navigation at `md` and above, a content max-width of 960–1200 px, and multi-column layouts for Home and Insights. Convert bottom sheets to centred dialogs or side panels on desktop. Anchor floating actions to the content column, not the viewport. Keep the mobile layout as the small-screen case.

**Source.** `client/src/components/layout/app-shell.tsx:11`; `client/src/components/layout/bottom-nav.tsx:43`; `client/src/pages/dues.tsx:485`.

---

### N5 · Back always goes to the Spaces list, not where the user came from

**Severity:** Medium · **Screen:** Space detail

**What the user sees.** The “Back” control in a space detail always navigates to `/spaces`, regardless of whether the user arrived from Home, a notification, an invite acceptance or a search result. Filters and scroll position on the previous screen are lost.

**Why it matters.** Users who open a space from a notification or a filtered list are sent somewhere they did not come from, then have to navigate again. On mobile, the system back gesture may behave differently from the in-app Back, which is disorienting.

**Recommended fix.** Use history-aware back (`navigate(-1)`) when there is history, with `/spaces` as the fallback for direct links. Preserve list filters in the URL so returning restores them.

**Source.** `client/src/pages/space-detail.tsx:421-430`.

---

### N6 · Creation actions are duplicated and inconsistent

**Severity:** Medium · **Screens:** Spaces, Dues, Home

**What the user sees.** On Spaces, a “New space” button sits at the top right, while a floating “+” at the bottom adds a transaction. On Dues, two floating buttons (“I Lent”, “I Borrowed”) duplicate the same actions already offered in the empty state. On Home, the central “+” and the “Add your first transaction” empty-state button do the same thing.

**Why it matters.** Two plus-shaped controls that do different things is a classic source of mis-taps. The floating dues buttons also cover the last row of the list on a small screen. Duplication is not inherently bad, but the actions need distinct labels and placement.

**Recommended fix.** Use one primary creation action per screen with an explicit label. On Spaces, make the floating action “New space” and keep transaction creation in the global “+”. On Dues, replace the two floating buttons with a single “Add due” button that opens the direction choice, or keep the two but hide them when the empty-state buttons are visible. Reserve the centre “+” for “Add transaction” everywhere.

**Source.** `client/src/pages/spaces.tsx:260-270`; `client/src/pages/dues.tsx:346-366,485-510`; `client/src/components/layout/bottom-nav.tsx:34-37`.

---

### N7 · The avatar goes to Settings, not Profile

**Severity:** Low · **Screens:** Home header, Settings, Profile

**What the user sees.** Tapping the avatar and greeting opens `/settings`, titled “You”. The actual profile editor is one more tap away through the user card. There is no “Profile” item in the bottom nav.

**Why it matters.** Users expect the avatar to open their profile. Sending them to a settings page that happens to contain a profile card adds a step and blurs the distinction between “me” and “app settings”.

**Recommended fix.** Either rename Settings to “Profile & settings” and keep the current destination, or send the avatar to `/profile` and put a gear icon in the header for Settings.

**Source.** `client/src/components/layout/header.tsx:21-35`; `client/src/pages/settings.tsx:103-120`.

---

### N8 · Overdue dues are only visible on Home

**Severity:** Medium · **Screens:** Home, Dues, other tabs

**What the user sees.** The Home header’s Dues pill shows a pulsing red count when something is overdue (`client/src/components/layout/header.tsx:44-51`). Once the user leaves Home, there is no badge anywhere — not on the bottom nav, not on Activity, not on Spaces.

**Why it matters.** Overdue money is time-sensitive. A user who spends the session in Activity or Insights never sees the reminder. The pulsing badge is also easy to miss because it is attached to a small pill.

**Recommended fix.** If Dues becomes a bottom-nav tab, put the overdue badge there. Otherwise, add a global badge to the header on every tab, or a small banner on Home that persists until the dues are settled. Avoid an infinite pulse; use a static badge after the first view.

**Source.** `client/src/components/layout/header.tsx:38-53`; `client/src/components/layout/bottom-nav.tsx`.

---

## 6. Home

### H1 · Amounts are abbreviated, so the headline number is imprecise

**Severity:** Medium · **Screen:** Home

**What the user sees.** The hero shows “Rs. 120,400” for Total Balance but “127.4K” for income and “81.8K” for spend. Category rows show exact amounts, so the page mixes precision levels. There is no way to tap a compact number to see the exact value.

**Why it matters.** In a finance app, “127.4K” is a summary, not an amount. Users comparing a bank statement or a payslip need the exact figure. The mixed precision also makes the hero look inconsistent.

**Recommended fix.** Show exact amounts in the hero cards, or make compact values expandable on tap with a tooltip (“Rs. 127,400”). Keep compact formatting only in charts and space cards where space is genuinely tight.

**Source.** `client/src/pages/dashboard.tsx:120,137`; `client/src/lib/format.ts`.

---

### H2 · The category section has no title, period or total

**Severity:** Medium · **Screen:** Home

**What the user sees.** A segmented control switching between “Expense” and “Income”, followed by up to four category rows with coloured dots, amounts and bars. There is no heading, no “this month” label, no total, and no “See all” link.

**Why it matters.** The bars are scaled to the largest category, not to total spending, so a 100% bar does not mean 100% of spend. Without a period label, the user cannot tell whether this is this month, this space or all time. Without a total, the rows do not add up to anything recognisable.

**Recommended fix.** Add a heading (“Spending by category · this month”), show the total, label the bar as a share of total (not of the maximum), and add “See all” to Insights. If the section is intentionally a top-four preview, say so.

**Source.** `client/src/pages/dashboard.tsx:180-244`.

---

### H3 · Home has no month navigation

**Severity:** Medium · **Screen:** Home

**What the user sees.** Income and spend are always “this month”. There is no previous/next month control, no month picker, and no way to see last month from Home. Insights has a period selector, but Home does not.

**Why it matters.** The most common review question — “how did last month go?” — cannot be answered from the home screen. Users must go to Insights and re-learn a different selector.

**Recommended fix.** Add a compact month switcher in the hero (“November 2026” with chevrons) and keep the selected month in the URL. Alternatively, make the “this month” labels tappable and link to Insights with the month preselected.

**Source.** `client/src/pages/dashboard.tsx:90-144`; `client/src/pages/analytics.tsx:250-275`.

---

### H4 · Recent activity inherits the hidden swipe-to-delete gesture

**Severity:** Medium · **Screen:** Home

**What the user sees.** The “Recent activity” list uses the same swipeable rows as Activity. A horizontal swipe reveals a red delete panel; a tap opens the edit sheet. There is no visible menu, trash icon or hint.

**Why it matters.** On the home screen, users are most likely to be scanning, not managing. An accidental horizontal drag can start a delete gesture. The only way to discover deletion is to try it or read the code.

**Recommended fix.** Add a visible overflow menu (three dots) on each row with “Edit” and “Delete”, and keep swipe as an optional shortcut with an undo toast. Do not make swipe the only path.

**Source.** `client/src/pages/dashboard.tsx:323-350`; `client/src/components/transactions/swipeable-transaction-item.tsx:28-75`.

---

### ✅ H5 · “Active” is unexplained

**Severity:** Low · **Screen:** Home

**Status:** ✅ Fixed — “Active” is replaced by “Excl. loans”, with a tooltip explaining that loan principal and settlements are tracked separately.

**What the user sees.** A small pill reading “Active” next to “Total Balance”. It does not change, is not tappable and has no tooltip.

**Why it matters.** It reads like a status of the account or the balance, but it is decorative. In a finance context, an unexplained status label erodes confidence.

**Recommended fix.** Remove it, or replace it with something meaningful: “All spaces”, “Updated just now”, or the selected month.

**Source.** `client/src/pages/dashboard.tsx:95-99`.

---

## 7. Adding and editing transactions

### ✅ A1 · The primary action is below a long scroll

**Severity:** High · **Screens:** Add transaction, Edit transaction

**Status:** ✅ Fixed — the add/edit sheet now pins its primary action in a footer outside the scroll area. The footer repeats the selected category, space and amount, and shows a short hint when the amount or space is missing, so “Add transaction” is always one tap away.

**What the user sees.** The sheet opens with the amount field focused. Below it: quick-add chips, a 4-column category grid, a note field, a two-column date/space row, payment methods, and only then the “Add transaction” button. At 360 × 640, the first viewport ends around the start of the category grid. The button is several screens down. The sheet itself is capped at `88dvh` and scrolls internally (`client/src/components/ui/sheet.tsx:33,60`).

**Why it matters.** Adding a transaction is the most frequent action in the app. Requiring a scroll every time turns a five-second task into a ten-second one and makes the sheet feel like a form, not a quick capture. Users who tap “Add” without scrolling see nothing happen and may tap again.

**Recommended fix.** Make the primary action sticky at the bottom of the sheet, outside the scroll area, with the amount and a one-line summary visible. Collapse optional fields (note, payment, date) behind “More options”. Put category chips in a single horizontally scrollable row or a compact grid that fits above the fold.

**Source.** `client/src/components/transactions/transaction-form.tsx:300-500`; `client/src/components/ui/sheet.tsx:33,60`.

---

### ✅ A2 · “+ New space…” closes the sheet and discards the form

**Severity:** High · **Screen:** Add transaction

**Status:** ✅ Fixed — selecting “+ New space…” now opens a nested sheet over the transaction form. Creating the space selects it and returns to the same form with the amount, category, note and date intact. There is no navigation away and no reset.

**What the user sees.** In the Space dropdown, the last option is “+ New space…”. Selecting it closes the add-transaction sheet immediately and navigates to `/spaces`. The amount, category, note and date just entered are gone. There is no confirmation and no way back to the form.

**Why it matters.** This is a data-loss trap placed inside the most common flow. A user who realises mid-entry that the expense belongs in a new space is punished for it. The natural expectation is that a small “New space” dialog appears, the space is created, and the form resumes with it selected.

**Recommended fix.** Open a nested “New space” sheet, create the space, then return to the transaction form with the new space selected and all fields intact. If that is too complex, remove the option from the dropdown and add a note: “Create spaces in Spaces first.”

**Source.** `client/src/components/transactions/transaction-form.tsx:417-447` (the `__new__` branch calls `closeForm()` then `navigate("/spaces")`).

---

### ✅ A3 · Validation is a toast, not an inline message

**Severity:** Medium · **Screens:** Add/Edit transaction, Create due, Auth

**Status:** ✅ Fixed — the transaction and create-due forms now show field-level messages under Amount, Name, Category, Note, Date and Space, set `aria-invalid`/`aria-describedby`, focus the first invalid field, and clear the message as soon as the field is edited. The primary button is disabled until an amount and space exist, with a short hint. Toasts are kept for server failures only. Sign-in and sign-up already showed an inline error paragraph.

**What the user sees.** Submitting with no amount shows a toast at the top or bottom: “Enter a valid amount”. The amount field itself is not marked, does not receive an error style, and the toast disappears. Schema errors are similarly converted to a single toast (`client/src/components/transactions/transaction-form.tsx:200-245`). The same pattern appears in create-due and sign-up.

**Why it matters.** Toasts are transient and detached from the field. On a long sheet, the user may not see the toast at all, or may not know which field failed. Screen readers may miss it if the toast is not announced. Inline errors are the expected pattern for forms.

**Recommended fix.** Show an error message directly under the failing field, set `aria-invalid` and `aria-describedby`, and move focus to the first invalid field. Keep the toast only for server failures. Disable the primary button until the minimum required fields are valid, with a short hint (“Enter an amount to continue”).

**Source.** `client/src/components/transactions/transaction-form.tsx:200-245`; `client/src/components/dues/create-due-sheet.tsx:133-160`.

---

### A4 · Autofocus opens the keyboard and hides the sheet

**Severity:** Medium · **Screen:** Add transaction

**What the user sees.** The amount input has `autoFocus` (`client/src/components/transactions/transaction-form.tsx:312`). On a phone, the keyboard opens immediately and covers the lower half of the sheet. The category grid and the primary button are pushed further out of view.

**Why it matters.** Autofocus is helpful for amount-first entry, but it also hides the context a first-time user needs. On a small screen, the user sees the amount and little else, then has to dismiss the keyboard to find the category.

**Recommended fix.** Keep autofocus only when the sheet opens from a “quick add” entry point, and use `inputMode="decimal"` with a visible “Next” flow. On first use, show the category row above the fold before focusing. Consider a dedicated numeric keypad-style first screen.

**Source.** `client/src/components/transactions/transaction-form.tsx:312`.

---

### A5 · Quick-add chips add to the amount instead of setting it

**Severity:** Medium · **Screen:** Add transaction

**What the user sees.** Five chips labelled “Rs. +100”, “Rs. +250”, “Rs. +500”, “Rs. +1000”, “Rs. +5000”. Tapping one adds that value to the current amount. If the field is empty, it sets the value. If the user has already typed 200 and taps +500, the amount becomes 700.

**Why it matters.** The “+” is honest, but the behaviour is unusual for amount chips. Most apps use chips as presets (“Rs. 500”) or as a keypad. A user who types 200 and taps 500 expecting 500 gets 700, and may not notice before saving.

**Recommended fix.** Use two distinct rows: preset chips that set the amount, and an explicit “Add” control if accumulation is needed. Or replace the chips with a numeric keypad. Show the resulting amount clearly after each tap.

**Source.** `client/src/components/transactions/transaction-form.tsx:323-340`.

---

### A6 · The category grid is cramped and truncates labels

**Severity:** Medium · **Screen:** Add/Edit transaction

**What the user sees.** A 4-column grid of icon buttons with labels at `0.65rem` (~10.4 px), each truncated to one line. On 360 px, four columns leave roughly 70 px per cell. Long names are cut off, and the selected state is a subtle border and ring.

**Why it matters.** Category is the field users think about most. Truncated labels make them guess, and the small targets are hard to tap accurately. The grid also grows vertically with every category, pushing the primary action further down.

**Recommended fix.** Use a 3-column grid at small widths, allow two-line labels or show the full name in a tooltip/label below the icon, and increase the minimum touch target to 44 px. Add a search or “recent categories” row for users with many categories.

**Source.** `client/src/components/transactions/transaction-form.tsx:342-386`.

---

### A7 · Date and Space are squeezed into two columns

**Severity:** Medium · **Screen:** Add/Edit transaction

**What the user sees.** Date and Space share a two-column row, each with its own label, picker and (for date) three quick chips. At 360 px, each column is about 150 px wide. The Space trigger includes a wallet icon and a long space name, which truncates.

**Why it matters.** The space name is the one piece of context that prevents the wrong-space error (N2). Truncating it in a narrow column makes it harder to verify. The quick-date chips also wrap and add height.

**Recommended fix.** Stack Date and Space on small screens, or put Space in a full-width row above the amount with a visible chip. Show the full space name, not a truncated trigger.

**Source.** `client/src/components/transactions/transaction-form.tsx:387-450`.

---

### A8 · Closing the sheet discards everything without a warning

**Severity:** Medium · **Screen:** Add/Edit transaction

**What the user sees.** Tapping the backdrop, pressing Escape, or dragging the sheet down closes it. If the user has typed an amount, chosen a category and written a note, all of it is lost. There is no “Discard changes?” confirmation and no draft.

**Why it matters.** On mobile, a stray tap outside the sheet is easy. Losing a half-entered transaction is frustrating and teaches users to avoid the sheet. The sheet also has no visible close button, so the backdrop is the main exit.

**Recommended fix.** Track whether the form is dirty. On close, show a small confirm (“Discard this transaction?”) or save a local draft that can be restored. Add a visible close (X) button in the sheet header.

**Source.** `client/src/components/transactions/transaction-form.tsx:250`; `client/src/components/ui/sheet.tsx:37-58`.

---

### A9 · Editing can silently move a transaction to another space

**Severity:** Medium · **Screen:** Edit transaction

**What the user sees.** In edit mode, the Space selector is enabled (unless the caller locked it) and changing it moves the transaction to a different space on save (`client/src/components/transactions/transaction-form.tsx:220-232`). The button says “Save changes”; there is no warning that the transaction will leave the current space’s budget and history.

**Why it matters.** Moving a transaction changes two spaces’ balances and budgets. A user who only meant to fix a typo in the note can move the expense without realising. The edit sheet does not show the original space once it is changed.

**Recommended fix.** Either lock the space in edit mode (delete and re-create to move), or show an explicit “Move to another space” action with a confirmation that names both spaces. Keep the original space visible in the header.

**Source.** `client/src/components/transactions/transaction-form.tsx:220-232,415-450`.

---

### A10 · The sheet has no visible close control

**Severity:** Medium · **Screens:** All sheets

**What the user sees.** A drag handle at the top, a title, and the form. There is no X. To close, the user must tap the dimmed backdrop, press Escape, or drag the sheet down. On a long form, the backdrop may be hard to reach without scrolling.

**Why it matters.** A visible close is a basic escape hatch. Users who are unsure how to dismiss a sheet may feel trapped, especially on desktop where drag-to-dismiss is not obvious.

**Recommended fix.** Add a 44 px close button to the top-right of every sheet, with `aria-label="Close"`. Keep backdrop and Escape as additional paths.

**Source.** `client/src/components/ui/sheet.tsx:37-58`.

---

### A11 · “Less than five seconds, promise” overpromises

**Severity:** Low · **Screen:** Add transaction

**What the user sees.** The sheet description reads “Less than five seconds, promise.” The actual flow requires scrolling to the bottom and can take longer, especially on a small screen.

**Why it matters.** Copy that makes a promise the interaction breaks is worse than no copy. It draws attention to the friction.

**Recommended fix.** Replace it with a useful instruction: “Log an expense or income. Only amount and category are required.” Or remove it.

**Source.** `client/src/components/transactions/transaction-form.tsx:252`.

---

## 8. Activity

### ✅ Act1 · Delete is swipe-only, with no keyboard or visible alternative

**Severity:** High · **Screen:** Activity, Home

**Status:** ✅ Fixed — every transaction row now has a visible “…” actions button that opens a sheet with Edit and Delete. Swipe remains an optional shortcut, the row is still a real button, Delete works while the row is focused, and the delete confirmation toast offers Undo, which recreates the transaction.

**What the user sees.** Rows look like normal list items. A horizontal swipe reveals a red delete panel; tapping it opens a confirmation sheet. There is no trash icon, no overflow menu, no context-menu action and no keyboard shortcut. The row itself is a real button, so tapping it opens edit, but the only delete path is the gesture.

**Why it matters.** Users who do not discover the gesture cannot delete at all. Keyboard and switch users cannot reach the action. On a desktop, horizontal swipe is unnatural. The gesture also conflicts with horizontal scrolling and with the browser’s back gesture on iOS.

**Recommended fix.** Add a visible “…” menu to each row with Edit and Delete. Keep swipe as an optional shortcut, add an undo toast after deletion, and make the row a real button/link with a focus ring. Support the Delete key when the row is focused.

**Source.** `client/src/components/transactions/swipeable-transaction-item.tsx:28-75`; `client/src/components/transactions/transaction-item.tsx:18-111`; `client/src/pages/transactions.tsx:300-320`.

---

### Act2 · Filters are hidden and limited

**Severity:** Medium · **Screen:** Activity

**What the user sees.** A search field and a type segmented control (All / Expense / Income). A slider icon toggles a panel with space chips. There is no date range, no payment method, no amount range, no category filter and no “cleared” filter. The icon has no label; its active state is only a border change.

**Why it matters.** Activity is where users reconcile. “Show me cash expenses in Goa last week” is a normal question that cannot be answered without scrolling and mental filtering. Hidden filters also mean users may not know they exist.

**Recommended fix.** Add a visible “Filters” button with a count badge, and support date range, category, space and payment method. Put the active filters in a removable chip row above the list. Keep the search field as the primary path.

**Source.** `client/src/pages/transactions.tsx:146-230`.

---

### Act3 · Pagination shows gaps without ellipses

**Severity:** Medium · **Screen:** Activity, Space detail

**What the user sees.** With more than a few pages, the pagination renders the first page, the last page and the current page ±1, but no ellipsis. The result is a row like “1 2 4 8”, which looks like page 3 is missing or disabled. Every page number is generated in memory (`Array.from({ length: totalPages })`), even though most are not rendered.

**Why it matters.** Users cannot tell whether the gap is intentional. The control also lacks a “jump to page” input, so reaching page 20 takes many taps.

**Recommended fix.** Render explicit ellipses (“1 … 4 5 6 … 20”), add `aria-current="page"` to the active page, and add a compact “Go to page” input for long lists. Virtualise or cap the page list for very large datasets.

**Source.** `client/src/pages/transactions.tsx:326-368`; `client/src/pages/space-detail.tsx:167-173`.

---

### Act4 · Import and export crowd the Activity header

**Severity:** Medium · **Screen:** Activity

**What the user sees.** Three icon-only buttons in the top-right: download, upload and filters. They have tooltips and aria-labels, but no visible text. Import/export are also available in Settings, so the same actions exist in two places with different surrounding context.

**Why it matters.** Import is a rare, high-risk action sitting one tap from the list, next to a filter control of the same visual weight. A user reaching for filters can hit import. The header also becomes crowded on a 360 px screen.

**Recommended fix.** Move import/export to an overflow menu, or keep only “Filters” in the header and put data actions in Settings. If import stays, give it a distinct label and a confirmation step.

**Source.** `client/src/pages/transactions.tsx:130-160`.

---

### Act5 · No bulk selection or bulk delete

**Severity:** Medium · **Screen:** Activity

**What the user sees.** Every row must be edited or deleted individually. There is no checkbox, long-press selection, “Select all”, or batch action. After a bad import (T5), cleaning up means deleting each row one by one.

**Why it matters.** Bulk import exists, but bulk correction does not. The asymmetry makes the import feature dangerous and the cleanup painful.

**Recommended fix.** Add a selection mode with checkboxes, a count bar, and “Delete selected” with confirmation and undo. Pair it with the import batch ID so “Undo import” is a one-tap action.

**Source.** `client/src/pages/transactions.tsx:300-325`; `client/src/components/settings/import-transactions-sheet.tsx`.

---

### Act6 · “Activity” and “Transactions” are used interchangeably

**Severity:** Low · **Screens:** Bottom nav, Activity, Settings, Space detail

**What the user sees.** The tab is “Activity”, the page title is “Activity”, but Settings says “Export Transactions”, the import sheet says “Import transactions”, and empty states say “No transactions yet”.

**Why it matters.** Two names for the same object make search and documentation harder, and make the product feel less considered.

**Recommended fix.** Pick one noun. “Transactions” is clearer for a finance app; “Activity” could be reserved for a mixed feed that includes dues, invites and edits.

**Source.** `client/src/components/layout/bottom-nav.tsx:24`; `client/src/pages/transactions.tsx:125`; `client/src/pages/settings.tsx:253-295`.

---

## 9. Insights

### I1 · “Custom” opens on a single day and often empties the page

**Severity:** Medium · **Screen:** Insights

**What the user sees.** The period selector includes “Custom”. Selecting it reveals From and To date pickers, both initialised to today (`client/src/pages/analytics.tsx:124-127`). The summary immediately queries that single day. If there are no transactions today, the page shows “No data for this period”. The card does say “Viewing single day”, but the user has to notice it.

**Why it matters.** The natural expectation is that “Custom” lets you choose a range before it replaces the current view. Instead, it can blank a populated dashboard with one tap. Users may conclude their data is gone.

**Recommended fix.** When Custom is selected, keep the previous range until the user applies a new one, or default to the last 30 days. Show an “Apply” button and a clear “From – To” summary. If the range is a single day, say so prominently and offer “Last 7 days” / “This month” shortcuts.

**Source.** `client/src/pages/analytics.tsx:124-127,250-330`.

---

### I2 · Expense decreases show a green upward arrow

**Severity:** High · **Screen:** Insights

**What the user sees.** The Expenses card shows a delta badge. When spending falls 10% versus last month, the badge is green and uses `TrendingUp`; when spending rises, it is red and uses `TrendingDown` (`client/src/pages/analytics.tsx:40-57`). The arrow direction encodes “good/bad”, not “up/down”.

**Why it matters.** A green upward arrow next to “Expenses” reads as “spending went up 10%” to most people. The colour says good, the arrow says bad, and the number has no sign. The user can take away the opposite of the truth. The same component is used for income, where a decrease shows a red downward arrow — correct direction, but the inconsistency makes it harder to learn.

**Recommended fix.** Separate direction from sentiment. Show a down arrow for a decrease and an up arrow for an increase, then colour the badge by whether that direction is good for this metric. Add a sign and a label: “↓ 10% vs last month” in green for expenses. Use text or an icon with an accessible label, not colour alone.

**Source.** `client/src/pages/analytics.tsx:40-57,356-375`; `server/src/domains/analytics/service.ts:376-410`.

---

### I3 · Negative savings are displayed as 0%

**Severity:** Medium · **Screen:** Insights

**What the user sees.** If spending exceeds income, the savings rate is clamped to 0% (`client/src/pages/analytics.tsx:206-209`), the ring is entirely red, and the legend says “Saved Rs. 0”. The Insights card may separately say “You're spending more than you earn”.

**Why it matters.** 0% is not the same as negative savings. A user who spent Rs. 10,000 more than they earned sees “0% saved”, which understates the problem and contradicts the text elsewhere. The exact deficit is hidden.

**Recommended fix.** Show a negative percentage and a negative saved amount, e.g. “−18% saved” and “−Rs. 10,000”, with a clear “You spent more than you earned” caption. Keep the ring red but label the overspend.

**Source.** `client/src/pages/analytics.tsx:61-90,203-209,381-415`; `server/src/domains/analytics/service.ts:293-305`.

---

### I4 · “Over budget by 12345.00” has no currency and the wrong noun

**Severity:** Medium · **Screen:** Insights

**What the user sees.** The generated insight reads “You're over budget by 12345.00 — try to cut back” when expenses exceed income. It uses `toFixed(2)` with no currency symbol and calls an income shortfall a budget overrun.

**Why it matters.** The number is hard to parse without a symbol or thousands separators, and “budget” is a different concept from “income”. A user with no budget set is confused about what they exceeded.

**Recommended fix.** Format with the app’s currency formatter and say “You spent Rs. 12,345 more than you earned this period.” If the product has space budgets, compare against the budget explicitly and link to it.

**Source.** `server/src/domains/analytics/service.ts:317-330`.

---

### ◐ I5 · The savings formula is never explained

**Severity:** Low · **Screen:** Insights

**Status:** ◐ Partly fixed — the savings-rate label has a formula tooltip and the page notes that loans are excluded. Still open: a visible info affordance on touch devices and a methodology link.

**What the user sees.** A “Savings rate” card with a percentage, a ring, and a legend for “Saved” and “Spent”. There is no explanation that the rate is `(income − expenses) / income` and that dues-linked transactions are included.

**Why it matters.** Savings rate is a loaded term. Users may assume it excludes rent, taxes or loan principal. Given T1, the number can be materially wrong, and the lack of a definition hides that.

**Recommended fix.** Add an info tooltip: “Savings rate = (income − expenses) ÷ income for the selected period. Loans are excluded.” Link to a short methodology page.

**Source.** `client/src/pages/analytics.tsx:381-415`.

---

## 10. Dues and loans

### ✅ D1 · The create-due copy admits the accounting is confusing

**Severity:** High · **Screen:** Create due

**Status:** ✅ Fixed — the create-due helper now says the entry is tracked as a loan, not spending/income, and Activity labels it “Loan in” / “Loan out”.

**What the user sees.** Under the “I Lent” / “I Borrowed” toggle: “They owe you · creates an expense transaction” or “You owe them · creates an income transaction”. The submit button says “Record Lending” or “Record Borrowing”.

**Why it matters.** This is the app telling the user, in its own words, that lending is an expense. It is honest but it does not resolve the confusion; it creates it. A user who lent money did not spend it, and a user who borrowed money did not earn it. The copy is a symptom of T1 and should not survive the fix.

**Recommended fix.** Remove the transaction clause entirely once T1 is fixed. Replace it with plain language: “They owe you Rs. 5,000” / “You owe them Rs. 5,000”. If the ledger entry remains, label it “Loan out” / “Loan in” and add a “This is not counted as spending” note.

**Source.** `client/src/components/dues/create-due-sheet.tsx:210`.

---

### D2 · A due cannot be edited

**Severity:** High · **Screen:** Due detail

**What the user sees.** The due detail sheet offers “Record Settlement”, “Undo” on each settlement, and “Delete Due” (only when there are no settlements). There is no Edit button. To fix a typo in the person’s name, the amount, the date or the note, the user must delete the due and create it again.

**Why it matters.** Typos are common, especially with names and phone numbers. Delete-and-recreate also deletes the linked transaction, so the correction changes the ledger history. A due with a partial settlement cannot be deleted at all, so an early typo becomes permanent.

**Recommended fix.** Add “Edit due” for the counterparty, amount, dates and note. If the principal changes after a settlement, show a warning and recalculate the remaining amount. Keep the linked transaction in sync or explain the effect.

**Source.** `client/src/components/dues/due-detail-sheet.tsx:314-345`; `server/src/domains/dues/service.ts:318-345`.

---

### D3 · The floating buttons cover content and detach on desktop

**Severity:** Medium · **Screens:** Dues, desktop

**What the user sees.** Two stacked pills, “I Borrowed” and “I Lent”, fixed at `bottom-24 right-5`. On mobile they sit above the bottom nav and can cover the last due card or the empty-state buttons. On desktop they stay at the viewport’s right edge, far from the centred app column.

**Why it matters.** The most important list content is at the bottom, and the buttons float over it. On desktop the placement looks broken. Two always-visible buttons also compete with the central “+”.

**Recommended fix.** Use a single “Add due” FAB that expands to the two directions, anchor it to the content column, and add bottom padding to the list so the last row is never covered. On desktop, place the action in the page header.

**Source.** `client/src/pages/dues.tsx:485-510`.

---

### D4 · Person grouping merges different people with the same name

**Severity:** Medium · **Screen:** Dues

**What the user sees.** The “group by person” view keys groups by `counterparty.name.toLowerCase().trim()` (`client/src/pages/dues.tsx:107-123`). Two different people both named “Anita” become one group, with combined totals and a single collapse state.

**Why it matters.** The group header shows a total “owed to you” that mixes two relationships. Settling one person’s due can make the group total misleading. The same issue affects the expand/collapse state.

**Recommended fix.** Group by a stable identifier (counterparty id, phone or email), and show the name plus a disambiguator when duplicates exist (“Anita · 9841…”). If no identifier exists, group by name plus phone.

**Source.** `client/src/pages/dues.tsx:107-126,371-410`.

---

### D5 · “Set a repayment reminder” does not set a reminder

**Severity:** Medium · **Screen:** Create due

**What the user sees.** The Due Date picker placeholder says “Set a repayment reminder” (`client/src/components/dues/create-due-sheet.tsx:340`). The date is saved and used to mark the due overdue, but no notification or email is scheduled. The only reminder is the red overdue banner on the Dues page and the Home badge.

**Why it matters.** The copy promises a reminder the product does not send. A user who relies on it may miss the date. The due date is still useful, but it should be labelled as a due date, not a reminder.

**Recommended fix.** Either implement a reminder (push/email at a chosen lead time) or change the copy to “Due date (optional)” and explain that overdue dues appear on Home and Dues. If reminders are planned, show “Reminders are not enabled yet” rather than implying they work.

**Source.** `client/src/components/dues/create-due-sheet.tsx:318-345`; `server/src/domains/dues/model.ts:59`; no reminder job in `server/src/domains/dues`.

---

### D6 · Direction colours conflict across Dues and Activity

**Severity:** Medium · **Screens:** Dues, Create due, Activity

**What the user sees.** “I Lent” (money out) is green; “I Borrowed” (money in) is amber. In Activity, expense (money out) is red and income (money in) is green. The arrows are consistent — up-right for money out, down-left for money in — but the colours are not. Green means “money out” on Dues and “money in” on Activity; red means “money out” on Activity and is not used on the Dues buttons.

**Why it matters.** Colour is the fastest cue. A user who learns “green = income” from Activity sees green on “I Lent” and may read it as money coming in. The same direction carries two different emotional meanings, and the Dues buttons are the place where a wrong read matters most.

**Recommended fix.** Use one colour system across the app: green for income, red for expense, and a neutral or blue treatment for loan principal (with amber for a liability if needed). Keep the consistent arrows, add text labels (“You lent”, “You borrowed”), and never use green for an outflow.

**Source.** `client/src/pages/dues.tsx:346-366,485-510`; `client/src/components/dues/create-due-sheet.tsx:174-175`; `client/src/components/transactions/transaction-item.tsx:28-50`.

---

### D7 · The due detail does not show linked ledger entries

**Severity:** Medium · **Screen:** Due detail

**What the user sees.** Principal, settled amount, remaining, progress, settlement history and notes. No section for the expense/income transactions that were created when the due was opened or settled.

**Why it matters.** The user cannot reconcile the due with Activity, and cannot see that deleting the due will delete a transaction. This is the UI half of T7.

**Recommended fix.** Add a “Linked transactions” section with date, amount, type and a link to the transaction. Show a warning before deleting the due that the linked entry will also be removed.

**Source.** `client/src/components/dues/due-detail-sheet.tsx`; `server/src/domains/dues/service.ts:108-128,221-240,318-345`.

---

### D8 · A partially settled due cannot be deleted or corrected

**Severity:** Medium · **Screen:** Due detail

**What the user sees.** “Delete Due” is only rendered when the due is open and has no settlements (`client/src/components/dues/due-detail-sheet.tsx:332-345`). Once a partial settlement exists, the only path is to undo every settlement, then delete, then recreate. The server also rejects deletion with a conflict error.

**Why it matters.** A mistaken due with one small settlement becomes a multi-step cleanup. The user may not understand why the delete button disappeared.

**Recommended fix.** Allow deletion with a clear warning that settlements and linked transactions will be removed, or offer “Archive” / “Cancel due” for settled history. If deletion is intentionally blocked, explain why next to the disabled action.

**Source.** `client/src/components/dues/due-detail-sheet.tsx:332-345`; `server/src/domains/dues/service.ts:318-336`.

---

## 11. Spaces and members

### S1 · A signed-out invitee loses the invitation after auth

**Severity:** High · **Screens:** Invite, Sign in, Sign up

**What the user sees.** An invite link opens a preview with the space name, inviter and invited email. For a signed-out user, the buttons are “Sign up to accept” and “Sign in with existing account”. Both pass `state.from` to the auth page (`client/src/pages/invite.tsx:180-210`). The sign-in page ignores it and always `navigate("/")` (`client/src/pages/sign-in.tsx:42`). Sign-up shows the “verify your email” screen with `callbackURL` set to `/` (`client/src/pages/sign-up.tsx:53-66,113-160`). The invite is never resumed.

**Why it matters.** Shared spaces are a core feature, and invitations are the only way in. A new user who receives a link, signs up, verifies their email, and lands on Home has to find the original link and start again. Many will not. The invite preview looks polished, which makes the dead end more disappointing.

**Recommended fix.** Preserve the invite token through auth. After sign-in, redirect to `state.from` (or `/invite/:token`). After sign-up, include the invite URL in the verification callback and in the “continue” button. If email verification is required, show “Verify your email to join [space]” and keep the token in the verification link.

**Source.** `client/src/pages/invite.tsx:180-210`; `client/src/pages/sign-in.tsx:42`; `client/src/pages/sign-up.tsx:53-66,113-160`; `client/src/app/App.tsx:40-55`.

---

### S2 · Space cards cannot be opened with a keyboard

**Severity:** High · **Screen:** Spaces

**What the user sees.** Each space is a `<Card>` with `onClick`, `cursor-pointer`, and a `focus-visible` ring class, but no `role`, `tabIndex`, `onKeyDown` or anchor. It is not in the tab order. The edit and delete buttons inside the card are focusable, but the card itself is not.

**Why it matters.** Keyboard and switch users can edit or delete a space but cannot open it. The focus ring class is misleading because the element never receives focus. This is a core navigation failure, not a polish issue.

**Recommended fix.** Render the card as a `<Link>` or a `<button>` with `aria-label="Open [space]"`, and keep the edit/delete controls as sibling buttons outside the link (or stop propagation). Add Enter/Space handling if a div is retained.

**Source.** `client/src/pages/spaces.tsx:360-385`.

---

### ✅ S3 · A failed spaces/analytics request looks like an empty account

**Severity:** Critical · **Screens:** Spaces, Space detail

**Status:** ✅ Fixed — a failed spaces request now shows “Couldn’t load your spaces” with retry instead of “No spaces yet”. A failed transactions request on Space detail shows “—” placeholders and a retry instead of a zero balance and an empty list. A failed balances request on Spaces keeps the space cards visible and explains that balances and budgets are unavailable.

**What the user sees.** If the spaces query fails, the page shows the “No spaces yet” empty state and a “Create a space” button. If the space detail’s transaction data fails, the balance and list show zero/empty.

**Why it matters.** This is T3 in the shared-space context. A user may create a duplicate space or assume their shared history was deleted. The fix is the same: explicit error states with retry.

**Source.** `client/src/pages/spaces.tsx:59-90,330-345`; `client/src/pages/space-detail.tsx:150-200`; `client/src/pages/dashboard.tsx:104`.

---

### S4 · Deleting Personal recreates it

**Severity:** High · **Screen:** Spaces

See T4. The behaviour is especially visible here because the Spaces list is where the delete happens and where the card returns.

**Source.** `server/src/domains/spaces/service.ts:75-83`; `server/src/domains/spaces/repository.ts:171-215`.

---

### S5 · “Invitations sent” is shown even when invites fail

**Severity:** High · **Screen:** Create space, Members

**What the user sees.** The create-space form collects up to 10 invitee identifiers. On success, the toast always says “Space created and invitations sent!” if any identifiers were entered (`client/src/pages/spaces.tsx:218-231`). The server returns an `invitations` array with `status: "invited" | "failed"` and an error per identifier (`server/src/domains/spaces/service.ts:30-62`), but the client ignores it.

**Why it matters.** A typo in an email, a blocked address or a delivery failure still produces a success message. The user believes the person was invited and waits for them to join. The failure is silent until someone asks why they never got access.

**Recommended fix.** Read the `invitations` result and show a mixed outcome: “Space created. 2 invited, 1 failed: @sam not found.” List failed identifiers with a retry action. If all fail, say “Space created, but no invitations were sent.”

**Source.** `client/src/pages/spaces.tsx:218-231`; `server/src/domains/spaces/service.ts:30-62`.

---

### S6 · The bottom-nav “+” files the transaction in Personal

**Severity:** High · **Screens:** Space detail

See N2. The space detail page has its own “Add transaction” button that correctly locks the space (`client/src/pages/space-detail.tsx:708-720`), but the global “+” remains visible and does the wrong thing.

**Source.** `client/src/lib/transaction-form.tsx:38-44`; `client/src/components/layout/bottom-nav.tsx:34-37`.

---

### ◐ S7 · Space balance and budget are not explained

**Severity:** Medium · **Screens:** Spaces, Space detail

**Status:** ◐ Partly fixed — balances are labelled “Net saved” on space cards and the detail hero, with a formula tooltip, and the budget is labelled “Month Budget”. Still open: neutral colour for an expected negative balance and a “How is this calculated?” link.

**What the user sees.** A space card shows a balance with a red/green colour and a monthly budget bar. The detail hero shows “Balance” and “Monthly budget” with spent/remaining. The balance is all-time income minus expense for that space, including dues-linked transactions; the budget is this month’s expense. Neither is labelled with its period, and the two numbers can tell different stories.

**Why it matters.** A user sees “Balance Rs. −20,000” and “Budget Rs. 50,000 · 40% spent” and cannot tell whether the negative balance is a problem or just the history of the space. The colour red implies danger even when the space is simply a trip that was fully funded.

**Recommended fix.** Label the balance period (“All-time balance”) and explain the formula in a tooltip. Show “This month” on the budget. Use a neutral colour for a negative balance if it is expected (e.g. a trip), and reserve red for over-budget. Add a small “How is this calculated?” link.

**Source.** `client/src/pages/spaces.tsx:511-570`; `client/src/pages/space-detail.tsx:560-660`.

---

### S8 · A delete icon sits on every space card

**Severity:** Medium · **Screen:** Spaces

**What the user sees.** Every card shows a pencil and a trash icon in the top-right, even before the user opens the card. The icons are small (roughly 28–32 px) and close together.

**Why it matters.** Destructive actions should not be the most exposed control on a list. A mis-tap can start a delete flow for a shared space. The icons also compete with the card’s main action (open).

**Recommended fix.** Move edit/delete into an overflow menu on the card or into the space detail header. Increase the target size to 44 px and separate the destructive action from the edit action.

**Source.** `client/src/pages/spaces.tsx:480-506`.

---

### S9 · The invite error message is broken

**Severity:** Medium · **Screen:** Invite

**What the user sees.** An invalid or expired invite shows the title “Invitation Expired or Invalid” and a description that can read: “This invitation link is invalid, expired, or has already been used not found”. The last two words are concatenated from a server error and a fallback string.

**Why it matters.** The error is the only guidance a blocked user gets. Broken grammar makes the product feel unmaintained and obscures whether the link is expired, already used, or simply wrong. The “Go to Home” action sends a signed-out user to a protected route, which redirects to Welcome.

**Recommended fix.** Normalise server errors into one human sentence. Distinguish “expired”, “already used” and “not found” where the server can. For signed-out users, offer “Sign in” and “Go to Welcome” instead of “Go to Home”.

**Source.** `client/src/pages/invite.tsx:105-125`; server invitation error messages.

---

### S10 · Member roles and ownership are under-explained

**Severity:** Low · **Screen:** Members sheet

**What the user sees.** A members list with avatars, names, roles and a “Transfer ownership” action for the owner. There is no explanation of what an owner can do that a member cannot, or what happens to the owner’s data after transfer.

**Why it matters.** Shared finances are sensitive. Users need to know who can delete the space, remove members or see transactions before they invite someone.

**Recommended fix.** Add a one-line role description under the sheet title (“Owners can edit the space, manage members and delete it. Members can add and edit their own transactions.”) and a confirmation for ownership transfer that explains the consequences.

**Source.** `client/src/pages/space-detail.tsx:930-1130`.

---

## 12. Settings, profile and authentication

### Set1 · Settings is titled “You” and mixes four different jobs

**Severity:** Medium · **Screen:** Settings

**What the user sees.** A page headed “You”, then a profile card, Preferences (Appearance, Motion, Notifications), Feedback, Data & Backup (Export CSV, Full Data Backup JSON, Import), Legal, and Sign out. The profile editor is a separate page reached through the card.

**Why it matters.** “You” suggests identity, but most of the page is app configuration. “Motion” is a top-level preference next to Appearance and Notifications, while account security, password and delete account are hidden one level deeper in Profile. Users looking for “change my password” or “export my data” have to guess which of two “me” pages to open.

**Recommended fix.** Rename the page “Settings” and structure it as Account (profile, security, sign out), Preferences (appearance, motion, notifications), Data (export, import, backup), and About/Legal. Keep the profile card as the Account entry. Add search if the list grows.

**Source.** `client/src/pages/settings.tsx:103-380`; `client/src/pages/profile.tsx:288-340`.

---

### Set2 · Motion defaults to Full and ignores the OS setting

**Severity:** High · **Screen:** Settings, all animated screens

**What the user sees.** Motion has three options: Full, Reduced, System. The provider defaults to `"full"` (`client/src/app/providers/index.tsx:20`), so a user whose operating system requests reduced motion still gets page transitions, staggered cards, spring buttons and the pulsing “+” until they find Settings → Motion → System or Reduced. The `.reduce-motion` CSS class only flattens CSS transitions; Framer Motion is controlled by `MotionBridge`, which maps `"full"` to `reducedMotion="never"` (`client/src/app/providers/index.tsx:10-14`). The default therefore actively overrides the OS preference.

**Why it matters.** Reduced motion is an accessibility need, not a preference. Motion-sensitive users can experience dizziness or nausea before they ever open Settings. The OS setting exists precisely so apps do not require this discovery.

**Recommended fix.** Default to `"system"`, which already maps to `reducedMotion="user"`, and keep the manual override for users who want Full regardless. Read `prefers-reduced-motion` on first load so the setting reflects the device before the user touches it.

**Source.** `client/src/app/providers/index.tsx:19-21`; `client/src/lib/animation-provider.tsx:21-46`; `client/src/global.css:153-160`; `client/src/components/layout/bottom-nav.tsx:64-77`.

---

### Set3 · Export CSV, Full Data Backup and Import are not clearly differentiated

**Severity:** Medium · **Screen:** Settings

**What the user sees.** Three peer-level rows: “Export Transactions (CSV) — Download spreadsheet with all transaction records”, “Full Data Backup (JSON) — Export spaces and transactions for backup”, and “Import Transactions — Restore a backup or load a CSV spreadsheet”. There is no indication of which file to use for what, whether dues/settlements are included, or whether an import replaces or appends.

**Why it matters.** A user who wants a backup may download the CSV and later discover it cannot restore dues, members or budgets. A user who imports a backup may not know it appends to existing data. The wording “Full Data Backup” implies completeness, but the JSON export only includes spaces and transactions (`client/src/pages/settings.tsx:270-285`), not dues, members or settings.

**Recommended fix.** Rename and explain: “Transactions (CSV) — for spreadsheets, not a full backup”, “Ledger backup (JSON) — spaces and transactions”, “Restore or import — adds records; it does not replace your account”. State what is excluded. Add a “What’s included?” expandable list.

**Source.** `client/src/pages/settings.tsx:234-300`; `client/src/lib/export.ts`; `client/src/components/settings/import-transactions-sheet.tsx`.

---

### Set4 · There is no “Forgot password?” on sign-in

**Severity:** High · **Screen:** Sign in

**What the user sees.** Email, password, “Sign in”, “Continue with Google”, and a link to sign up. No “Forgot password?”, no reset link, no support contact. The only recovery path is to remember the password or use Google.

**Why it matters.** Password resets are a basic expectation. A user who forgets their password is locked out permanently, and their financial history with them. This is a retention and trust failure, not a nice-to-have.

**Recommended fix.** Add a “Forgot password?” link that sends a reset email, with a confirmation screen that does not reveal whether the email exists. Add a “Resend verification email” path for unverified accounts (partially present) and a support link.

**Source.** `client/src/pages/sign-in.tsx:120-180`.

---

### Set5 · Email verification is a dead end for new users and invites

**Severity:** High · **Screens:** Sign up, Invite

**What the user sees.** After creating an account, the page switches to “Check your email” with a resend button. The verification callback is `/`, not the invite or the page the user came from. If the email does not arrive, the only action is “Resend verification email”; there is no “change email”, “contact support” or “continue without verifying” path. The invite token is not carried through.

**Why it matters.** New users can get stuck before ever seeing the product. Invitees are blocked twice: once by verification and once by the lost redirect. The resend button gives no cooldown and, on sign-up, no success feedback at all.

**Recommended fix.** Carry the invite token and intended destination through the verification link. Add a clear “Wrong email? Change it” action, a support link, and a cooldown with “Email sent. Check spam.” Show the masked email address. If the product can safely allow a limited session before verification, do so.

**Source.** `client/src/pages/sign-up.tsx:53-66,113-160`; `client/src/pages/sign-in.tsx:44-58`; `client/src/pages/invite.tsx:180-210`.

---

### Set6 · Sign-up has no terms or privacy consent

**Severity:** Medium · **Screen:** Sign up

**What the user sees.** Name, username, email, password, “Create account”, “Continue with Google”, and “Already have an account?”. The footer says “Track spending in under five seconds.” There is no checkbox and no line saying “By creating an account you agree to the Terms and Privacy Policy”, even though both pages exist.

**Why it matters.** Users are agreeing to data processing without being shown the terms. This is a legal and trust gap, and it is inconsistent with the Legal section in Settings.

**Recommended fix.** Add a short consent line with links to `/terms` and `/privacy` below the submit button, and a checkbox if required in the target jurisdiction. Do not pre-check it.

**Source.** `client/src/pages/sign-up.tsx:280-358`; `client/src/pages/settings.tsx:305-360`.

---

### Set7 · Sign out is a long scroll away and unconfirmed

**Severity:** Low · **Screen:** Settings

**What the user sees.** “Sign out” is the last item on the Settings page, below Legal, styled as an outline button. Tapping it signs out immediately; there is no confirmation.

**Why it matters.** On a shared device, an accidental tap logs the user out. The placement also makes a common action hard to find.

**Recommended fix.** Move sign out into the Account section near the profile, and add a confirmation sheet (“Sign out of Ledg?”) or an undo toast. Keep it visually secondary but not buried.

**Source.** `client/src/pages/settings.tsx:365-390`.

---

### Set8 · Profile edits and account deletion are strong, but hidden

**Severity:** Low · **Screen:** Profile

**What the user sees.** Profile supports name, username, email, password change, and a delete-account flow that requires typing the account name. These are good patterns, but they are two taps from Settings and not mentioned anywhere else.

**Why it matters.** Users who want to change their password or delete their account may not find Profile because Settings is titled “You” and the profile card looks like a static header.

**Recommended fix.** Add “Account & security” as a labelled row in Settings, and link to Profile from the avatar menu. Keep the type-to-confirm deletion.

**Source.** `client/src/pages/profile.tsx:288-340,546-600`; `client/src/pages/settings.tsx:103-150`.

---

## 13. Notifications and feedback

### Not1 · The badge double-counts pending invitations

**Severity:** Medium · **Screen:** Header, Notifications

**What the user sees.** The bell badge count is `unread notifications + pending invitations` (`client/src/components/notifications/notification-center.tsx:110`). The aria-label separately says “X unread, Y pending invitations”, but the visible badge is a single number. A user with 2 unread notifications and 1 pending invite sees “3”.

**Why it matters.** The number does not match the “Unread” count inside the sheet, which can confuse users trying to clear the badge. The badge also stays non-zero after “Mark all as read” because pending invites remain.

**Recommended fix.** Decide what the badge means. Prefer unread notifications only, and show pending invitations as a separate dot or count inside the sheet. If the combined count is intentional, label it “3 items need attention” and keep the internal counts consistent.

**Source.** `client/src/components/notifications/notification-center.tsx:110,169-180,192-210`.

---

### Not2 · Some notification types do nothing when tapped

**Severity:** Medium · **Screen:** Notifications

**What the user sees.** Tapping a notification marks it read and, if it has `data.spaceId` and is not `space_deleted`, navigates to the space (`client/src/components/notifications/notification-center.tsx:138-147`). Notifications without a space ID, and `space_deleted` notifications, only mark as read. There is no detail view, no “view” affordance and no explanation.

**Why it matters.** A tap that produces no visible change feels broken. Users cannot tell whether the notification was opened, dismissed or ignored.

**Recommended fix.** For notifications without a destination, open a detail sheet with the full message and a relevant action (“View dues”, “Open settings”). For `space_deleted`, explain that the space no longer exists. Always show a pressed/visited state.

**Source.** `client/src/components/notifications/notification-center.tsx:138-147,300-360`.

---

### Not3 · Notifications cannot be dismissed individually

**Severity:** Low · **Screen:** Notifications

**What the user sees.** The sheet supports “Mark all as read” and accept/reject for invitations, but there is no per-item dismiss, archive or clear-all. Read notifications stay in the list forever.

**Why it matters.** Over time the list becomes a historical log with no way to tidy it. The distinction between “read” and “done” is missing.

**Recommended fix.** Add swipe-to-dismiss or an overflow “Remove” per item, plus “Clear read notifications” with confirmation. Keep invitations until accepted/rejected.

**Source.** `client/src/components/notifications/notification-center.tsx:192-360`.

---

### Not4 · Feedback is toast-only for most mutations

**Severity:** Medium · **Screens:** All

**What the user sees.** Successful saves, deletes, imports and settings changes produce a toast. Errors also produce a toast. There is no inline state, no persistent confirmation and no error boundary message for many flows.

**Why it matters.** Toasts disappear, can be missed, and are not associated with the control that failed. For destructive actions, a toast is the only confirmation that the action happened. For errors, the user may not know what to retry.

**Recommended fix.** Use inline status for forms, a persistent success state for destructive actions (“Transaction deleted · Undo”), and an error panel with a retry for page-level failures. Reserve toasts for lightweight, non-critical confirmations.

**Source.** `client/src/components/transactions/transaction-form.tsx:236-245`; `client/src/components/settings/import-transactions-sheet.tsx:106-127`; `client/src/pages/spaces.tsx:218-247`.

---

## 14. Accessibility

### Acc1 · Primary and hero text fail contrast

**Severity:** High · **Screens:** Home, Dues, Auth, all primary buttons

**What the user sees.** White text on the brand green measures **3.26:1** in light mode (`--primary: oklch(0.62 0.145 158)`, `--primary-foreground: oklch(0.985 0.005 120)`). That is below the 4.5:1 required for normal text and only barely above the 3:1 large-text threshold. Hero subtext at 70% opacity measures about **2.3:1**. The same green is used for primary buttons, the Dues hero, the welcome CTA and the central “+”.

**Why it matters.** Low-vision users, older users and anyone in bright sunlight will struggle to read the most important labels and buttons. The hero is the first thing a user sees, and its secondary labels (“this month”, “Net receivable”) are the least readable.

**Recommended fix.** Darken the primary green or use a darker foreground for normal-size text. Target at least 4.5:1 for body and button labels, 3:1 for large text. Raise hero subtext to full opacity or use a darker overlay. Re-check every combination with a contrast tool; do not rely on the design token’s appearance.

**Source.** `client/src/global.css:52-67`; `client/src/pages/dashboard.tsx:90-144`; `client/src/pages/dues.tsx:150-230`.

---

### Acc2 · Dark mode keeps a luminous green hero

**Severity:** Medium · **Screens:** Home, Dues

**What the user sees.** In dark mode, the page background is near-black, cards are dark, and the Home/Dues hero remains a saturated bright green block with dark text. The 70%-opacity subtext measures about **4.2:1**, below AA for normal text. The bright block is visually disconnected from the rest of the interface.

**Why it matters.** Dark mode is often chosen for comfort or light sensitivity; a large luminous panel defeats that. The inverted foreground also makes the hero feel like a different design system.

**Recommended fix.** Use a darker green surface in dark mode (or a subtle gradient with a dark base), keep the accent for borders and icons, and raise subtext contrast. Test the hero in both themes at 200% zoom.

**Source.** `client/src/global.css:90-105`; `client/src/pages/dashboard.tsx:90`; `client/src/pages/dues.tsx:152`.

---

### Acc3 · Bottom-nav labels are 8.8 px

**Severity:** High · **Screens:** All

**What the user sees.** The five bottom-nav labels use `text-[0.55rem]`, which is 8.8 px at the default root size (`client/src/components/layout/bottom-nav.tsx:91`). The icons are 18.4 px. The labels are the only text identifying the destinations.

**Why it matters.** 8.8 px is below any reasonable minimum for readable UI text, especially for users with low vision or on a high-density phone. The labels are also the only non-icon cue, so losing them makes the nav ambiguous.

**Recommended fix.** Use at least 11–12 px for tab labels, and 12–14 px for body text. Increase the nav height and icon size accordingly. Test at 200% text zoom and with the system font size increased.

**Source.** `client/src/components/layout/bottom-nav.tsx:91,117-123`.

---

### Acc4 · Keyboard and switch users cannot open spaces or delete rows

**Severity:** High · **Screens:** Spaces, Activity, Home

**What the user sees.** Space cards are clickable `<div>`s with no tab stop (S2). Transaction rows are real buttons, so edit is reachable, but delete is a swipe gesture with no keyboard equivalent (Act1). The focus-visible ring on the space card never appears because the card cannot receive focus.

**Why it matters.** These are core tasks: open a space, edit a transaction, delete a mistake. A keyboard-only user can tab to the edit/delete icon buttons on a space card but cannot open the card itself. A switch user cannot perform the swipe at all.

**Recommended fix.** Use semantic links/buttons for all clickable cards and rows, add visible focus styles, and provide a visible action menu for delete. Ensure the tab order follows the visual order and that the sheet traps focus and returns it on close.

**Source.** `client/src/pages/spaces.tsx:360-385`; `client/src/components/transactions/swipeable-transaction-item.tsx:28-75`; `client/src/components/transactions/transaction-item.tsx:18-111`.

---

### Acc5 · Motion does not respect the OS preference by default

**Severity:** High · **Screens:** All

See Set2. The default is Full, and Framer Motion animations are not covered by the CSS `.reduce-motion` class.

**Source.** `client/src/app/providers/index.tsx:20`; `client/src/lib/animation-provider.tsx:21-46`; `client/src/components/common/page-transition.tsx`.

---

### Acc6 · Several tap targets are below 44 px

**Severity:** Medium · **Screens:** Dues, Spaces, Notifications, Activity

**What the user sees.** The Dues view toggle buttons are `size-7` (28 px). The Dues search toggle is `size-8` (32 px). Space card edit/delete icons are roughly 28–32 px. The pagination links are small. The bottom-nav labels sit in a 44 px-ish row but the actual link area is compact.

**Why it matters.** Small targets cause mis-taps, especially for users with motor impairments or on a phone held one-handed. The Dues view toggle is particularly risky because the two icons are adjacent and change the layout.

**Recommended fix.** Enforce a 44 × 44 px minimum for all interactive controls, with at least 8 px between adjacent targets. Increase the visual size where needed, and use padding to expand the hit area without changing the icon size.

**Source.** `client/src/pages/dues.tsx:288-315`; `client/src/pages/spaces.tsx:485-506`; `client/src/components/ui/pagination.tsx`.

---

### Acc7 · Form labels are not programmatically associated

**Severity:** Medium · **Screens:** Add/Edit transaction, Create due

**What the user sees.** The Date and Space labels are plain `<label>` elements without `htmlFor` (`client/src/components/transactions/transaction-form.tsx:387-416`). The Create due form uses labels without `htmlFor` for name, phone, date, due date, payment and note. The category and payment groups use `role="group"` with `aria-labelledby`, which is good, but the individual fields are not consistently labelled.

**Why it matters.** Screen readers may announce the control without its label, or announce the wrong one. Clicking the label does not focus the field. This is a basic form accessibility gap.

**Recommended fix.** Give every input a unique `id` and associate its `<label htmlFor>`. For custom pickers (DatePicker, Select), pass an `aria-label` or `aria-labelledby` to the trigger. Add `aria-describedby` for hints and errors.

**Source.** `client/src/components/transactions/transaction-form.tsx:387-470`; `client/src/components/dues/create-due-sheet.tsx:230-430`.

---

### Acc8 · Meaning relies on colour alone in several places

**Severity:** Medium · **Screens:** Home, Activity, Insights, Dues

**What the user sees.** Income is green with a down-left arrow; expense is red with an up-right arrow. Delta badges use green/red plus an arrow whose direction is semantic, not numeric (I2). Space balances turn red when negative. Overdue banners are red. In each case, colour is the fastest cue and sometimes the only one.

**Why it matters.** Colour-blind users may not distinguish green from red, especially the muted variants used on cards. The arrow helps with direction in transaction rows, but the colour semantics differ between Dues and Activity (D6), so the cue is not reliable across screens.

**Recommended fix.** Pair colour with text or shape: “Income” / “Expense” labels, “+” / “−” signs, “Overdue” text, and a distinct icon. Ensure contrast ratios hold for both colours. Do not use colour as the only indicator of a destructive or overdue state.

**Source.** `client/src/components/transactions/transaction-item.tsx:28-50`; `client/src/pages/analytics.tsx:40-57`; `client/src/pages/dues.tsx:230-250`; `client/src/pages/spaces.tsx`.

---

### Acc9 · The bottom nav has no safe-area padding

**Severity:** Medium · **Screens:** All on iPhone

**What the user sees.** The bottom nav is `fixed bottom-0` with `pb-4` (16 px), but no `env(safe-area-inset-bottom)`. On an iPhone with a home indicator, the nav sits under or too close to the system gesture area.

**Why it matters.** The primary navigation can be partially obscured or conflict with the home gesture, causing mis-taps and an unfinished feel on iOS.

**Recommended fix.** Add `padding-bottom: calc(1rem + env(safe-area-inset-bottom))` and `padding-bottom` to the main content to match. Test in Safari with the home indicator visible.

**Source.** `client/src/components/layout/bottom-nav.tsx:43`; `client/src/components/layout/app-shell.tsx:12`.

---

### Acc10 · No skip link or landmark structure

**Severity:** Low · **Screens:** All

**What the user sees.** The app has a `<main>` and `<nav>`, but no “Skip to content” link, no `<h1>` on several screens (Dues uses a `<span>` for “Dues & Loans”), and repeated sections use `<h2>` without a consistent hierarchy.

**Why it matters.** Keyboard and screen-reader users benefit from a skip link and a predictable heading outline. The single-column layout reduces the need, but the sheet-heavy navigation makes focus management important.

**Recommended fix.** Add a visually hidden “Skip to content” link, ensure one `<h1>` per screen, and use consistent heading levels. Announce route changes to screen readers.

**Source.** `client/src/components/layout/app-shell.tsx`; `client/src/pages/dues.tsx:150-170`.

---

## 15. Visual design, dark mode and responsiveness

### V1 · Desktop is not designed, only centred

**Severity:** High · **Screens:** All

See N4. The app is a 448 px column at every width. The visual identity is strong on mobile, but on desktop the empty canvas, floating phone nav and mobile sheets make it feel like a preview. This is the single biggest visual gap.

**Source.** `client/src/components/layout/app-shell.tsx:11`; `client/src/components/layout/bottom-nav.tsx:43`.

---

### V2 · Dark mode is a palette swap, not a designed theme

**Severity:** Medium · **Screens:** Home, Dues, sheets

**What the user sees.** The dark palette is coherent for cards and text, but the hero remains bright green, the glass effects become dark-on-dark, and some translucent overlays lose their separation. The result is readable in most places but visually uneven.

**Why it matters.** Dark mode is a first-class preference, not an afterthought. A bright hero in an otherwise dark interface causes glare and breaks the calm the design is trying to achieve.

**Recommended fix.** Design the dark hero separately: a deep green surface, lighter text, and accent borders instead of a full bright fill. Revisit the glass tokens in dark mode and test every screen at night brightness.

**Source.** `client/src/global.css:90-130`; `client/src/pages/dashboard.tsx:90`; `client/src/pages/dues.tsx:152`.

---

### V3 · Tiny type is used for real information

**Severity:** Medium · **Screens:** All

**What the user sees.** Bottom-nav labels 8.8 px; category labels 10.4 px; dues badges 8.8 px; “this month” 10.4 px; many secondary labels 10–11 px. These are not decorative; they carry meaning.

**Why it matters.** Small type is the most common readability complaint in finance apps, especially for older users. It also fails at 200% zoom when containers are fixed.

**Recommended fix.** Set a 12 px floor for meaningful secondary text and 14 px for body. Use weight and colour for hierarchy instead of shrinking. Test with browser text zoom at 200%.

**Source.** `client/src/components/layout/bottom-nav.tsx:91`; `client/src/components/transactions/transaction-form.tsx:380`; `client/src/pages/dues.tsx:220-245`.

---

### V4 · Animation is decorative and sometimes distracting

**Severity:** Medium · **Screens:** All

**What the user sees.** Page fade transitions, staggered card entrances, spring hover/tap on cards and buttons, a pulsing ring around the central “+”, a pulsing overdue badge, animated progress bars and layout animations on the bottom nav. The cumulative effect is lively but busy for a finance app.

**Why it matters.** Motion should clarify state, not decorate every interaction. The infinite pulse on the “+” draws the eye constantly; the staggered lists slow scanning; the page fade adds latency to every navigation. Users with vestibular sensitivity are affected (Set2).

**Recommended fix.** Keep motion for meaningful transitions (sheet open/close, success confirmation) and remove infinite pulses and staggered entrances. Respect reduced motion by default. Reduce durations to 120–160 ms and avoid animating layout properties.

**Source.** `client/src/components/layout/bottom-nav.tsx:64-77`; `client/src/components/common/page-transition.tsx`; `client/src/components/layout/header.tsx:47`.

---

### V5 · Page headers are inconsistent

**Severity:** Low · **Screens:** Home, Activity, Insights, Spaces, Dues, Settings

**What the user sees.** Home has a greeting header with avatar, Dues pill and bell. Activity and Insights have plain `<h1>` titles. Spaces has a title plus a “New space” button. Dues has a custom hero with “Dues & Loans”. Settings says “You”. Profile has a back arrow.

**Why it matters.** The app feels assembled from different screen templates. Users cannot rely on a consistent place for the page title, back action or primary action.

**Recommended fix.** Define one page-header pattern: optional back, title, optional subtitle, one primary action, optional overflow. Apply it to every top-level screen, with the Home greeting as a deliberate variant.

**Source.** `client/src/pages/dashboard.tsx:86`; `client/src/pages/transactions.tsx:122-160`; `client/src/pages/analytics.tsx:217-230`; `client/src/pages/spaces.tsx:255-275`; `client/src/pages/settings.tsx:103`.

---

## 16. Copy, terminology and consistency

### ✅ C1 · “Total Balance” and “Active” do not mean what they say

**Severity:** High · **Screen:** Home

**Status:** ✅ Fixed.

See T2 and H5. “Balance” implies available money; the number is all-time net. “Active” implies a status; it is decorative.

**Source.** `client/src/pages/dashboard.tsx:93-99`.

---

### C2 · Dues uses finance jargon and mixed metaphors

**Severity:** Medium · **Screens:** Dues, Create due, Due detail

**What the user sees.** “Dues & Loans”, “Net receivable”, “Net payable”, “Owed to you”, “You owe”, “I Lent”, “I Borrowed”, “Record Lending”, “Record Settlement”, “Principal”, “Partially settled”. The same page mixes personal language (“I Lent”) with accounting language (“Net receivable”).

**Why it matters.** The target user is not an accountant. “Net receivable” is not a phrase most people use about a friend who owes them dinner money. The mixed register makes the feature feel more complicated than it is.

**Recommended fix.** Pick a personal vocabulary: “Owed to you”, “You owe”, “Lent”, “Borrowed”, “Settled”. Keep “principal” only in a tooltip or detail view. Use “Record payment” instead of “Record Settlement” where possible.

**Source.** `client/src/pages/dues.tsx:200-250`; `client/src/components/dues/create-due-sheet.tsx:174-210`; `client/src/components/dues/due-detail-sheet.tsx:160-210`.

---

### ✅ C3 · “Creates an expense transaction” is contradictory

**Severity:** High · **Screen:** Create due

**Status:** ✅ Fixed — the helper copy now reads “tracked as a loan, not spending/income”.

See D1. The copy tells the user that lending is spending, which is the core confusion.

**Source.** `client/src/components/dues/create-due-sheet.tsx:210`.

---

### C4 · “Less than five seconds, promise” is not true

**Severity:** Low · **Screen:** Add transaction

See A11.

**Source.** `client/src/components/transactions/transaction-form.tsx:252`.

---

### C5 · “Activity” vs “Transactions” vs “Records”

**Severity:** Low · **Screens:** Nav, Activity, Settings, Import

See Act6. Choose one noun and use it everywhere.

**Source.** `client/src/components/layout/bottom-nav.tsx:24`; `client/src/pages/transactions.tsx:125`; `client/src/pages/settings.tsx:253-295`.

---

### C6 · The Settings page is called “You”

**Severity:** Medium · **Screen:** Settings

See Set1. “You” is a profile label, not a settings label.

**Source.** `client/src/pages/settings.tsx:103`.

---

### C7 · “Full Motion” is ambiguous

**Severity:** Low · **Screen:** Settings → Motion

**What the user sees.** Options “Full Motion”, “Reduced Motion”, “System”. “Full” sounds like the recommended default; “System” sounds technical.

**Why it matters.** The safest option for accessibility is “System”, but the labels nudge users toward “Full”. The descriptions do not explain what changes.

**Recommended fix.** Label them “All animations”, “Reduced animations”, “Match my device”. Add a one-line description and make “Match my device” the default.

**Source.** `client/src/pages/settings.tsx:84-90,428-470`; `client/src/lib/animation-provider.tsx`.

---

### C8 · The invite error is ungrammatical

**Severity:** Medium · **Screen:** Invite

See S9. “This invitation link is invalid, expired, or has already been used not found” is a concatenation bug.

**Source.** `client/src/pages/invite.tsx:105-125`.

---

### C9 · “Set a repayment reminder” promises a reminder

**Severity:** Medium · **Screen:** Create due

See D5.

**Source.** `client/src/components/dues/create-due-sheet.tsx:340`.

---

### C10 · “Over budget” uses no currency and the wrong concept

**Severity:** Medium · **Screen:** Insights

See I4.

**Source.** `server/src/domains/analytics/service.ts:317-330`.

---

### C11 · “Personal” is a default, not a choice

**Severity:** Low · **Screens:** Spaces, Add transaction

**What the user sees.** Every new account gets a space named “Personal”. The name is not explained, cannot be changed from onboarding, and is the default destination for the global “+”.

**Why it matters.** “Personal” is a reasonable default, but users with a different mental model (e.g. “Cash”, “Household”) have to rename it or create another space. The default also drives the wrong-space behaviour in N2.

**Recommended fix.** During onboarding, ask “What should we call your first space?” with “Personal” prefilled. Let users rename it in one tap from the empty state. Use the last-used space as the default for new transactions.

**Source.** `server/src/domains/spaces/repository.ts:200-215`; `client/src/lib/transaction-form.tsx:38-44`.

---

## 17. Empty, loading and error states

### ✅ E1 · Errors are rendered as empty or zero

**Severity:** Critical · **Screens:** Home, Insights, Spaces, Space detail

**Status:** ✅ Fixed — see T3. Every query-backed screen and sheet now has an explicit error branch with retry, and unknown values render as “—” rather than zero.

See T3. This is the most important state bug in the app. Every query-backed screen needs an error branch.

**Source.** `client/src/pages/dashboard.tsx:104`; `client/src/pages/analytics.tsx:203-207`; `client/src/pages/spaces.tsx:59`; `client/src/pages/space-detail.tsx:194`.

---

### E2 · Loading states are inconsistent

**Severity:** Medium · **Screens:** All

**What the user sees.** Home uses skeletons for the hero and recent activity. Activity uses skeletons. Insights uses a single skeleton block. Dues uses a spinner with “Loading dues...”. Spaces uses a skeleton grid. The differences are not tied to content shape, so the page jumps when data arrives.

**Why it matters.** Layout shift makes the app feel slower and less stable. A spinner in one place and a skeleton in another suggests different teams built the screens.

**Recommended fix.** Use skeletons that match the final layout for every list and card, with a shared component. Reserve space for the hero and cards. Avoid full-page spinners except for route transitions.

**Source.** `client/src/pages/dashboard.tsx:150-160,335-345`; `client/src/pages/analytics.tsx:192-200`; `client/src/pages/dues.tsx:310-325`; `client/src/pages/spaces.tsx:320-345`.

---

### E3 · The Insights empty state has no action

**Severity:** Medium · **Screen:** Insights

**What the user sees.** “No data for this period” with “Try selecting a different period or add new transactions.” There is no button to change the period or add a transaction; the user must find the controls themselves.

**Why it matters.** An empty state should offer the next step, not describe it. On a page with a period selector and a space selector, “try selecting” is vague.

**Recommended fix.** Add two buttons: “View this month” and “Add a transaction”. If the selected space has no data, offer “View all spaces”. Keep the copy short.

**Source.** `client/src/pages/analytics.tsx:341-350`.

---

### ◐ E4 · No offline or retry affordance

**Severity:** Medium · **Screens:** All

**Status:** ◐ Partly fixed — the app shell shows a global offline banner, and every query-backed screen now uses `isError`/`refetch` with a visible retry. Still open: “Last updated” timestamps on Home and Insights.

**What the user sees.** When the network drops, requests fail and the page shows zeros or empty states (T3). There is no offline banner, no “Retry” button on most screens, and no indication that the data is stale.

**Why it matters.** Mobile users are often on unreliable connections. Without a retry, the only recovery is to reload the page or navigate away and back.

**Recommended fix.** Add a global connection banner and per-screen retry. Use React Query’s `isError` and `refetch` consistently. Show “Last updated” timestamps on dashboards.

**Source.** `client/src/lib/queries.ts`; `client/src/pages/transactions.tsx:241-252`.

---

### E5 · Import errors are truncated and not exportable

**Severity:** Medium · **Screen:** Import

**What the user sees.** Up to six row errors are shown, with “+N more” for the rest. There is no way to download the full error list, and the row numbers refer to the file, not the preview.

**Why it matters.** A 500-row import with 40 errors cannot be fixed from the UI. The user has to guess which rows failed and re-upload repeatedly.

**Recommended fix.** Add “Download error report (CSV)” with row number, field, value and reason. Show the first few inline and link to the report. Keep the file on screen so the user can compare.

**Source.** `client/src/components/settings/import-transactions-sheet.tsx:212-230,338-402`.

---

### E6 · Success feedback for destructive actions is transient

**Severity:** Medium · **Screens:** Activity, Spaces, Dues

**What the user sees.** “Transaction deleted”, “Deleted ‘Personal’”, “Due deleted” appear as toasts that disappear. There is no undo (except settlement undo), no persistent confirmation, and no way to verify the deletion after the toast is gone.

**Why it matters.** For destructive actions, the user needs a clear, durable confirmation and ideally an undo. A toast is easy to miss, especially if the list re-renders at the same time.

**Recommended fix.** Use an undo toast with a 5–10 second window for deletions, and a persistent inline confirmation (“Deleted · Undo”) until the next navigation. For spaces, show what was deleted and how many transactions were removed.

**Source.** `client/src/components/transactions/delete-transaction-sheet.tsx:26-45`; `client/src/pages/spaces.tsx:240-250`; `client/src/components/dues/due-detail-sheet.tsx:93-110`.

---

## 18. What works well

It is easy to write an audit that only lists problems. Ledg has real strengths, and the fixes should protect them.

- **A distinct visual identity.** The green palette, rounded cards, soft shadows and generous spacing give the app a calm, premium feel. It does not look like a generic dashboard.
- **Amount-first transaction entry.** Opening the sheet with the amount focused and a numeric keyboard is the right instinct. The quick-date chips and “repeat a recent transaction” row are thoughtful shortcuts.
- **Category icons and colours.** The category system is visually clear and makes scanning a transaction list fast. The colour-coded icons carry through Home, Activity and Insights.
- **Dues grouping by person.** The “group by person” view is the right default for a loans feature. Expanding a person to see their individual dues matches how people think about money between friends.
- **The dues summary card.** When it appears, it gives a compact “owed to you / you owe” overview and a clear entry point. The net figure is useful once the accounting is fixed.
- **Space filters and budget bars.** “All / Personal / Shared” with counts, plus a monthly budget bar with an over-budget state, gives shared spaces a sense of progress.
- **The invite preview.** Showing the space, inviter, invited email and expiry before accepting is a strong trust pattern. The email-mismatch warning is especially good.
- **Import preview.** File name, date range, row count, skipped-row errors and a duplicate toggle are exactly the right things to show before a bulk write. The result summary is clear.
- **Theme and motion settings exist.** Offering light/dark/system and full/reduced/system is more than many apps do. The implementation needs to default to system, but the controls are there.
- **Accessibility basics in places.** Icon-only buttons generally have `aria-label`s, the sheet uses a real dialog title, the amount field has an `sr-only` label, and some focus-visible rings are defined.
- **Skeletons and empty states.** Most screens have a loading state and a written empty state, even if they are inconsistent. The app rarely shows a blank white screen.
- **Haptics on the central “+”.** A small touch that makes the primary action feel physical on supported devices.

---

## 19. Recommended roadmap

The roadmap is ordered by user risk, not by engineering convenience.

### Now — the trust release (1–2 weeks)

**Goal:** A user can trust every number on the screen.

1. ✅ **Fix dues accounting (T1).** Either exclude loan principal/settlements from spend, income, budgets and savings, or introduce a distinct loan transaction type and exclude it by default. Reclassify existing “Due paid” / “Due received” entries.
2. ✅ **Define Total Balance (T2).** Rename it, add a caption, and show receivables/payables beside it. Remove the “Active” pill. The dues summary card directly below the hero shows receivables and payables.
3. ✅ **Add error states everywhere (T3).** Never render `0` for a failed query. Add retry and an offline banner. Start with Home, Insights, Spaces and Space detail.
4. **Fix the invite redirect (S1).** Preserve `state.from` and the invite token through sign-in, sign-up and email verification.
5. **Fix the add-transaction data loss (A2).** Nested create-space flow or remove the option.
6. **Sticky primary action (A1).** Move the button outside the scroll area and collapse optional fields.

**Success measure:** In a moderated test, no participant reports that lending money changed their monthly spending, and every participant can add a transaction without scrolling.

### Next — the core-flow release (2–4 weeks)

**Goal:** The app is fast and predictable for daily use.

7. **Dues in the navigation (N1/N3).** Add it as a tab or a persistent header entry with an active state and overdue badge.
8. **Context-aware “+” (N2).** Preselect the current space; on Dues, offer due creation.
9. **Visible delete and edit actions (Act1).** Add a row menu and undo; keep swipe as a shortcut.
10. **Inline validation (A3).** Field-level errors, focus management and disabled-until-valid.
11. **Keyboard access (S2/Acc4).** Semantic cards, focus rings, tab order and a skip link.
12. **Contrast and type (Acc1/Acc3).** Fix the primary green, hero subtext and 8.8 px labels.
13. **Reduced motion by default (Set2).** Default to system; the existing `MotionBridge` already maps it to `reducedMotion="user"`.
14. **Personal space deletion (T4).** Stop recreating it; prevent deleting the last space with a clear message.
15. **Import undo (T5).** Batch ID and one-tap undo, plus an error report download.

**Success measure:** A keyboard-only user can complete “open a space, add a transaction, edit it, delete it” without a mouse. A user who deletes Personal does not see it return.

### Later — the polish and scale release (4–8 weeks)

**Goal:** The app feels finished on every device and in every state.

16. **Desktop layout (N4/V1).** Sidebar or top nav, wider content, multi-column Home/Insights, dialogs instead of bottom sheets.
17. **Settings IA (Set1).** Rename to Settings, group Account/Preferences/Data/Legal, add password reset and terms consent.
18. **Dues editing and reminders (D2/D5).** Edit due, real reminders, linked transaction view.
19. **Activity filters and bulk actions (Act2/Act5).** Date, category, payment method, bulk delete.
20. **Insights clarity (I2/I3/I4).** Directional deltas, negative savings, currency formatting.
21. **Notification centre (Not1–Not3).** Separate badge counts, detail view, per-item dismiss.
22. **Currency setting (T8).** Locale default and a single formatter.
23. **Copy and empty-state pass (Section 16/17).** One vocabulary, one header pattern, one loading pattern.

---

## 20. How to validate the fixes

### Moderated usability tests

Run 5–8 sessions with people who track expenses, including at least two who use shared expenses and two who use a keyboard or screen reader. Give each participant a small set of tasks and observe, without guiding.

**Tasks:**

1. “Add a Rs. 450 lunch expense to your Goa Trip space.”
2. “You lent a friend Rs. 5,000. Record it, then tell me how much you spent this month.”
3. “Find the money you lent and record a partial repayment.”
4. “Open your Household space and add an expense there using the big plus button.”
5. “Accept the invitation in this link. You don’t have an account yet.”
6. “Delete the Personal space. Now reload. What do you expect to see?”
7. “Show me last month’s spending by category.”
8. “Find and delete the Rs. 450 lunch expense using only the keyboard.”
9. “Import this CSV, then undo the import.”
10. “Change the app to reduce motion without using the Settings page.” (Tests whether the OS preference is respected.)

**What to measure:**

- Task success rate (target: 90% for tasks 1, 3, 4, 7; 100% for 2, 5, 6, 8 after fixes).
- Time on task for task 1 (target: under 15 seconds on a 360 px screen).
- Number of wrong-space entries (target: 0).
- Number of participants who believe lending is spending (target: 0).
- Number of participants who find Dues without being told (target: 100%).
- Number of participants who notice the delete action (target: 100%).

### Accessibility checks

- Run axe or Lighthouse on every route; fix all serious and critical issues.
- Check contrast for every text/background pair, including hero subtext, buttons, badges and disabled states. Target 4.5:1 for normal text, 3:1 for large text.
- Navigate the entire app with the keyboard only: tab order, focus visibility, sheet focus trap, Escape to close, focus return.
- Test with a screen reader (VoiceOver on iOS/Safari and NVDA on Windows/Chrome) on Home, Add transaction, Activity, Dues and Invite. This audit did not include physical screen-reader testing; the fix validation should.
- Test at 200% browser zoom and with the OS font size increased. Check for clipping and horizontal scroll.
- Test with `prefers-reduced-motion: reduce` set at the OS level and confirm no Framer Motion animations run before the user changes Settings.
- Test on a real iPhone with a home indicator and on a 360 px Android device.

### Data-integrity checks

- Write an automated test that creates a lent due, a borrowed due, a partial settlement and a full settlement, then asserts that spend, income, budgets and savings exclude the loan principal and settlements (or include them only in a clearly labelled loan category).
- Assert that Total Balance equals the documented formula for a fixture with known transactions, dues and spaces.
- Assert that deleting a due removes its linked transaction, and that undoing a settlement restores the previous state.
- Assert that deleting the last Personal space does not recreate it on the next fetch.
- Assert that an import batch can be undone and leaves no orphaned spaces.
- Add a reconciliation check: for every space, sum of transactions equals the space’s displayed income/expense totals.

### Regression checks after each release

- Re-run the 10 tasks above with at least two participants.
- Re-check the five highest-traffic screens in light and dark mode at 360, 390 and 1280 px.
- Re-check the invite flow from a signed-out browser with a fresh account and an existing account.
- Re-check the error states by blocking the API in DevTools and confirming a retry path appears.
- Re-check the contrast tokens after any theme change.

### Metrics to watch

- Add-transaction completion rate and time.
- Percentage of transactions created in the “wrong” space (measured by undo/move events).
- Invite acceptance rate for signed-out recipients.
- Dues creation and settlement completion.
- Support messages about “missing money” or “wrong balance”.
- Import undo usage and import error rate.
- Accessibility audit score and keyboard-task success.

---

## 21. Appendix: screens and source references

### Screen inventory

| Screen | Route | Main component |
|---|---|---|
| Welcome | `/welcome` | `client/src/pages/welcome.tsx` |
| Sign in | `/sign-in` | `client/src/pages/sign-in.tsx` |
| Sign up | `/sign-up` | `client/src/pages/sign-up.tsx` |
| Invite | `/invite/:token` | `client/src/pages/invite.tsx` |
| Home | `/` | `client/src/pages/dashboard.tsx` |
| Activity | `/transactions` | `client/src/pages/transactions.tsx` |
| Insights | `/analytics` | `client/src/pages/analytics.tsx` |
| Spaces | `/spaces` | `client/src/pages/spaces.tsx` |
| Space detail | `/spaces/:id` | `client/src/pages/space-detail.tsx` |
| Dues | `/dues` | `client/src/pages/dues.tsx` |
| Settings | `/settings` | `client/src/pages/settings.tsx` |
| Profile | `/profile` | `client/src/pages/profile.tsx` |
| Privacy | `/privacy` | `client/src/pages/privacy-policy.tsx` |
| Terms | `/terms` | `client/src/pages/terms-of-service.tsx` |

### Key source references

| Area | File and lines | What it shows |
|---|---|---|
| Dues create writes a transaction | `server/src/domains/dues/service.ts:91-160` | `txnType = isLent ? "expense" : "income"`; `TransactionModel.create` |
| Dues settle writes the reverse | `server/src/domains/dues/service.ts:187-267` | `txnType = isLent ? "income" : "expense"` |
| Dues undo/delete cleanup | `server/src/domains/dues/service.ts:269-345` | Deletes linked transactions and settlements |
| Total Balance formula | `server/src/domains/analytics/service.ts:463-465` | `allTime.totalIncome - allTime.totalExpense` |
| Insights deltas | `server/src/domains/analytics/service.ts:376-410` | Period-over-period percentages |
| Insights copy | `server/src/domains/analytics/service.ts:275-334` | Savings, category and “over budget” strings |
| Home hero and fallbacks | `client/src/pages/dashboard.tsx:90-160` | “Total Balance”, `?? 0`, compact formatting |
| Home categories | `client/src/pages/dashboard.tsx:180-244` | No title, period or total |
| Home recent activity | `client/src/pages/dashboard.tsx:323-350` | Swipeable rows |
| Add sheet layout | `client/src/components/transactions/transaction-form.tsx:300-500` | Long scroll, CTA at the bottom |
| New-space branch | `client/src/components/transactions/transaction-form.tsx:417-447` | `closeForm(); navigate("/spaces")` |
| Default space | `client/src/lib/transaction-form.tsx:38-44` | Prefers `type === "personal"` |
| Sheet shell | `client/src/components/ui/sheet.tsx:25-69` | No close button; internal scroll |
| Swipe delete | `client/src/components/transactions/swipeable-transaction-item.tsx:28-75` | Gesture-only delete |
| Activity filters | `client/src/pages/transactions.tsx:146-230` | Search, type, space only |
| Activity pagination | `client/src/pages/transactions.tsx:326-368` | Gaps without ellipses |
| Activity error state | `client/src/pages/transactions.tsx:241-252` | A real error message instead of zero; other pages lack one |
| Custom range default | `client/src/pages/analytics.tsx:124-127` | Both dates set to today |
| Delta badge | `client/src/pages/analytics.tsx:40-57` | Arrow encodes sentiment, not direction |
| Savings ring | `client/src/pages/analytics.tsx:61-90` | Spending/savings arcs and center rate |
| Negative savings clamp | `client/src/pages/analytics.tsx:203-209` | `Math.max(0, ...)` |
| Dues FABs | `client/src/pages/dues.tsx:485-510` | Fixed `bottom-24 right-5` |
| Dues grouping | `client/src/pages/dues.tsx:107-126` | Lowercased name as key |
| Dues create copy | `client/src/components/dues/create-due-sheet.tsx:174-210` | “creates an expense transaction” |
| Dues reminder copy | `client/src/components/dues/create-due-sheet.tsx:318-345` | “Set a repayment reminder” |
| Due detail actions | `client/src/components/dues/due-detail-sheet.tsx:314-345` | No edit; delete only when open and unsettled |
| Space card | `client/src/pages/spaces.tsx:360-385` | `Card onClick`, no keyboard access |
| Space card actions | `client/src/pages/spaces.tsx:480-506` | Edit/delete icons |
| Create-space toast | `client/src/pages/spaces.tsx:218-231` | Always “invitations sent” |
| Server invite results | `server/src/domains/spaces/service.ts:30-62` | `invited` / `failed` per identifier |
| Default space recreation | `server/src/domains/spaces/repository.ts:171-215` | Creates “Personal” when missing |
| Invite auth handoff | `client/src/pages/invite.tsx:180-210` | Passes `state.from` |
| Sign-in redirect | `client/src/pages/sign-in.tsx:42` | Always `navigate("/")` |
| Sign-up verification | `client/src/pages/sign-up.tsx:53-66,113-160` | `callbackURL` is `/` |
| Settings IA | `client/src/pages/settings.tsx:103-380` | “You”, preferences, data, legal, sign out |
| Motion default | `client/src/app/providers/index.tsx:19-21` | `defaultMotion="full"` |
| Motion provider | `client/src/lib/animation-provider.tsx:21-46` | Reduced only when selected |
| Bottom nav | `client/src/components/layout/bottom-nav.tsx:22-28,91` | Four tabs, 8.8 px labels |
| App shell | `client/src/components/layout/app-shell.tsx:11` | `max-w-md` |
| Colour tokens | `client/src/global.css:52-67,90-105` | Primary and dark palette |
| Reduced-motion CSS | `client/src/global.css:153-160` | CSS only, not Framer Motion |
| Notification badge | `client/src/components/notifications/notification-center.tsx:110` | Unread + pending invites |
| Notification click | `client/src/components/notifications/notification-center.tsx:138-147` | Only navigates with `spaceId` |
| Import sheet | `client/src/components/settings/import-transactions-sheet.tsx:106-135,338-402` | No undo |
| Import service | `server/src/domains/import/service.ts:97-266` | Dedupe, batch creation, space creation |
| Profile security | `client/src/pages/profile.tsx:288-340` | Password, email, delete account |

### Screenshot coverage

Screenshots were captured as working evidence during the review, not checked into the repository. The table records what was captured so the review can be repeated.

| Screen | 390 × 844 | 360 × 640 | 1280 × 900 |
|---|---|---|---|
| Welcome, sign in, sign up | Yes | — | — |
| Home, light | Yes | Yes | Yes |
| Home, dark | Yes | — | — |
| Add transaction, top and bottom | Yes | Yes | — |
| Activity, default and filters | Yes | — | — |
| Insights, month, custom and dark | Yes | — | Yes |
| Spaces, create space | Yes | — | — |
| Space detail, members | Yes | — | — |
| Dues, grouped, flat and create due | Yes | Yes | — |
| Due detail, settle due | Yes | — | — |
| Settings, top and bottom, profile | Yes | — | — |
| Notifications, invite states | Yes | — | — |

The screenshots were used to verify layout, contrast, truncation and overlap; claims about behaviour that a still image cannot show (failed requests, keyboard access, redirects, data side effects) were verified in the source. Line references are approximate and point to the relevant block, not necessarily the exact line after future edits.

### Review limitations

- Findings are based on a seeded demo account, not months of real personal data. Some patterns (for example, a very large number of categories or pages) were assessed from the code rather than observed at scale.
- Accessibility findings are based on the rendered DOM, computed colours and keyboard behaviour. No physical screen-reader session was run; the validation plan includes one.
- Email and push delivery were not tested. The “invitations sent” finding is about the UI claiming success, not about whether the email provider works.
- The audit does not assess security, privacy compliance or backend performance.
- Severity is a product judgement, not a formal risk score. It reflects how likely a real user is to be blocked, misled or lose data.

---

*End of audit.*
