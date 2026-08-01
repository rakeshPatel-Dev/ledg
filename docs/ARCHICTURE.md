# Architecture

## Overview

Personal Expense Tracker is a full-stack MERN application designed around simplicity, maintainability, and future extensibility.

The MVP focuses on fast transaction management for a single user while keeping the architecture flexible enough to support AI-powered insights, voice commands, offline synchronization, and shared expense spaces in future releases.

---

# Architecture Principles

- Simplicity over cleverness
- Feature-first organization
- Type safety across frontend and backend
- Shared validation using Zod
- Modular services
- API-first design
- Future-proof database schema
- AI as an independent module
- Easy deployment
- Minimal vendor lock-in

---

# Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI
- React Router v7
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts
- Framer Motion
- Lucide Icons
- date-fns

---

## Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Zod
- Pino Logger
- Helmet
- CORS
- Compression
- Rate Limiter

---

## Authentication

Clerk

Reason:

- Google Login
- Email Login
- Session Management
- MFA
- Password Reset
- Reduced maintenance

Backend verifies Clerk JWT.

---

## Database

MongoDB Atlas

Collections

- Users
- Spaces
- Accounts
- Categories
- Transactions

---

## Package Manager

pnpm Workspaces

Repository

expense-tracker/

client/
server/
shared/
docs/

---

# Frontend Architecture

Feature-first structure.

client/src

app/
components/
features/
hooks/
lib/
routes/
services/
stores/
styles/
types/
utils/

Each feature contains:

transactions/

components/
hooks/
pages/
services/
types/

---

# Backend Architecture

server/src

modules/

auth/
accounts/
categories/
transactions/
dashboard/
settings/
ai/

shared/

middleware/
config/
database/
utils/

Each module contains

controller.ts

service.ts

repository.ts

validator.ts

routes.ts

types.ts

---

# State Management

Server State

TanStack Query

Client State

Zustand

Store only

- Theme
- Sidebar
- Command Palette
- User Preferences

Do NOT store API data inside Zustand.

---

# Validation

Zod is the single source of truth.

Validation is shared between frontend and backend.

Never duplicate validation logic.

---

# Logging

Pino

Different log levels

- info
- warn
- error
- debug

---

# Error Handling

Global Express Error Handler

Standard API response

{
    success: false,
    message: "...",
    errors: []
}

---

# Authentication Flow

Client

↓

Clerk Authentication

↓

JWT

↓

Express Middleware

↓

Protected Route

↓

Controller

↓

Service

↓

MongoDB

---

# Future Modules

The architecture should support:

- Voice Commands
- AI Insights
- Offline Synchronization
- Shared Spaces
- Notifications
- Budget Planning
- Multi Currency
- Receipt OCR

without major refactoring.

---

# Deployment

Frontend

Vercel

Backend

Railway / Render

Database

MongoDB Atlas

Storage (Future)

Cloudinary

Monitoring (Future)

Sentry