# API Design

## Base URL

/api/v1

---

# Authentication

Handled by Clerk.

Backend validates JWT.

---

# Response Format

Success

{
    success: true,
    data: {}
}

Failure

{
    success: false,
    message: "",
    errors: []
}

---

# Transactions

GET

/transactions

List transactions

---

GET

/transactions/:id

Single transaction

---

POST

/transactions

Create transaction

---

PUT

/transactions/:id

Update transaction

---

DELETE

/transactions/:id

Delete transaction

---

GET

/transactions/search

Search transactions

Query Params

category

account

type

dateFrom

dateTo

keyword

---

# Accounts

GET

/accounts

POST

/accounts

PUT

/accounts/:id

DELETE

/accounts/:id

---

# Categories

GET

/categories

POST

/categories

PUT

/categories/:id

DELETE

/categories/:id

---

# Dashboard

GET

/dashboard

Returns

- Balance
- Income
- Expenses
- Monthly Spending
- Recent Transactions
- Category Breakdown

---

# User

GET

/me

Current user

PUT

/me

Update profile

---

# Settings

GET

/settings

PUT

/settings

---

# Future APIs

POST

/voice/parse

Input

Spent 350 on coffee

Returns

{
    amount:350,
    category:"Food",
    account:"Cash"
}

---

POST

/ai/summarize

Returns

Monthly summary

---

POST

/ai/insights

Returns

Financial behavior analysis

---

POST

/receipt/scan

Receipt OCR

---

GET

/budgets

---

POST

/budgets

---

GET

/notifications

---

POST

/spaces

---

GET

/spaces

---

POST

/spaces/:id/invite

---

GET

/reports/monthly

---

GET

/reports/yearly

---

# Status Codes

200

201

400

401

403

404

409

422

429

500