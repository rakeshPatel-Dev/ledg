# PRD: Personal Expense Tracker

**Version:** 2.0 (MVP)
**Status:** Draft
**Owner:** Rakesh Patel
**Last Updated:** August 2026

---

# 1. Overview

Personal Expense Tracker is a modern web application that enables users to record, organize, and analyze their personal finances with minimal friction.

Instead of overwhelming users with complex forms and accounting terminology, the application focuses on one simple objective:

> **Logging a transaction should take less than five seconds.**

The MVP is intentionally lightweight, prioritizing speed, simplicity, and consistency. Advanced capabilities such as AI-powered financial coaching, voice-based expense entry, offline synchronization, and shared expense spaces are planned for future releases.

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

- Record transactions in under 5 seconds
- Clean and intuitive interface
- Mobile-friendly experience
- Instant dashboard updates
- Powerful search and filtering
- Multiple account support
- Custom categories
- CSV export
- Progressive Web App (PWA)

---

## Future Goals

- Voice-based transaction entry
- AI-generated financial summaries
- AI spending analysis
- AI financial recommendations
- Shared expense spaces
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

## Secondary Users (Future)

- Couples
- Families
- Roommates
- Small teams

---

# 6. Non-Goals (MVP)

The following features are intentionally excluded from the MVP.

- AI
- Voice Commands
- Receipt OCR
- SMS Parsing
- Offline-first Sync
- Shared Spaces
- Multi-currency
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
- I want to transfer money between accounts.
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
- Transfer

---

## Accounts

Each account contains

- Name
- Type
- Currency
- Balance
- Color

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

## Shared Spaces

Support

- Family accounts
- Couples
- Trip expenses
- Business expenses

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
- Shared Spaces
- Budget Planning
- Notifications
- Receipt OCR
- Recurring Transactions

---

# 14. Product Philosophy

The application is guided by one simple principle:

> **Every feature must reduce the effort required to understand or manage personal finances.**

If a feature makes the application more complicated without providing meaningful value, it should not be included.