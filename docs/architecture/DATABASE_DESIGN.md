# Database Design

## Overview

The database is designed to support both current MVP requirements and future expansion.

Although the MVP is single-user, every record belongs to a Space to avoid future migrations.

---

# Collections

- Users
- Spaces
- Categories
- Transactions

---

# Users

```ts
{
    _id

    betterAuthId

    email

    name

    fullName

    image

    emailVerified

    createdAt

    updatedAt
}
```

---

# Spaces

```ts
{
    _id

    ownerId

    name

    type

    createdAt

    updatedAt
}
```

Example

Personal

Future

Family

Trip

Business

---

# Categories

```ts
{
    _id

    spaceId

    name

    icon

    color

    type

    createdAt

    updatedAt
}
```

Types

Expense

Income

---

# Transactions

```ts
{
    _id

    spaceId

    categoryId

    type

    amount

    note

    date

    tags

    paymentMethod

    createdAt

    updatedAt
}
```

Types

Expense

Income

Transfer

---

# Relationships

User

↓

Space

↓

Transactions

↓

Category

---

# Indexes

Transactions

spaceId

date

categoryId

type

spaceId

Categories

paymentMethod

spaceId

Users

betterAuthId

---

# Future Collections

Budgets

Recurring Transactions

Notifications

Attachments

AI Summaries

Voice Logs

Activity Logs

Shared Members

Exchange Rates

Receipt OCR

---

# Soft Delete

Future

deletedAt

deletedBy

---

# Future AI Tables

ai_summaries

```ts
{
    _id

    userId

    month

    summary

    generatedAt
}
```

---

voice_logs

```ts
{
    _id

    transcript

    parsedTransaction

    confidence

    createdAt
}
```