# Welcome Screen Design

**Project:** Ledg
**Date:** 2026-08-11
**Status:** Approved for implementation

---

## 1. Goal

Add a public welcome screen that becomes the first impression for unauthenticated users. It shows the app logo, name, a short tagline, and two prominent actions: **Register** and **Login**. The screen follows the existing calm, minimal, Apple-style aesthetic defined in `docs/DESIGN.md.md` and `docs/UI_GUIDELINES.md`.

## 2. Scope

In scope:

- New `WelcomePage` component and a `/welcome` route.
- Change the unauthenticated redirect target from `/sign-in` to `/welcome`.
- Keep `/sign-in` and `/sign-up` pages (and the Clerk widgets they host) unchanged.

Out of scope:

- Adding automated tests (no test infra in `apps/web` today; introducing it is a separate task).
- Restyling Clerk's prebuilt `<SignIn />` / `<SignUp />` widgets.
- Changing Clerk's `afterSignInUrl` / `afterSignUpUrl` behavior.
- A marketing hero, feature bullets, or illustrations. This is a minimal welcome screen.

## 3. Architecture

Three small changes, all isolated to the web app:

1. **New page:** `apps/web/src/pages/welcome.tsx` — a self-contained React component. No new hooks, providers, or shared state.
2. **New route:** in `apps/web/src/app/App.tsx`, add `<Route path="/welcome" element={<WelcomePage />} />` outside the `Protected` wrapper.
3. **Redirect target:** in the same file, change the `Protected` wrapper's `<Navigate to="/sign-in" ...>` to `<Navigate to="/welcome" ...>`.

`/sign-in` and `/sign-up` pages are unchanged. They continue to render Clerk's prebuilt `<SignIn />` and `<SignUp />` widgets.

## 4. Component Design — `WelcomePage`

File: `apps/web/src/pages/welcome.tsx`

Structure (top to bottom, mobile-first, centered):

```
<main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
  <div className="flex flex-col items-center gap-3 text-center">
    <AppLogo />                                  {/* existing 64×64 emerald tile */}
    <h1 className="text-3xl font-extrabold tracking-tight">Ledg</h1>
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
```

Why these choices:

- `min-h-dvh` + `flex items-center justify-center` — fills the viewport on every device size, including short mobile screens.
- `gap-8` between hero and actions matches the spacing used on the existing sign-in/sign-up pages.
- `max-w-xs` on the action block keeps buttons readable on tablets/desktop; on mobile they go edge-to-edge via `w-full` minus the page's `px-6`.
- `Register` is the primary action (`variant="default"`, emerald) because new visitors are the audience for a welcome screen; `Login` is the secondary action (`variant="outline"`).
- No footer link, no secondary marketing copy, no animation — the screen disappears into the background, per the design philosophy.
- Dark mode works automatically via existing `bg-background`, `text-foreground`, `text-muted-foreground`, and `Button` variants. No new tokens.

### Reused components

- `AppLogo` from `@/components/common/AppLogo` — already renders the emerald 64×64 tile with `/ledg-logo.svg`.
- `Button` from `@/components/ui/button` — supports the `asChild` prop so the visual button can be a `<Link>`.
- `Link` from `react-router-dom`.
- `useAuth` from `@clerk/react` — to detect signed-in users and loading state.

## 5. Routing & Data Flow

Unauthenticated path:

1. User visits any protected route (e.g. `/`, `/transactions`).
2. `Protected` wrapper in `App.tsx` evaluates `useAuth()`:
   - `isLoaded === false` → render the existing centered spinner.
   - `isLoaded && isSignedIn === false` → `<Navigate to="/welcome" state={{ from: location }} replace />`.
3. `WelcomePage` renders the logo, tagline, and two buttons.

Authenticated path on `/welcome`:

1. `WelcomePage` checks `useAuth()`:
   - `isLoaded === false` → render the centered spinner (prevents a brief flash of welcome content).
   - `isLoaded && isSignedIn === true` → `<Navigate to="/" replace />`.
   - Otherwise → render welcome content.

Click flow:

- **Register** → `<Link to="/sign-up">` → `/sign-up` page renders Clerk's `<SignUp />` widget. After successful sign-up, Clerk's default redirect (today: `/`) takes the user to the dashboard.
- **Login** → `<Link to="/sign-in">` → `/sign-in` page renders Clerk's `<SignIn />` widget. Same flow.

Browser back button after sign-in lands on `/welcome`. This is acceptable for the MVP — the back button after auth is rarely used, and the welcome screen is benign. A future improvement is to set Clerk's `afterSignInUrl` / `afterSignUpUrl` to the `state.from` location so back returns to the page the user originally wanted. This is explicitly out of scope.

## 6. Error Handling & Edge Cases

- **Clerk still loading on direct visit to `/welcome`:** render the same centered spinner `Protected` uses, to avoid a flash of welcome content before the redirect to `/`. The exact JSX (lifted from `App.tsx`):
  ```tsx
  <div className="flex min-h-dvh items-center justify-center">
    <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
  ```
- **Already signed in, visits `/welcome` directly:** handled by the `isSignedIn` check above.
- **No network calls:** the page is pure render. No error states.
- **Reduced motion:** no animations on this page; nothing to opt out of.

## 7. Accessibility

- `<main>` landmark wraps the page.
- `<h1>` is the wordmark; screen readers announce it.
- `aria-labelledby` on `<main>` references the `h1` `id` for clearer announcement.
- Buttons are real interactive elements via `<Button asChild><Link>...</Link></Button>`, so keyboard focus, Enter, and Space all work.
- Visible focus rings come from the existing `Button` styles (`focus-visible:ring-3 focus-visible:ring-ring/50`).
- Color contrast is inherited from the verified theme tokens; emerald on white/dark meets WCAG AA.
- Touch target: `size="lg"` buttons are 48px tall, meeting the 44px minimum from `docs/UI_GUIDELINES.md`.

## 8. File-Level Changes

| File | Change |
| --- | --- |
| `apps/web/src/pages/welcome.tsx` | New file. `WelcomePage` component, default export. |
| `apps/web/src/app/App.tsx` | Add `import WelcomePage from "@/pages/welcome";`. Add `<Route path="/welcome" element={<WelcomePage />} />` outside `Protected`. Change `Protected`'s redirect target from `/sign-in` to `/welcome`. |

## 9. Manual Verification Checklist

Run `pnpm --filter @ledg/web dev` and verify each item on both light and dark mode, at 375px and 1280px widths:

- [ ] Visiting `/` while signed out redirects to `/welcome`.
- [ ] `/welcome` shows AppLogo, "Ledg" wordmark, and the tagline.
- [ ] **Register** button (emerald, primary) navigates to `/sign-up`; Clerk widget renders.
- [ ] **Login** button (outline, secondary) navigates to `/sign-in`; Clerk widget renders.
- [ ] Signing in lands on `/` (existing behavior unchanged).
- [ ] Visiting `/welcome` while signed in redirects to `/`.
- [ ] Direct visit to `/welcome` while Clerk is loading shows the spinner briefly, then welcome content (or redirect).
- [ ] Keyboard tab order: Register → Login. Enter activates each.
- [ ] Buttons have visible focus rings.

## 10. Risks

- **Back-button after auth lands on `/welcome`.** Low impact; users rarely rely on back after signing in. Mitigated later by Clerk's `afterSignInUrl` config (out of scope here).
- **Inconsistency with `/sign-in` page header.** Today, `/sign-in` and `/sign-up` already show the same logo + wordmark + tagline above the Clerk widget. After this change, users see that block twice if they go welcome → register/login. Acceptable: it's the same calm branding and only one block per page. If it ever feels redundant, the headers on `/sign-in` and `/sign-up` can be trimmed to a smaller variant — out of scope for this spec.
