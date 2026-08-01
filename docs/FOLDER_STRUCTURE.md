# Folder Structure

## Philosophy

This project follows a **feature-first** and **monorepo** architecture.

Instead of organizing code by technical layers (controllers, services, models), each business feature owns everything it needs.

The repository uses **pnpm Workspaces** to separate applications from reusable packages.

This architecture provides:

- Better maintainability
- Clear ownership
- Easier navigation
- Shared code without duplication
- Scalability for future applications

---

# Repository Structure

```text
expense-tracker/

├── apps/
│   ├── web/                  # React + Vite Frontend
│   └── api/                  # Express Backend
│
├── packages/
│   ├── shared/               # Shared types, schemas, constants
│   ├── tsconfig/             # Shared TypeScript configs (future)
│   └── eslint-config/        # Shared ESLint config (future)
│
├── docs/
├── docker/
├── .github/
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

---

# Workspace Structure

The repository is divided into two types of packages.

## Apps

Applications that can be deployed independently.

```text
apps/

web/
api/
```

Future applications may include

```text
mobile/
admin/
cli/
browser-extension/
```

---

## Packages

Reusable code shared between multiple applications.

```text
packages/

shared/
tsconfig/
eslint-config/
```

Packages should never depend on applications.

Applications may depend on packages.

---

# Dependency Graph

```text
                  packages/shared
                  ▲            ▲
                  │            │
                  │            │
            apps/web      apps/api
```

Rules

- apps may import packages
- packages must never import apps
- apps never import each other

---

# Frontend Structure

```text
apps/web/

src/

├── app/
│   ├── layouts/
│   ├── providers/
│   ├── router/
│   └── App.tsx
│
├── assets/
│
├── components/
│   ├── common/
│   ├── charts/
│   └── ui/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   ├── accounts/
│   ├── categories/
│   ├── reports/
│   └── settings/
│
├── hooks/
├── lib/
├── services/
├── stores/
├── styles/
├── types/
├── utils/
└── main.tsx
```

---

# Feature Structure (Frontend)

Every feature owns everything related to itself.

Example

```text
transactions/

api/

create-transaction.ts

update-transaction.ts

delete-transaction.ts

components/

TransactionCard.tsx

TransactionForm.tsx

TransactionTable.tsx

hooks/

use-transactions.ts

pages/

transactions-page.tsx

schemas/

transaction.schema.ts

types/

transaction.ts

utils/

transaction-parser.ts
```

Each feature contains only the code required by that feature.

---

# Shared Components

Only reusable components belong here.

```text
components/

ui/

Button

Input

Card

Dialog

Dropdown

Popover

Skeleton

common/

EmptyState

LoadingScreen

ErrorBoundary

SearchBar

charts/

PieChart

BarChart

LineChart
```

Feature-specific components should remain inside their feature folder.

---

# Backend Structure

```text
apps/api/

src/

├── config/
├── database/
├── common/
├── domains/
├── app.ts
└── server.ts
```

---

# Domain Structure (Backend)

Each business domain owns its own implementation.

Example

```text
transactions/

controller.ts

service.ts

repository.ts

model.ts

routes.ts

validator.ts

mapper.ts

types.ts

constants.ts
```

---

# Request Flow

Every request follows the same pipeline.

```text
Client

↓

Route

↓

Validator

↓

Controller

↓

Service

↓

Repository

↓

MongoDB
```

Responsibilities

Route

- Maps HTTP endpoints

Validator

- Validates request using Zod

Controller

- Handles HTTP request/response

Service

- Contains business logic

Repository

- Handles database access

Model

- Defines MongoDB schema

Mapper

- Converts database models to API responses

---

# Common Folder

Contains backend utilities shared across multiple domains.

```text
common/

errors/

logger/

middlewares/

helpers/

utils/

constants/
```

This folder should never contain feature-specific code.

---

# Shared Package

The shared package contains code used by both frontend and backend.

```text
packages/shared/

src/

schemas/

types/

enums/

constants/

utils/

index.ts

package.json
```

Examples

- Shared Zod schemas
- TypeScript types
- Enums
- Currency constants
- Transaction types
- Validation helpers

Everything should be exported from

```text
index.ts
```

so applications import

```ts
import { TransactionSchema } from "@expense/shared";
```

instead of deep relative paths.

---

# Assets

```text
assets/

fonts/

icons/

images/

logos/
```

---

# Naming Convention

Folders

- kebab-case

Files

- kebab-case

React Components

- PascalCase

Functions

- camelCase

Variables

- camelCase

Constants

- UPPER_SNAKE_CASE

Interfaces

- PascalCase

Enums

- PascalCase

Hooks

- useSomething

Environment Variables

- UPPER_SNAKE_CASE

---

# Import Order

Maintain a consistent import order.

1. External libraries

2. Shared packages

3. Internal modules

4. Components

5. Hooks

6. Utilities

7. Types

8. Styles

Example

```ts
import { useQuery } from "@tanstack/react-query";

import { TransactionSchema } from "@expense/shared";

import { Button } from "@/components/ui/button";

import { useTransactions } from "../hooks/use-transactions";

import type { Transaction } from "../types/transaction";

import "./transaction.css";
```

---

# Architectural Rules

- Every feature owns its own code.
- Avoid cross-feature imports whenever possible.
- Shared logic belongs inside `packages/shared`.
- Business logic never belongs inside React components.
- Controllers must remain thin.
- Services contain business rules.
- Repositories contain database queries.
- Validation always happens before business logic.
- Shared packages must remain framework-agnostic.
- Prefer composition over inheritance.

---

# Future Expansion

This structure is designed to support future applications without requiring repository restructuring.

Potential additions

```text
apps/

mobile/
admin/
desktop/
cli/

packages/

ui/
analytics/
ai/
config/
```

The folder structure should remain stable even as the project grows.