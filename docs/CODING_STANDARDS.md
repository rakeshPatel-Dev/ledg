# Coding Standards

## General Principles

Every line of code should optimize for readability before cleverness.

Code is written once but read hundreds of times.

---

# Naming

Variables

camelCase

Functions

camelCase

Components

PascalCase

Interfaces

PascalCase

Enums

PascalCase

Files

kebab-case

Folders

kebab-case

Constants

UPPER_SNAKE_CASE

---

# Functions

Prefer

Small functions

Single responsibility

Pure functions whenever possible

Maximum

40 lines

---

# Components

Keep components focused.

Avoid files larger than 300 lines.

Extract reusable logic into hooks.

---

# React

Prefer

Functional Components

Hooks

Composition

Avoid

Class Components

Prop Drilling

Large Context Providers

---

# API

Controllers should remain thin.

Business logic belongs inside Services.

Database logic belongs inside Repositories.

Never query Mongo directly inside controllers.

---

# Validation

Every request

↓

Zod

↓

Controller

↓

Service

Never trust frontend validation.

---

# Comments

Don't explain WHAT.

Explain WHY.

Bad

// increment i

Good

// Retry failed sync operations to prevent duplicate submissions.

---

# Imports

1 External libraries

2 Internal libraries

3 Components

4 Hooks

5 Types

6 Styles

---

# Formatting

ESLint

Prettier

Mandatory

---

# Git

Branch naming

feature/add-transaction

feature/voice-entry

bugfix/dashboard-total

refactor/auth-module

---

Commit format

feat:

fix:

refactor:

docs:

style:

test:

perf: