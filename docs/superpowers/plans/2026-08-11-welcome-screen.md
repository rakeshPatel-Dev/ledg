# Welcome Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/welcome` page that becomes the first impression for unauthenticated users. It shows the app logo, name, tagline, and Register / Login buttons, following the existing calm, minimal, Apple-style design.

**Architecture:** A new self-contained `WelcomePage` component is added to `apps/web/src/pages/`. A new `/welcome` route is registered outside the existing `Protected` wrapper in `App.tsx`, and the wrapper's unauthenticated redirect target is changed from `/sign-in` to `/welcome`. Existing `/sign-in` and `/sign-up` pages (which host Clerk's prebuilt widgets) are unchanged.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Base UI + `class-variance-authority`), `react-router-dom` v7, `@clerk/react`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-11-welcome-screen-design.md`

## Global Constraints

- React 19 + TypeScript strict mode (per existing `tsconfig.app.json`).
- Tailwind v4 utility classes only — no new CSS files, no new color tokens.
- Use existing `Button` from `@/components/ui/button`; do not introduce new button styles.
- Use existing `AppLogo` from `@/components/common/AppLogo`; do not modify it.
- Icons: `lucide-react` only. This plan uses no new icons.
- Buttons render as `<Link>` via `Button asChild` (the `Button` component already supports this prop in `apps/web/src/components/ui/button.tsx`).
- Copy must match the existing `sign-in` / `sign-up` pages: wordmark `Ledg`, tagline `Track spending in under five seconds.`
- Default export for new page components (matches `dashboard.tsx`, `sign-in.tsx`, etc.).
- No automated tests are added — `apps/web` has no test infrastructure today; the spec scopes testing to a manual checklist.
- Commit messages use the repo's existing Conventional Commits style (see recent commits: `feat:`, `fix:`, `chore:`, `docs:`).

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `apps/web/src/pages/welcome.tsx` | Create | `WelcomePage` component — centered hero with `AppLogo`, wordmark, tagline, and Register / Login `<Link>`-as-button actions. Renders a spinner while Clerk is loading, redirects to `/` if already signed in. |
| `apps/web/src/app/App.tsx` | Modify | Import `WelcomePage`; register `/welcome` route outside the `Protected` wrapper; change the `Protected` redirect target from `/sign-in` to `/welcome`. |

No other files are touched. No new dependencies. No test files (per spec).

---

## Task 1: Create `WelcomePage` component

**Files:**
- Create: `apps/web/src/pages/welcome.tsx`

**Interfaces:**
- Consumes: `AppLogo` from `@/components/common/AppLogo`, `Button` from `@/components/ui/button`, `Link` from `react-router-dom`, `useAuth` from `@clerk/react`, `Navigate` from `react-router-dom`.
- Produces: default-exported `WelcomePage` React component used by `App.tsx` in Task 2.

### Step 1: Create the file with the full component

Write the following to `apps/web/src/pages/welcome.tsx`:

```tsx
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";

import AppLogo from "@/components/common/AppLogo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <main
      aria-labelledby="welcome-heading"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <AppLogo />
        <h1
          id="welcome-heading"
          className="text-3xl font-extrabold tracking-tight"
        >
          Ledg
        </h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Track spending in under five seconds.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button asChild variant="default" size="lg" className="w-full">
          <Link to="/sign-up">Register</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/sign-in">Login</Link>
        </Button>
      </div>
    </main>
  );
}
```

### Step 2: Verify the file compiles

Run: `cd "D:/Real Projects/ledg" && pnpm --filter @ledg/web typecheck`
Expected: exit code 0, no TypeScript errors.

### Step 3: Commit

```bash
cd "D:/Real Projects/ledg"
git add apps/web/src/pages/welcome.tsx
git commit -m "feat(web): add welcome page with register and login"
```

---

## Task 2: Wire `/welcome` route and update redirect target

**Files:**
- Modify: `apps/web/src/app/App.tsx`

**Interfaces:**
- Consumes: `WelcomePage` default export from `@/pages/welcome` (created in Task 1).
- Produces: a new `<Route path="/welcome" element={<WelcomePage />} />` declared outside the `Protected` wrapper, and the `Protected` wrapper's unauthenticated `<Navigate to="/sign-in" />` becomes `<Navigate to="/welcome" />`.

### Step 1: Add the import

In `apps/web/src/app/App.tsx`, find the existing import line:

```tsx
import SignUpPage from "@/pages/sign-up";
```

Add a new import directly below it:

```tsx
import WelcomePage from "@/pages/welcome";
```

The block of imports should now read:

```tsx
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import AnalyticsPage from "@/pages/analytics";
import SpacesPage from "@/pages/spaces";
import SettingsPage from "@/pages/settings";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import WelcomePage from "@/pages/welcome";
```

### Step 2: Register the `/welcome` route

Find this existing block inside `<Routes>`:

```tsx
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
```

Add a new sibling route directly below the `/sign-up` route, outside the `Protected` wrapper (i.e. at the same nesting level as `/sign-in` and `/sign-up`):

```tsx
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
```

### Step 3: Update the `Protected` redirect target

Find the line inside the `Protected` component:

```tsx
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
```

Change it to:

```tsx
    return <Navigate to="/welcome" state={{ from: location }} replace />;
```

Leave the rest of `Protected` and the `*` catch-all route (`<Route path="*" element={<Navigate to="/" replace />} />`) untouched.

### Step 4: Verify the file compiles

Run: `cd "D:/Real Projects/ledg" && pnpm --filter @ledg/web typecheck`
Expected: exit code 0, no TypeScript errors.

### Step 5: Commit

```bash
cd "D:/Real Projects/ledg"
git add apps/web/src/app/App.tsx
git commit -m "feat(web): route unauthenticated users to welcome screen"
```

---

## Task 3: Manual verification

**Files:** none.

### Step 1: Start the dev server

Run: `cd "D:/Real Projects/ledg" && pnpm --filter @ledg/web dev`
Expected: Vite serves the app at `http://localhost:5173` (or whatever port is printed).

### Step 2: Run the manual checklist from the spec

Open the app in a browser. With Clerk signed out, verify each item from `docs/superpowers/specs/2026-08-11-welcome-screen-design.md` section 9 at 375px and 1280px widths, in both light and dark mode:

- [ ] Visiting `/` while signed out redirects to `/welcome`.
- [ ] `/welcome` shows AppLogo, "Ledg" wordmark, and the tagline.
- [ ] **Register** button (emerald, primary) navigates to `/sign-up`; Clerk widget renders.
- [ ] **Login** button (outline, secondary) navigates to `/sign-in`; Clerk widget renders.
- [ ] Signing in lands on `/` (existing behavior unchanged).
- [ ] Visiting `/welcome` while signed in redirects to `/`.
- [ ] Direct visit to `/welcome` while Clerk is loading shows the spinner briefly, then welcome content (or redirect).
- [ ] Keyboard tab order: Register → Login. Enter activates each.
- [ ] Buttons have visible focus rings.

### Step 3: Stop the dev server

Stop the dev server process (Ctrl+C in the terminal running Task 3 Step 1).

### Step 4: Commit (no changes expected)

If no changes were made, skip this step. If small fixes were needed during verification, commit them with a message like `fix(web): address welcome screen verification findings` and reference the affected file.
