# PRD: Personal Finance Tracker (Income + Expense)

**Version:** 3.0 (MVP)
**Status:** Draft
**Owner:** Rakesh Patel
**Last Updated:** August 2026

---

# 1. Overview

Ledg is a modern web application that enables users to record, organize, and analyze their personal finances with minimal friction.

The product is **not** an expense-only tracker. It tracks **both income and expenses** as first-class citizens. The dashboard and analytics treat income, expense, and savings equally so users understand their full cash position, not just what they spend.

Instead of overwhelming users with complex forms and accounting terminology, the application focuses on one simple objective:

> **Logging a transaction should take less than five seconds.**

The MVP is intentionally lightweight, prioritizing speed, simplicity, and consistency. A transaction is any money movement: expense or income. Advanced capabilities such as AI-powered financial coaching, voice-based entry, and offline synchronization are planned for future releases. Shared spaces are planned for a later phase (see Shared Spaces below).

---

# 2. Problem Statement

Many people start tracking their expenses but stop after a few weeks because the process becomes tedious.

Current expense tracking applications often suffer from:

- Slow transaction entry
- Too many required fields
- Cluttered interfaces
- Poor mobile experience
- Complicated budgeting systems
- Little actionable insight from collected data

As a result, users abandon the habit before they receive meaningful value.

The goal of this application is to reduce the friction of expense tracking while providing useful financial insights over time.

---

# 3. Vision

Build the fastest, simplest, and smartest personal finance application that users enjoy using every day.

The application should eventually evolve into an intelligent financial assistant capable of understanding spending behavior, providing personalized recommendations, and allowing users to record expenses naturally using voice.

---

# 4. Goals

## MVP Goals

- Record a transaction (expense or income) in under 5 seconds
- Track both income and expenses on an equal footing
- Net balance visibility across accounts and spaces
- Clean and intuitive interface
- Mobile-friendly experience
- Instant dashboard updates
- Powerful search and filtering
- Multiple account support
- Custom categories
- Shared spaces with members
- CSV export
- Progressive Web App (PWA)

---

## Future Goals

- Shared Spaces
- Voice-based transaction entry
- AI-generated financial summaries
- AI spending analysis
- AI financial recommendations
- Offline-first synchronization
- Budget planning
- Receipt OCR
- Bank integrations

---

# 5. Target Audience

## Primary Users

Individuals who want a fast and reliable way to track personal finances.

Examples

- Students
- Professionals
- Freelancers
- Small business owners

---

## Secondary Users

- Couples
- Families
- Roommates
- Small teams

These users are supported via Shared Spaces (Phase 3 feature).

---

# 6. Non-Goals (MVP)

The following features are intentionally excluded from the MVP.

- AI
- Voice Commands
- Receipt OCR
- SMS Parsing
- Offline-first Sync
- Multi-currency
- Shared Spaces
- Budget Planning
- Recurring Transactions
- Bank Integrations
- Investment Tracking
- Loan Management
- Notifications

---

# 7. User Stories

## Authentication

As a user,

- I want to sign in securely.
- I want my data to be private.

---

## Transactions

As a user,

- I want to add income.
- I want to add expenses.
- I want to edit transactions.
- I want to delete transactions.
- I want to search transactions.
- I want to filter transactions.

---

## Accounts

As a user,

- I want to manage multiple accounts.
- I want to see the balance of each account.
- I want to archive unused accounts.

Examples

- Cash
- Bank
- eSewa
- Khalti
- Credit Card

---

## Categories

As a user,

- I want to create custom categories.
- I want to edit categories.
- I want to organize transactions by category.

---

## Dashboard

As a user,

I want to immediately understand my financial situation.

The dashboard should display

- Total Balance
- Total Income
- Total Expense
- Current Month Spending
- Category Breakdown
- Recent Transactions

---

## Search

As a user,

I want to quickly find previous transactions using

- Notes
- Category
- Account
- Date
- Amount

---

## Export

As a user,

I want to export my financial data as CSV.

---

## Shared Spaces

As a user,

- I want to invite people to a specific space.
- I want to share transactions with members of that space.
- I want to see who is a member of a space.
- I want to manage member roles and remove members.
- I want to see pending invites and accept or decline them.
- I want to leave a space I was invited to.

---

## Income

As a user,

- I want to add income as easily as expenses.
- I want to see income sources broken down by category.
- I want to see my savings (income - expense) clearly.

---

# 8. Functional Requirements

## Authentication

- Clerk Authentication
- Google Login
- Email Login
- Protected Routes

---

## Dashboard

Display

- Current Balance
- Monthly Income
- Monthly Expense
- Spending Trend
- Category Distribution
- Recent Transactions

---

## Transactions

Support

- Create
- Read
- Update
- Delete

Each transaction contains

- Type
- Amount
- Category
- Account
- Date
- Notes
- Tags

Supported Types

- Expense
- Income

---

## Accounts

Each account contains

- Name
- Type
- Currency
- Balance
- Color

Support

- Multiple accounts per space
- Archive unused accounts

---

## Categories

Each category contains

- Name
- Type
- Color
- Icon

---

## Search

Support filtering by

- Date Range
- Category
- Account
- Transaction Type
- Amount
- Keyword

---

## Settings

Support

- Theme
- Currency
- Date Format
- Profile

---

## Export

Export all transactions to CSV.

---

## Shared Spaces

Each space supports

- Multiple members with roles
- Invite by email
- Pending invite management
- Shared transactions across members
- Leave / remove member

Roles

- Owner
- Admin
- Member
- Viewer

---

# 9. Future Features

## Voice Commands

Allow users to record transactions naturally.

Examples

"Spent 250 rupees on coffee."

"Paid rent 12000 from bank."

"Received salary 35000."

The system automatically extracts

- Amount
- Category
- Account
- Transaction Type

---

## AI Transaction Categorization

Automatically categorize transactions based on historical behavior.

Example

Starbucks

↓

Food & Drinks

---

## AI Monthly Summary

Generate summaries such as

"You spent 18% more this month."

"Food accounted for 42% of your expenses."

"Weekend spending increased significantly."

---

## AI Spending Behavior

Detect

- Impulse spending
- Subscription overload
- Saving habits
- Spending trends
- Monthly comparisons
- Category growth

---

## AI Recommendations

Provide actionable suggestions.

Examples

"You spend an average of Rs. 150 per day on tea."

"Reducing food expenses by 10% could save Rs. 18,000 annually."

---

## AI Chat

Allow users to ask questions naturally.

Examples

"How much did I spend on food last month?"

"When did I last pay electricity?"

"Which category is growing the fastest?"

---

## Offline Mode

Future versions will support

- Local database
- Background synchronization
- Conflict resolution
- Offline transaction creation

---

> **Shared Spaces is planned for Phase 3.** See "Shared Spaces (Members & Sharing)" below for the full specification.

---

# 10. Success Metrics

## MVP

Average transaction creation

< 5 seconds

Dashboard loading

< 2 seconds

Search response

< 1 second

Zero data loss

PWA installable

---

## Long-term

30-day logging streak

Daily active usage

Voice command adoption

AI summary engagement

Shared space usage

---

# 11. Technical Constraints

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Backend

- Node.js
- Express
- TypeScript

Database

- MongoDB Atlas

Authentication

- Clerk

Deployment

Frontend

- Vercel

Backend

- Railway / Render

---

# 12. Risks

- Feature creep delaying MVP
- Overengineering AI before core tracking is solid
- Poor categorization if users don't maintain categories
- Scope expansion due to future finance features

Mitigation

Focus on shipping the smallest usable product first.

---

# 13. Roadmap

## Phase 1 (MVP)

- Authentication
- Dashboard
- Transactions
- Accounts
- Categories
- Search
- Filters
- CSV Export
- PWA

---

## Phase 2

- Voice Commands
- AI Categorization
- AI Summaries
- AI Chat
- AI Insights
- Smart Recommendations

---

## Phase 3

- Offline-first
- Shared Spaces (members + invites)
- Budget Planning
- Notifications
- Receipt OCR
- Recurring Transactions

---

# 14. What's Missing (Gap Analysis)

The product tracks **income and expenses**, not just expenses. The following gaps exist between the current MVP and the stated product scope. Each gap marks work that is still required.

## Income Is Not A First-Class Citizen

- The app is branded and documented as an "expense tracker".
- Income analytics (income sources, monthly income trend, income vs expense comparison) are thin.
- The transaction form exposes all transaction types, but income defaults and income-only categories are limited.
- **Fix:** Explicit income module, income source breakdown, and equal treatment of income/expense in every chart and card.

## No Accounts Module

- Transactions have a `paymentMethod` field only — there is no `Accounts` collection, account balances, or account management.
- **Fix:** Add `Accounts` collection, account CRUD, and per-account balance.

## Categories Are Static

- Categories are hardcoded in `lib/categories.ts` (frontend only) — not stored per space, not editable, not customizable.
- No Categories collection in the backend despite being planned in the DB design.
- **Fix:** Add `Categories` collection (per space), category CRUD, default categories seeded per space, and color/icon per category.

## CSV Export Missing

- MVP goal "CSV Export" is not implemented on the API or frontend.
- **Fix:** Backend export endpoint + frontend export button with date-range filter.

## PWA Incomplete

- A web manifest exists but there is no service worker, offline shell, or install prompt flow.
- **Fix:** Service worker registration, caching strategy, and PWA install support.

## Search Is Client-Side Only

- The backend exposes filter/query params, but the frontend only does in-memory filtering.
- No command palette (Ctrl+K), no debounced server search, no search across all spaces.
- **Fix:** Server-side search endpoint consumption, global search UI.

## Dashboard / Analytics Gaps

- No spending trend chart (daily/weekly/monthly).
- No income vs expense monthly comparison chart.
- No period selector (this month / 3 months / year / all time).
- No month-over-month percentage changes.
- Savings rate exists but is not linked to any savings goal or trend.
- **Fix:** Implement ANALYTICS_ROADMAP Phase 1 items.

## Accounts Currency Setting Missing

- Currency is hardcoded to NPR; settings shows "Auto" with a disabled control.
- **Fix:** User-selectable default currency stored in settings, applied across formatting.

## User Model Is Minimal

- `UserModel` previously stored only `clerkId`. No name, email, image — which blocks shared-space member display and invite-by-email.
- **Fix:** Store email/name/image on the user record (from BetterAuth) for member avatars and invitations. (Done — the model now stores `betterAuthId`, email, name, fullName, image, emailVerified.)

## Shared Spaces Not Yet Implemented

- Spaces are currently single-owner only. See the Shared Spaces spec below for the full design and implementation checklist.

---

# 15. Shared Spaces (Members & Sharing)

## Goal

Let a space owner invite other users into a specific space so they can view and manage the same transactions together. Transactions remain scoped to a space; every member of a space sees the same data.

## Use Cases

- Couples managing a joint household
- Family members sharing expenses
- Roommates splitting rent and bills
- Trip groups tracking shared costs
- Small teams / businesses sharing business spend

## Roles

| Role | Can view | Can add/edit transactions | Can manage members | Can delete space |
|------|----------|---------------------------|---------------------|------------------|
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | No |
| Member | Yes | Yes | No | No |
| Viewer | Yes | No | No | No |

## Data Model

Add a `members` array to the Space collection (or a separate `SpaceMember` collection for cleaner queries):

```ts
{
    spaceId

    userId

    role       // owner | admin | member | viewer

    status     // invited | active

    invitedBy

    invitedAt

    acceptedAt
}
```

A `SpaceMember` collection is preferred so that:

- "Spaces I belong to" is a single query on `userId`.
- Invite status is tracked without mutating the space document.

## Invitation Flow

1. Owner/Admin opens Space → Members → Invite.
2. Enters the invitee's email.
3. Backend creates a pending invite; sends email with an accept link (or the invitee sees it in-app on next login).
4. Invitee accepts → becomes a `member` with status `active`.
5. Invitee's space list now includes the shared space; transactions are shared instantly.

Re-inviting a user who already has a pending invite updates the invite instead of duplicating it. Duplicate active memberships are rejected.

## API

```text
GET    /spaces                       # returns spaces where user is owner OR member
POST   /spaces                       # creates space (creator becomes owner)
PUT    /spaces/:id                   # edit (owner/admin)
DELETE /spaces/:id                   # delete (owner only)

GET    /spaces/:id/members           # list members
POST   /spaces/:id/invite            # invite by email { email, role? }
DELETE /spaces/:id/members/:userId   # remove member (owner/admin)
PATCH  /spaces/:id/members/:userId   # change role (owner/admin)

GET    /invites                      # pending invites for current user
POST   /invites/:id/accept           # accept invite
POST   /invites/:id/decline          # decline invite

POST   /spaces/:id/leave             # member leaves space
```

## Authorization

- Space list: `ownerId == userId` OR `userId` is an active member.
- Transaction CRUD: require membership in the space (any active role). Transaction writes additionally require `role != viewer`.
- Invites/member management: require `owner` or `admin`.
- Delete space: require `owner`.

## Frontend

- Space detail page: "Members" section listing avatars, names, roles.
- "Invite" button opening an email input + role selector sheet.
- Invitee sees pending invites in Settings or a dedicated Invites screen.
- Space cards show a member-count/avatar stack.
- Non-owner members get no "Delete space" action; viewers get read-only transaction UI.

## Implementation Checklist

- [ ] Add `SpaceMember` model + indexes (`userId`, `spaceId`, `status`)
- [ ] Add invite service (create, list pending, accept, decline)
- [ ] Update space repository queries to include memberships
- [ ] Add member management endpoints + validators
- [ ] Add email sending (e.g., Resend) or in-app invite notifications
- [ ] Store user email/name/image from Clerk on the User record
- [ ] Frontend: members UI, invite sheet, invites screen
- [ ] Frontend: role-aware rendering (owner/admin/member/viewer)
- [ ] Update analytics/dashboard to aggregate only spaces the user belongs to

---

# 16. Product Philosophy

The application is guided by one simple principle:

> **Every feature must reduce the effort required to understand or manage personal finances.**

If a feature makes the application more complicated without providing meaningful value, it should not be included.