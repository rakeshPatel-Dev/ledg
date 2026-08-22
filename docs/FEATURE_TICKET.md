# Feature Ticket - Ledg (Implemented Features)

**Last Updated:** August 2026

---

## 1. Authentication & Account Management

- Email + Password Registration with strength validation
- Email + Password Login
- Google OAuth Login
- Email Verification via Resend with branded template, auto-sign-in after verification
- Resend Verification Email from sign-in page
- Cookie-based Session Management (httpOnly, secure in production)
- Database Hooks for User Sync on auth create/update/delete
- User Account Deletion with name-confirmation and cascading data deletion
- Protected Routes (frontend guard + backend middleware)
- Password Change endpoint (POST /api/v1/me/password)
- Welcome/Landing Page with feature highlights
- Sign-In Page (email/password, Google, verification modal)
- Sign-Up Page (name, email, password strength indicator, Google, verification screen)
- Auth Provider (React context for user state)

---

## 2. Spaces (Multi-Space Organization)

- Space CRUD (create, list, get, update, delete)
- Space Types: Personal, Family, Trip, Business (unique icons and color schemes)
- Default Space Auto-Creation ("Personal" when none exists)
- Space Limit (max 10 per user)
- Cascade Delete (deletes all transactions in the space)
- Zod Validation on create/update
- Full REST API routes for space management
- Spaces List Page (grid cards with type icon, name, transaction count, balance, search, CRUD)
- Space Detail Page (hero banner, balance/income/expense breakdown, transaction list)
- Space Create/Edit Sheet (bottom sheet with name and type selector)
- Space Delete Confirmation (shows space name and transaction count)
- Space Type Styling (unique colors per type, balance color coding)
- Space Selection in Transaction Form with "+ New space" shortcut
- Space Filtering on Transactions Page (pill buttons)

---

## 3. Transactions (Income + Expense Tracking)

- Transaction CRUD (create, list, get, update, delete)
- Transaction Fields: spaceId, category, type, amount, note, date, tags, paymentMethod
- Server-Side Filtering (category, type, date range, keyword regex)
- Pagination (page-based, max 100, default 20)
- Space Resolution on all operations
- Full REST API routes nested under spaces
- Transaction Form Sheet (type selector, amount input with quick-add buttons, category grid, note, date picker, space selector, payment method, create/edit modes)
- Transaction Item Component (category icon, note, payment method, amount, date)
- Swipeable Transaction Item (Framer Motion swipe-right-to-delete)
- Delete Transaction Sheet (confirmation with preview)
- Transaction Form Bridge (global context to open form from any component)
- Transactions List Page (search, type filter, space filter, date-grouped listing, per-day balance summaries, empty states)
- Optimistic Updates on all mutations with rollback

### Hardcoded Categories (13)
- Expense: Food, Groceries, Transport, Rent, Bills, Shopping, Entertainment, Health, Travel, Education, Other
- Income: Salary, Business

### Payment Methods
- Cash, Card, Bank Transfer, Wallet

---

## 4. Dashboard

- Dashboard Summary Endpoint (aggregates across all spaces: totalBalance, monthIncome, monthSpend, byCategory, byIncomeCategory, byPaymentMethod, recentTransactions, transactionCount)
- Hero Banner (gradient card with Total Balance, Monthly Income, Monthly Spend)
- Empty State (prompt to add first transaction)
- Category Breakdown (Expense/Income segmented tabs, animated progress bars for top 4)
- Payment Methods Section (grid cards with icons, amounts, percentages, progress bars)
- Recent Activity (last 5 transactions with swipeable delete, "See all" link)
- Smart Insight (auto-generated monthly spending summary)
- useDashboardSummary() hook (5-min stale time, refetch-on-window-focus)

---

## 5. Analytics & Insights

- Analytics Summary Endpoint (period support: today/month/3months/year/all/custom, current vs previous period totals, percentage deltas, category breakdowns, auto-generated insights)
- Period-over-Period Comparison for any period type
- Auto-Generated Insights (spend change, savings rate, category comparison, deficit alerts, max 5)
- Recurring Transactions Detection (grouped by category+normalized note fingerprint)
- Payment Method Breakdown (aggregated by method)
- MongoDB Aggregation Pipeline ($match, $group, $sort, $project)
- Analytics Page ("Insights"): space selector, period selector, custom date range, income/expense cards with delta badges, savings rate ring (SVG donut), quick insights cards, spending by category bars, income by category bars, recurring transactions card, category drill-down sheet

---

## 6. Settings & User Profile

- Email Update (updates both auth DB and app User collection)
- Settings Page: user profile card, edit profile, delete account, theme, currency, motion preference, request feature, legal links, sign out
- Theme Provider (Light/Dark/System, persisted to localStorage)
- Motion Provider (Full/Reduced/System, respects prefers-reduced-motion, persisted)

---

## 7. Feedback & Feature Requests

- Request Feature Form (Formspree integration, name/email/category/message fields, success state)

---

## 8. Legal Pages

- Privacy Policy Page (JSON-driven legal document renderer)
- Terms of Service Page (same renderer with terms data)
- Legal Document Component (reusable: headings, paragraphs, bullet lists, check lists, contact email, deletion request mailto card)

---

## 9. UI Component Library

- Avatar (image + fallback initials)
- Badge (status/label)
- Button (variants: default, outline, ghost, destructive-solid; sizes; render prop)
- Calendar (date picker)
- Card (content container)
- Date Picker (calendar-based with popover)
- Empty State (icon, title, description, optional action)
- Input (text input)
- Password Input (toggleable show/hide)
- Password Strength (visual indicator with validation rules)
- Popover (floating container)
- Segmented (iOS-style segmented control)
- Select (dropdown with trigger, content, items, separator)
- Sheet (bottom sheet modal with title, description, content)
- Skeleton (loading shimmer)

---

## 10. Layout & Navigation

- App Shell (max-width container with bottom navigation)
- Bottom Navigation (fixed floating navbar: Home, Activity, Add Transaction FAB, Spaces, Insights; animated pill indicator, pulse ring, haptic feedback)
- Header (user avatar, time-based greeting, first name, notification bell)
- Page Transitions (Framer Motion fade with staggered animations)
- Error Boundary (catches component errors with user-friendly fallback UI and reload)
- App Logo (reusable component)
- Lazy Loading (React.lazy with Suspense fallback for all pages)

---

## 11. Data Layer & State Management

- React Query / TanStack Query (server state, query keys, stale time config, retry)
- Optimistic Updates (snapshot/restore pattern for all mutations)
- API Client (type-safe fetch wrapper, ApiError class)
- Query Keys (organized key factory for spaces, transactions, analytics, dashboard)
- Aggregated Data Hook (useAllData: fetches all spaces then parallel-fetches transactions)

---

## 12. Shared Module (Cross-Platform)

- Zod Schemas: spaceSchema, spaceUpdateSchema, transactionSchema, transactionUpdateSchema, transactionQuerySchema, idParamsSchema, createUserSchema
- TypeScript Types: User, Space, Transaction, ApiSuccess, ApiError, ApiResponse, PaginatedResult
- Enums: SPACE_TYPES, TRANSACTION_TYPES, PAYMENT_METHODS, PAYMENT_LABELS
- Constants: CURRENCIES (NPR/USD/EUR/GBP/INR), DEFAULT_CURRENCY (NPR), DEFAULT_SPACE_TYPE (personal)

---

## 13. Server Infrastructure & Security

- Express Server with helmet security headers, CORS, pino logging (sensitive field redaction)
- Rate Limiting (auth: 100 req/15min, API: 600 req/15min)
- CSRF Protection (Origin/Referer header verification on state-changing endpoints)
- Body Size Limit (express.json 1MB limit)
- Custom Error Hierarchy (AppError, NotFoundError, ConflictError, BadRequestError, UnauthorizedError)
- Global Error Handler and 404 Handler middleware
- Async Handler utility for async route handlers
- MongoDB Connection with reuse across serverless invocations
- Environment Validation on startup
- Health Check endpoint (GET /health)
- Trust Proxy in production
- Graceful Shutdown (SIGINT/SIGTERM with 10s timeout)

---

## 14. Email System

- Resend Integration for email delivery
- Verification Email Template with dynamic Verification_Link variable

---

## 15. Deployment Configuration

- Vercel Config for client (frontend deployment)
- Vercel Config for server (serverless deployment)
- Node 22.x (`.node-version`)
- Separate TypeScript configs for client and server
- ESLint 9 flat config (client + server)
- Prettier configuration
- Shared module sync script (`scripts/sync-shared.js`)
