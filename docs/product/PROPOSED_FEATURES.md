# Proposed Features

**Based on:** Current codebase state, PRD gaps, and Analytics Roadmap
**Date:** August 2026

---

## Priority 1 — Core Gaps (MVP Completeness)

These are features listed in the PRD as MVP goals that are still missing. Shipping these makes the MVP feel complete.

### 1. CSV Export
- Export all transactions (or filtered set) to CSV
- Backend endpoint + frontend export button with date-range filter
- Columns: date, type, amount, category, note, payment method, space
- **Effort:** Small (1-2 days)

### 2. Custom Categories (Per-Space)
- Categories are currently hardcoded in `categories.ts` — not stored in DB
- Add a Categories collection (per space) with CRUD
- Seed default categories on space creation
- Allow user-created categories with custom name, color, icon, type
- **Effort:** Medium (3-4 days)

### 3. Accounts Module
- No separate Accounts collection exists — only `paymentMethod` on transactions
- Add Accounts model: name, type (cash/bank/wallet/card), currency, balance, color
- Account CRUD + per-account balance computed from transactions
- Account selection in transaction form
- **Effort:** Medium (3-4 days)

### 4. PWA (Service Worker + Install Prompt)
- Manifest exists but no service worker
- Register service worker with stale-while-revalidate caching
- Add install prompt flow ("Add to Home Screen")
- Offline shell for cached pages
- **Effort:** Medium (2-3 days)

### 5. Server-Side Search
- Frontend currently does in-memory filtering only
- Add debounced server search endpoint across all spaces
- Global search UI (Command Palette / Ctrl+K)
- **Effort:** Medium (3-4 days)

---

## Priority 2 — High-Value Additions

Features that significantly improve the product experience without requiring a massive backend overhaul.

### 6. Budget Planning (Per-Space)
- `budget` and `savingsGoal` fields already exist on Space model — currently unused
- Allow setting monthly budget per space and per category
- Track actual vs budget with progress bars
- Alert when approaching or exceeding budget
- Budget summary on dashboard
- **Effort:** Medium (4-5 days)

### 7. Savings Goals
- Let users define savings goals (name, target amount, deadline)
- Show progress ring/bar with "on track" or "behind" status
- Estimated time to reach goal based on current savings rate
- **Effort:** Medium (3-4 days)

### 8. Spending Trend Chart (Analytics)
- Line/bar chart showing daily or monthly spending over time
- Use Recharts (already a dependency)
- Support hover tooltips, period toggle
- Income vs expense on the same chart
- **Effort:** Medium (3-4 days)

### 9. Recurring Transactions as User-Facing Feature
- Backend detection already exists (`/analytics/recurring`)
- Add a "Subscriptions & Recurring" section in the dashboard or analytics page
- Show detected patterns with frequency, avg amount, next expected date
- Let users confirm or dismiss detected recurrences
- **Effort:** Small-Medium (2-3 days)

### 10. Category Drill-Down in Analytics
- Analytics page already has category bars
- Make them clickable to open a bottom sheet with all transactions in that category
- Show total amount, transaction count, and list
- "See all in Transactions" link with pre-applied filter
- **Effort:** Small (1-2 days)

---

## Priority 3 — Engagement & Retention

Features that encourage daily use and build habit loops.

### 11. Daily Streak / Logging Habit Tracker
- Track consecutive days of transaction logging
- Show streak counter on dashboard (fire icon + day count)
- Milestone badges (7 days, 30 days, 100 days)
- **Effort:** Small (1-2 days)

### 12. Monthly Financial Summary (Notification/Email)
- End-of-month summary: total income, expense, savings rate, top category
- Push notification or email via Resend
- "Your March summary: saved Rs. 12,000 (22% savings rate)"
- **Effort:** Medium (3-4 days)

### 13. Quick-Add Templates
- Save frequent transactions as templates ("Morning Coffee", "Monthly Rent")
- One-tap to log from a template
- Pre-fills amount, category, note, payment method
- **Effort:** Small (2 days)

### 14. Income vs Expense Monthly Comparison Chart
- Grouped bar chart: 6 months side by side
- Green for net savings, red for deficit
- Net position trend line
- **Effort:** Small-Medium (2-3 days)

---

## Priority 4 — Collaboration (Phase 3 from PRD)

Shared Spaces is a major feature — plan it as a dedicated phase.

### 15. Shared Spaces (Members & Invites)
- `SpaceMember` model with roles (Owner, Admin, Member, Viewer)
- Invite by email with pending/active status
- Member management UI (invite, change role, remove)
- Role-based rendering (viewers see read-only)
- In-app invite notifications
- Leave space action
- **Effort:** Large (7-10 days)

---

## Priority 5 — Advanced / Future

These are bigger bets that require more infrastructure or external integrations.

### 16. Cash Flow Calendar
- Calendar view showing income (green) and expense (red) days
- Daily totals on each day
- Helps users plan for upcoming bills
- **Effort:** Medium (3-4 days)

### 17. Anomaly Detection
- Flag transactions that are 2x+ above the category average
- Show alerts: "You spent Rs. 15,000 on Shopping — 3x your average"
- Let users mark as "Expected" or "Investigate"
- **Effort:** Medium (3-4 days)

### 18. Receipt OCR
- Camera capture or image upload of receipts
- Extract amount, merchant, date via OCR API
- Auto-fill transaction form
- **Effort:** Large (5-7 days)

### 19. Voice-Based Transaction Entry
- "Spent 250 on coffee"
- NLP to extract amount, category, type
- Auto-fill and confirm
- **Effort:** Large (7-10 days)

### 20. Offline Mode
- Local database (IndexedDB / Dexie)
- Background sync when online
- Conflict resolution
- **Effort:** Large (7-10 days)

### 21. Multi-Currency Support
- User-selectable default currency (currently hardcoded to NPR)
- Per-account currency
- Conversion rates (optional)
- **Effort:** Medium (4-5 days)

### 22. Recurring Transactions (Auto-Create)
- Let users set up auto-repeating transactions (weekly, monthly, custom)
- Auto-generate on schedule
- Notification before auto-deduction
- **Effort:** Medium (3-4 days)

---

## Recommended Sprint Order

| Sprint | Features | Days |
|--------|----------|------|
| Sprint 1 | CSV Export + Category Drill-Down + Quick-Add Templates | 4-5 |
| Sprint 2 | Custom Categories (DB) + Accounts Module | 6-8 |
| Sprint 3 | Budget Planning + Savings Goals | 7-9 |
| Sprint 4 | Spending Trend Chart + Monthly Comparison Chart | 5-7 |
| Sprint 5 | PWA + Server-Side Search + Command Palette | 5-7 |
| Sprint 6 | Recurring User-Facing + Daily Streak + Monthly Summary | 6-8 |
| Sprint 7 | Shared Spaces (Members & Invites) | 7-10 |

**Total estimated:** 40-54 days (8-11 weeks)
