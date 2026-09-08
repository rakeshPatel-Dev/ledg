# Ledg — App Design Specification (for UI Generation)

> **Purpose of this document:** A complete, pixel-accurate, page-by-page design specification for the **Ledg** mobile web app. Use this file as the single source of truth when generating, rebuilding, or restyling the UI (e.g. with Google Stitch or any AI UI generator). It describes every page, every sheet, every component, every state, and the exact color system.

---

## 0. How to use this document

- **Read section 1–11 first** (design language, colors, type, components, app frame). These define the system.
- Then generate each page from **section 12** (pages) and each overlay from **section 13** (sheets).
- Every page spec is ordered **top to bottom**, matching the real layout. Keep the order — it is intentional.
- Copy strings are given in `inline code`. Use them verbatim; tone is short, friendly, confident.
- The app is **mobile-first**; all pages render inside a centered `max-w-md` column and scale up gracefully.

---

## 1. Brand & product snapshot

| Key | Value |
|---|---|
| Product name | **Ledg** |
| Category | Personal finance companion (income + expense + shared spaces + dues/loans) |
| One-liner | "Track spending in under five seconds." |
| Core promise | Not an accounting app — a calm, delightful way to know where your money goes. |
| Audiences | Individuals (personal), couples/families, friend groups (trip splits), small business owners |
| Currency | INR by default (`Rs.`), amount formatting uses `INR` compact notation |
| Platforms | Mobile-first responsive PWA (web); designed for ~360–430px wide phones |
| Inspiration | Apple Wallet & Apple Health (cards, translucency, big numerals), iOS Settings (grouped lists), Linear / Notion / Arc (calm, precise, modern) |
| Motion setting | Users can choose Full / Reduced / System motion globally |
| Theme | Light / Dark / System themes, always polished in both |

### Design personality keywords
`calm` · `premium` · `spacious` · `minimal` · `modern` · `trustworthy` · `delightful` · `data-forward`
Careful with money → every number is easy to read (tabular numerals), every destructive action is double-confirmed, every state has a friendly fallback.

---

## 2. Design principles

1. **Five seconds to log.** The Add Transaction flow is one thumb tap from anywhere and has zero required friction (amount → category → done).
2. **Cards, not tables.** Financial data is presented in rounded cards with hierarchical typography, never dense grids on mobile.
3. **Numbers are heroes.** Balances use large, black weights, tabular numerals, and semantic color only for direction (income ↔ expense).
4. **One primary accent.** Emerald green is the *only* brand color. Everything else (rose, amber, sky, etc.) is semantic or categorical.
5. **Bottom sheets, not dialogs.** All creation, editing, inspection, and confirmation happen in bottom sheets for one-handed mobile use.
6. **Translucency + blur** (backdrop-blur) on cards, the bottom nav, and sheets give the "Apple Wallet" premium feel.
7. **Ease on the eye.** Generous padding (8pt grid), 4xl corner radii, soft shadows, and spring motion everywhere.
8. **Trust through clarity.** Confirmation sheets state exactly what will happen (e.g. "permanently delete ... and all N transactions"). Destructive = red, money owed = green, money owed by you = amber.

---

## 3. Color system

### 3.1 Semantic theme tokens (light + dark)

The app defines all tokens as **OKLCH** with a neutral-green hue (≈158°) so the entire UI is tinted slightly emerald-warm. Hex values below are approximate conversions for design tools; **prefer the OKLCH token in code**.

| Token | Light (OKLCH) | Light ≈ Hex | Dark (OKLCH) | Dark ≈ Hex |
|---|---|---|---|---|
| `background` | `oklch(0.982 0.008 95)` | `#FAFAF6` | `oklch(16.2% 0.0026 146)` | `#151817` |
| `foreground` | `oklch(0.185 0.025 170)` | `#131A19` | `oklch(0.965 0.005 158)` | `#F4F8F6` |
| `card` | `oklch(1 0 0)` | `#FFFFFF` | `oklch(0.22 0.025 170)` | `#1A2421` |
| `card-foreground` | = foreground | = foreground | = dark foreground | `#F4F8F6` |
| `popover` | = card | `#FFFFFF` | = card | `#1A2421` |
| `popover-foreground` | = foreground | — | = dark foreground | — |
| `primary` | `oklch(0.62 0.145 158)` | `#10B981` | `oklch(0.65 0.14 158)` | `#34D399` |
| `primary-foreground` | `oklch(0.985 0.005 120)` | `#FFFFFF` | `oklch(0.14 0.02 170)` | `#05240F` |
| `secondary` (bg tint) | `oklch(0.955 0.015 158)` | `#EDF6F0` | `oklch(0.28 0.03 170)` | `#222C29` |
| `secondary-foreground` | `oklch(0.35 0.08 158)` | `#1F5D47` | `#F4F8F6` | `#F4F8F6` |
| `muted` | `oklch(0.955 0.008 158)` | `#F0F5F2` | `oklch(0.28 0.03 170)` | `#222C29` |
| `muted-foreground` | `oklch(0.52 0.025 170)` | `#6F7B78` | `oklch(0.7 0.02 158)` | `#9FADA8` |
| `accent` | `oklch(0.948 0.02 158)` | `#E7F3EC` | `oklch(0.3 0.04 158)` | `#25332E` |
| `accent-foreground` | `oklch(0.4 0.09 158)` | `#1F6B4E` | `#F4F8F6` | `#F4F8F6` |
| `destructive` | `oklch(0.6 0.19 27)` | `#E5484D` | `oklch(0.65 0.18 27)` | `#F65D5D` |
| `destructive-foreground` | `oklch(0.985 0.005 120)` | `#FFFFFF` | `oklch(0.985 0.005 120)` | `#FFFFFF` |
| `success` | = primary | `#10B981` | = dark primary | `#34D399` |
| `warning` | `oklch(0.72 0.15 70)` | `#F0A32F` | `oklch(0.75 0.14 70)` | `#F7B32B` |
| `border` | `oklch(0.9 0.012 158)` | `#E1E9E5` | `oklch(1 0 0 / 12%)` | `rgba(255,255,255,0.12)` |
| `input` | = border | `#E1E9E5` | `oklch(1 0 0 / 15%)` | `rgba(255,255,255,0.15)` |
| `ring` | = primary | `#10B981` | = dark primary | `#34D399` |

### 3.2 Money semantics (very important)

| Meaning | Color (light) | Dark equivalent | Used for |
|---|---|---|---|
| Income / received / saved / lend | `success` = emerald `#10B981` / `emerald-600` | `emerald-400` | Income amounts, "Receivable", "Owed to you", lent dues |
| Expense / spent / you owe | `destructive` rose `#E5484D` (or `rose-600`) | `rose-400` | Expense amounts, "Spent", "Payable", borrowed dues (amounts use amber instead) |
| You owe money (dues) | `amber-500 #F0A32F` | `amber-400/500` | Borrowed dues, payable figures, "I owe" |
| Positive balance / net | `emerald-600` | `emerald-400` | Balance when > 0, net receivable |
| Negative balance | `rose-600` | `rose-400` | Balance when < 0 |
| Zero / neutral | `muted-foreground` | — | Balance when == 0 |

Rule: **income always shows `+`**, expense always shows `−` before the tabular figure.

### 3.3 Category colors (13 expense + 10 income)

These drive category icons, chips, progress bars, and donut data. Always render icon tint as `color` at ~12% alpha background (e.g. `#E8590C1f`).

**Expense categories**

| Category | Icon (lucide-react) | Color |
|---|---|---|
| Food | `Utensils` | `#E8590C` |
| Groceries | `ShoppingCart` | `#2F9E44` |
| Transport | `Bus` | `#1971C2` |
| Rent | `House` | `#B02586` |
| Bills | `Receipt` | `#D97706` |
| Shopping | `ShoppingBag` | `#C2255C` |
| Entertainment | `Clapperboard` | `#6741D9` |
| Health | `HeartPulse` | `#E03131` |
| Travel | `Plane` | `#0B7285` |
| Education | `GraduationCap` | `#CA8A04` |
| Family | `Users` | `#059669` |
| Due paid | `HandCoins` | `#7C3AED` |
| Other | `Coins` | `#868E96` |

**Income categories**

| Category | Icon | Color |
|---|---|---|
| Salary | `Banknote` | `#16A34A` |
| Business | `Briefcase` | `#2563EB` |
| Freelance | `Laptop` | `#7C3AED` |
| Investment | `TrendingUp` | `#0D9488` |
| Gift | `Gift` | `#DB2777` |
| Refund | `RotateCcw` | `#EA580C` |
| Interest | `Landmark` | `#4F46E5` |
| Rental | `Building` | `#0891B2` |
| Due received | `HandCoins` | `#059669` |
| Other | `Coins` | `#64748B` |

Default category for a new expense: **Food**. Default for new income: **Salary**.

### 3.4 Space type colors

| Space type | Icon | Tint bg | Text | Badge |
|---|---|---|---|---|
| `personal` | `Wallet` | `emerald-500/10` (dark `/20`) | `emerald-600` (dark `400`) | `emerald` badge |
| `family` | `Users` | `rose-500/10` | `rose-600` | `rose` badge |
| `trip` | `Plane` | `sky-500/10` | `sky-600` | `sky` badge |
| `business` | `Building2` | `amber-500/10` | `amber-600` | `amber` badge |

Badge style: pill, `text-[10px] font-bold uppercase tracking-wider`, tinted bg (`10/`) + colored text (`700` light / `300` dark), subtle border of same hue (`/20`).

### 3.5 Notification type colors

| Notification type | Icon | Color token |
|---|---|---|
| `space_invite` | `Mail` | `sky-500` on `sky-500/10` |
| `invite_accepted` | `UserCheck` | `emerald-500` on `emerald-500/10` |
| `invite_rejected` | `X` | `rose-500` on `rose-500/10` |
| `member_joined` | `Users` | `indigo-500` on `indigo-500/10` |
| `member_left` | `UserMinus` | `amber-500` on `amber-500/10` |
| `member_removed` | `UserMinus` | `rose-500` on `rose-500/10` |
| `ownership_transferred` | `ShieldCheck` | `purple-500` on `purple-500/10` |
| `transaction_added` | `ReceiptText` | `emerald-500` on `emerald-500/10` |
| `transaction_modified` | `Sparkles` | `amber-500` on `amber-500/10` |
| `space_deleted` | `Trash2` | `destructive` on `destructive/10` |

### 3.6 Payment method colors

Used in the Dashboard "Payment Methods" grid icons.

| Method | Icon | Tint |
|---|---|---|
| Card / credit | `CreditCard` | `blue-500` on `blue-500/10` |
| Bank transfer | `Landmark` | `purple-500` on `purple-500/10` |
| UPI / mobile / phone | `Smartphone` | `emerald-500` on `emerald-500/10` |
| Cash / wallet (fallback) | `Wallet` | `amber-500` on `amber-500/10` |

### 3.7 Charts (OKLCH chart scales)

- `chart-1` = primary emerald · `chart-2` = amber · `chart-3` = blue · `chart-4` = red · `chart-5` = magenta/purple.
- Share-of-category and payment bars use the **category/payment colors** (3.3 / 3.6); only multi-series charts use the chart scale.

### 3.8 Avatar gradients

Deterministic gradient chosen by hashing the person's name (used in Dues person avatars):
`violet→purple`, `blue→cyan`, `emerald→teal`, `orange→amber`, `rose→pink`, `indigo→blue`. Text is white, bold, initials (first letters of up to two words, uppercased).

---

## 4. Typography

| Property | Value |
|---|---|
| Family | **Inter Variable** (`'Inter Variable', ui-sans-serif, system-ui, sans-serif`) |
| Weights used | `medium` (500), `semibold` (600), `bold` (700), `extrabold` (800), `black` (900) |
| Numbers | **Always `tabular-nums`** for any amount, balance, count, percent |
| Big hero numbers | `text-4xl font-black tracking-tight tabular-nums` (balance on Dashboard), `text-3xl`–`text-5xl` in amount inputs |
| Page titles | `text-2xl font-extrabold tracking-tight` |
| Section eyebrows | `text-xs font-bold uppercase tracking-wider text-muted-foreground` |
| Body | `text-sm` (headings/labels `text-sm font-semibold/-medium`) |
| Small / captions | `text-xs`, `text-[0.65rem]`, `text-[0.6rem]` and `text-[0.55rem]` for micro-labels/badges |
| Line lengths | Descriptive text capped at `max-w-xs`; never ragged long lines |
| Headings | `tracking-tight` throughout. Uppercase eyebrows always `tracking-wider`. |

Use letter-spaced uppercase micro-labels for anything meta (section titles, field labels, stat labels). Field labels in forms: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`.

---

## 5. Spacing & layout grid

- Base unit: **4px**, rhythm = **8px**. Page vertical rhythm = `gap-5` (20px) / `gap-6` (24px) between sections.
- App column: centered `max-w-5` (32rem) column on all breakpoints. `<main className="px-5 pb-28 pt-6">`.
- Standard paddings: card `p-4`/`p-5`, lists rows `px-4 py-3.5`, hero sections `px-5 pb-7 pt-2/4`.
- Section header rows: title left (eyebrow sections) or `text-sm font-semibold uppercase text-muted-foreground` + optional action link right (`text-primary` "See all").
- Page bottom clearance: `pb-28` (space for the floating bottom nav).
- Bottom sheet content: `px-5 pb-10` with internal `gap-5`.

---

## 6. Radius & shape

| Level | Radius | Where |
|---|---|---|
| `sm` | 8px | small controls |
| `md` | 10px | inputs, inner chips |
| `lg` | 12px | default, cards small |
| `xl` | 16px | larger cards |
| `2xl` | 18px | big cards |
| `3xl` | 20–24px | hero cards, tiles |
| `4xl` (signature) | 24–32px (`rounded-4xl`) | every hero card, sheet top, transaction rows, bottom nav, input pills |

**Signature shape: pill (`rounded-full`)** for all primary CTAs, segmented control, bottom nav container, chat-chip filters, quick-action buttons, icon buttons on hero sections, and search/filter chips.

---

## 7. Elevation, translucency & borders

- **Translucency is a core style:** cards, bottom nav and sheets use `bg-card/70-90 backdrop-blur-xl` (nav uses `backdrop-blur-2xl backdrop-saturate-180`).
- **Hero gradient surfaces** (Dashboard balance, Dues hero): `bg-linear-to-br from-primary via-primary to-[oklch(0.52 0.15 158)]` with `shadow-lg shadow-primary/20` or `shadow-xl shadow-primary/25` and a big `rounded-b-[2.5rem]` bottom radius.
- Card shadows: `shadow-xs` resting → `hover:shadow-md`. Buttons `shadow-sm`/`shadow-md` depending on size/role.
- Colored element shadows follow the color: primary buttons → `shadow-primary/20-30`; emerald due buttons → `shadow-emerald-600/20-30`; amber → `shadow-amber-500/20-30`.
- Hairline borders: `border-border/50` on cards/rows; `border-border/20-40` inside grouped content; `bg-muted/40` fills for stat wells.
- Divider: `h-px bg-border/40` (or `bg-border/50` in settings).

---

## 8. Motion & interaction

- **Page transitions:** fade + subtle 8px translateY stagger. Children use `FadeInStagger`/`FadeInItem`.
- **Segmented control:** active pill uses a shared spring `layoutId` slide (`spring: stiffness 420, damping 34, mass 0.8`).
- **Hover on interactive cards:** `-translate-y-1`/`-2` lift + `shadow-md`. On touch: `active:scale-95`/`scale-98`, and `whileTap={{scale: 0.98}}`.
- **Bottom nav center + button:** pulse ring (`scale 1→1.2→1`, 2s loop); nav entries have a `layoutId` active pill and `whileTap scale 0.9`.
- **Progress bars** animate width `0 → value` over 0.6s ease-out. Ring/donut animates ≥1s.
- **Expand/collapse** (filters, due groups) animates `height 0→auto` over 0.2–0.22s.
- **Sheets** slide up with a backdrop fade + `backdrop-blur-md` black/40.
- **Number formatting/quick entries** may pulse scale once.
- **Haptics:** `navigator.vibrate(10)` on the add-transaction button.
- **Reduced motion:** global `reduce-motion` class flattens all transitions/animations to ~0.001ms when Motion = Reduced or System-reduced.

---

## 9. Icons, logo & imagery

- Icon set: **lucide-react only** (see tables in §3.3–3.6 for the exact names). Stroke `2` default; emphasized icons `2.2–2.5`. Sizes: `size-4` inline, `size-4.5–5` in tiles, `size-7` hero plus, `size-8` in big + button.
- **App logo:** rounded-4xl `primary` tile containing the `ledg-logo.svg` mark. Variants: welcome `size-20 rounded-3xl shadow-xl shadow-primary/25` with `size-12` inner; header `size-9 rounded-xl` with `size-5` inner; invite page standard `size-16`.
- No photos/illustrations in the app; all states use icons inside tinted rounded tiles.

---

## 10. Core UI components

### 10.1 Button
Pill (`rounded-full`), `text-sm font-semibold`, `active:translate-y-px active:scale-98`, focus ring `ring-3 ring-ring/50`, disabled `opacity-50`, leading/trailing icons allowed; SVG sizes default `size-4`.

Variants:
- `default` — solid `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`
- `outline` — `border-border bg-background shadow-xs hover:bg-muted`
- `secondary` — `bg-secondary text-secondary-foreground`
- `ghost` — `hover:bg-muted hover:text-foreground`
- `destructive` — translucent red: `bg-destructive/10 text-destructive hover:bg-destructive/20`
- `destructive-solid` — solid `bg-destructive text-destructive-foreground hover:bg-destructive/90` (confirm-destructive)
- `link` — `text-primary underline-offset-4 hover:underline`

Sizes: `default h-11 px-6`, `sm h-9 px-4`, `lg h-12 px-8 text-base`, `xs h-8 px-3`, `icon size-11`, `icon-sm size-9`, `icon-xs size-8`, `icon-lg size-12`. Large CTAs on auth/empty screens use `h-12/h-13 w-full rounded-full text-base font-semibold shadow-md`.

### 10.2 Input
`h-12 w-full rounded-2xl border-input bg-card px-4 text-sm shadow-xs` + `placeholder:muted-foreground`, `focus-visible:border-ring focus-visible:ring-3 ring-ring/50`. Pills when used as search: `rounded-full bg-muted/50 border-0` with leading search icon at `left-3.5` and optional clear `✕` at `right-3.5`.

### 10.3 Password input
Standard input + eye toggle button on the right (show/hide). Paired with `PasswordStrength` bar (weak→strong; colored scale from `destructive` → `warning` → `success`) under sign-up & password-change fields, and a `passwordRuleError` inline helper.

### 10.4 Segmented control
`rounded-full bg-muted p-1`, grid of equal flex-1 buttons. Active segment: white/card pill (`bg-card shadow-sm`) sliding with spring; inactive: `text-muted-foreground`, `hover:text-foreground`. `role="radiogroup"`, `text-sm font-medium`.

### 10.5 Card
`bg-card` (often `bg-card/75+ backdrop-blur`), hairline border (`border-border/50`), corner radius `rounded-3xl`→`rounded-4xl`. Stat wells inside cards use `rounded-2xl bg-muted/40 border-border/40 p-3`.

### 10.6 Sheet (bottom sheet / drawer) — the app's primary overlay
- Fixed bottom, `inset-x-0 bottom-0`, **max height `88dvh`**, `rounded-t-4xl`, `bg-card/85 backdrop-blur-2xl backdrop-saturate-180`, big soft top shadow, top hairline `border-white/30` (dark: `white/10`).
- **Drag handle:** centered 12×6px `rounded-full bg-muted-foreground/25` at top, `pt-3 pb-1`.
- **Header:** optional title (`text-lg font-bold tracking-tight`) + description (`text-sm text-muted-foreground`) in `px-5 pt-2 pb-3`.
- **Body:** `flex-1 overflow-y-auto px-5 pb-10`.
- Backdrop: `bg-black/40 backdrop-blur-md`.
- Swipe-down to close + backdrop tap to close. On desktop this is a centered dialog with the same look.

### 10.7 Badge (tag/pill)
`rounded-full text-[0.58rem] uppercase font-bold` micro state tags. Variants: `default` (`bg-primary/10 text-primary`), `secondary` (`bg-muted text-muted-foreground`), `outline`, `destructive` (overdue), custom `bg-emerald-600` (settled).

### 10.8 Avatar / initials
Rounded-full; user avatar shows image or initials + `User` fallback. Shared-space member stacks overlap by `-space-x-2` with `ring-2 ring-card`. Dues person avatars use the gradient system (§3.8). Space-member avatars: `bg-primary/20 text-primary text-[10px] font-bold`.

### 10.9 Skeleton
`animate-pulse` rounded blocks matching the target shape/radius (`h-16 w-full rounded-3xl` for rows, `h-28/40/44 rounded-4xl` for hero cards, `h-8/h-10/h-12` for headers/inputs); on hero gradient use `bg-primary-foreground/20`.

### 10.10 Empty state
Vertical stack: 56×56 `rounded-3xl bg-primary/10 text-primary ring-4 ring-primary/5` icon tile (or themed icon, e.g. `SearchX` `text-rose-500` for errors), bold `text-base` title, `max-w-xs text-xs text-muted-foreground` description, then a pill action button. On Dues: dashed-border container `rounded-4xl border-dashed border-border/70`.

### 10.11 Date picker / Select / Popover / Pagination / Toggle
- **DatePicker:** calendar popover (side: bottom in forms) with quick chips.
- **Quick-date chips:** small pills (`text-[10px] font-medium`, `rounded-full`) — today / yesterday / 2 days ago (transactions), today / tomorrow / next week / next month (dues). Active chip: `bg-primary/20 text-primary font-semibold`.
- **Select:** base-ui select, `h-12 rounded-2xl` trigger with leading icon (`Wallet`), content menu w/ `+ New space…` action item in `text-primary`.
- **Popover:** menu card `w-44 p-1.5 rounded-2xl shadow-xl`, rows `rounded-xl px-3 py-2 text-xs`, destructive rows `text-destructive hover:bg-destructive/10`.
- **Pagination:** "Page X of Y (N total)" caption + pill prev/next + numbered page pills, active `bg-primary text-primary-foreground`.
- **Toggle switch:** `h-6 w-11 rounded-full` track (`bg-primary` on / `bg-muted-foreground/30` off) with white 16px knob translate-x (1→6). Focus ring visible.

### 10.12 Toasts (sonner)
Success `Toast`, error `Toast`, and action-toasts ("Undo", "Cancel"/"Keep", "Delete") for non-destructive confirmations. Show spinner while pending mutations. Messages short and specific (see copy in §13).

### 10.13 Swipe-to-delete transaction row
Each transaction row is swipeable horizontally: dragging right past ~56px (or fast swipe) reveals a full `bg-destructive` delete panel underneath with a `Trash2` icon; releasing past threshold opens Delete Transaction sheet. Only for rows the user may delete (creator/owner). Wrap in `rounded-3xl overflow-hidden`.

---

## 11. App frame & navigation

### 11.1 App shell (protected pages)
```
<div class="mx-auto min-h-full max-w-md">
  <main class="px-5 pb-28 pt-6"> {page} </main>
  <BottomNav />
</div>
```
On desktop the column stays centered (`max-w-md`) with the bottom nav floating center. The global **TransactionFormBridge** mounts the Add/Edit transaction sheet above everything.

### 11.2 Header (Dashboard only, inside the page top)
Left: `UserAvatar size-11 ring-2 ring-primary/30` + greeting stack — top `text-xs` `Good morning/afternoon/evening`, below `text-sm font-semibold` `@username` (fallback: first name). Whole block links to `/settings`.
Right: **Dues pill** (`rounded-full bg-primary px-3.5 py-2.5 text-primary-foreground shadow-md shadow-primary/30`, `HandCoins` icon + bold `Dues`) with a `-top-1 -right-1` absolute `bg-destructive text-white animate-pulse` badge showing overdue count; and the **Notification bell** (round `size-10 bg-card/80 backdrop-blur` icon button) with `-top-1 -right-1` primary badge (`9+` cap) showing unread count.

### 11.3 Bottom nav (floating pill)
Fixed `inset-x-0 bottom-0 z-40`, centered `max-w-md`, `px-4 pb-4`, with a subtle top fade `bg-linear-to-t from-background/60 to-transparent`.
Pill container: `rounded-full border-border/50 bg-card/40 backdrop-blur-2xl backdrop-saturate-180 shadow-2xl px-1.5 py-0.5`, 5 cells:
1. **Home** (`House`) → `/` (end)
2. **Activity** (`Wallet`) → `/transactions`
3. **Add** — raised `size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30` **Plus** button with pulsing halo ring; triggers `openCreate()` globally. Vibrates.
4. **Spaces** (`Layers`) → `/spaces`
5. **Insights** (`ChartNoAxesCombined`) → `/analytics`

Active link: emerald text + `stroke-[2.5]` icon + sliding rounded pill `bg-primary/10` (`layoutId="activeBottomNavPill"`). Labels `text-[0.55rem] font-semibold`.

### 11.4 Page transition wrapper
Each page mounts inside `PageTransition` + uses `FadeInStagger` (`gap-5/6` column) with `FadeInItem` children fading/rising in sequence (≈40–60ms stagger).

### 11.5 Auth & public screens
Screens without shell: centered `min-h-dvh max-w-md mx-auto` column, `px-6 py-6/10`. Simple spinner center screen while auth resolves.

---

## 12. Page-by-page specifications

> Naming: **[Route]** · states covered: Loading, Error, Empty, Data.

### 12.1 Welcome — `/welcome`  (Public)
**Purpose:** marketing one-pager that converts to sign-up.
**Layout (top → bottom), full-height flex `justify-between`:**
1. **Brand block** (centered, `pt-8`): `AppLogo size-20 rounded-3xl shadow-xl shadow-primary/25` (inner logo `size-12`); headline `Ledg` in `text-4xl font-black tracking-tight`; tagline `Track spending in under five seconds.` (`text-sm font-medium text-muted-foreground max-w-xs`).
2. **3 feature cards** (`my-auto py-8`, stacked `gap-3`): each `flex items-center gap-3.5 rounded-2xl border-border/80 bg-card p-3.5 shadow-xs` with a `size-10 rounded-xl bg-primary/10 text-primary` icon tile and title + sub-copy:
   - `Zap` — **5-Second Logging** — `Snap or type expenses instantly on the go.`
   - `PieChart` — **Smart Analytics** — `Understand where your money goes monthly.`
   - `ShieldCheck` — **Private & Cloud Synced** — `Your financial data is encrypted and safe.`
3. **Actions** (footer, `gap-3`):
   - Primary pill `Get Started` (ArrowRight) → `/sign-up`
   - Outline pill `Sign in to your account` (LogIn) → `/sign-in`
   - Legal row `Privacy Policy · Terms of Service` (`text-xs` links).

**States:** while auth loading → centered spinner. Already signed in → redirect `/`.

### 12.2 Sign in — `/sign-in` (Public)
**Purpose:** return users; email+password or Google.
**Header** (pt-2): circular back (`size-10 rounded-full bg-secondary/80`, `ArrowLeft`) → `/welcome`; center mini brand (`AppLogo size-9 rounded-xl` + `Ledg` `text-xl font-bold`); right spacer `size-10`.
**Main (my-auto, py-6):** heading `Welcome back` + sub `Sign in to track your spending.` Then form `space-y-4`:
- `Email` label + input (`you@example.com`)
- `Password` label + `PasswordInput` (`••••••••`)
- inline error `text-xs text-destructive`; primary pill **Sign in** (`h-12 w-full text-base font-semibold shadow-md`, spinner while loading)
- divider: `— or —` (hairline ± uppercase `or`)
- outline pill **Continue with Google** (`GoogleIcon size-5`)
- footer link `Don't have an account? Create one` (primary, underline hover).
**Footer:** tagline `Track spending in under five seconds.`
**Overlay — Verify your email** (centered modal `max-w-md rounded-xl bg-background p-6 shadow-xl`): heading `Verify your email` + close ✕; `Mail size-12 text-primary`; copy: `Your email [email] hasn't been verified yet.` + `We've sent a verification link. Check your inbox and click the link to activate your account.`; primary pill **Resend verification email** (`RotateCcw`). Shown when sign-in returns 403 "verify".

### 12.3 Sign up — `/sign-up` (Public)
Same header/footer as 12.2. Heading `Create your account` + sub `Track spending in under five seconds.`
Form fields (each: uppercase label):
- **Full name** (`John Doe`)
- **Username** — row label + counter `0/30` (max 30). Input prefixed `@` (`pl-8 pr-10`). Right status icon: spinner while checking, `Check text-emerald-500` when available, `✕ text-destructive` when taken/invalid. Inline helper messages: `@{username} is available!` (emerald) / `@{username} is already taken` (destructive) / rule reason (destructive). Input strips non `a-z0-9_`.
- **Email** (`you@example.com`)
- **Password** — `PasswordInput` (`At least 8 characters`) + **PasswordStrength** bar.
- inline error; primary pill **Create account** (UserPlus) disabled while validation pending/invalid.
- divider + **Continue with Google**
- `Already have an account? Sign in`
**Check-email state (replaces form):** centered `Mail size-16 text-primary`, heading `Check your email`, copy `We've sent a verification link to [email]` + `Click the link to verify your account and get started.`, outline pill **Resend verification email**.

### 12.4 Space invitation — `/invite/:token` (Public + signed-in aware)
**Purpose:** preview + act on a shared-space invite.
**Frame:** centered `min-h-dvh p-4` on a radial glow `bg-radial from-primary/5 via-background to-background`. Logo above; card `max-w-md rounded-4xl border-border/60 bg-card/85 backdrop-blur-2xl shadow-xl shadow-black/10 p-7`.
**Card content (centered):** icon tile `size-16 rounded-3xl bg-primary/10 text-primary` (`Users size-8`) → eyebrow `Space Invitation` (`text-[11px] font-bold text-primary`, Mail icon) → `spaceName` in `text-2xl font-extrabold` → `{inviterName} (@username) invited you to collaborate in this shared space.`
**Meta well** (`rounded-2xl bg-muted/40 border-border/40 p-3.5`): rows `Invited email:` → `inviteeEmail` (semibold) and `Expires:` → relative time (Clock icon).
**Actions by auth state:**
- Not signed in: primary `Sign up to accept →` ; outline `Sign in with existing account`.
- Signed-in but email mismatch: destructive info box (`Are you currently signed in as [email]. This invite was sent to [email]. Please sign in with that email to claim this invitation.`) + outline pill `Switch Account`.
- Ready: primary **Accept Invitation** (Check, `shadow-md shadow-primary/25`) + outline **Decline** (✕).
**Footer microcopy:** `Ledg Secure Invitation System` (Shield icon, `text-[11px] muted-foreground/70`).
**States:** loading → skeleton card (logo block, two text bars, full-width pill). Error/invalid → card with `EmptyState` (AlertCircle rose): `Invitation Expired or Invalid` + message + `Go to Home`.

### 12.5 Dashboard — `/`  (Protected)
**Purpose:** glanceable money state, 5-second capture, recent activity.
Sections (top → bottom), all `gap-6`:
1. **Header** (§11.2).
2. **Balance hero card** (`-mx-5 rounded-b-[2.5rem] bg-linear-to-br from-primary via-primary to-[oklch(0.52_0.15_158)] text-primary-foreground shadow-lg shadow-primary/20 px-5 pb-7 pt-2`):
   - Top row: eyebrow `Total Balance` (`text-xs uppercase`, 80% opacity) + pill `Active` (`rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase backdrop-blur-md`).
   - Giant balance `mt-1.5 text-4xl font-black tracking-tight tabular-nums` (skeleton: `h-12 w-48 bg-primary-foreground/20`).
   - Two stat tiles (`mt-5 grid grid-cols-2 gap-3`, each `rounded-3xl bg-primary-foreground/12 p-3.5 backdrop-blur-md`, hover lift `-2px`):
     - **Income** — tile icon `ArrowDownLeft` in `size-6 rounded-full bg-emerald-400/25 text-emerald-200`; `text-lg font-extrabold tabular-nums` compact value; `this month` caption.
     - **Spent** — `ArrowUpRight` in `bg-rose-400/25 text-rose-200`; same style.
3. **Dues summary card** (auto-hides when no active dues). `Link` to `/dues`, `rounded-4xl border-border/50 bg-card/80 backdrop-blur-xl shadow-sm rounded-4xl p-4`, hover `border-primary/40 shadow-md`:
   - Header: `HandCoins` tile `size-8 rounded-4xl bg-primary/10 text-primary` + `Dues` bold uppercase + `N active dues` caption; right `ChevronRight` (+ `N overdue` destructive pill when applicable: `bg-destructive/12 border-destructive/20 text-destructive`, AlertTriangle icon).
   - 2-col stats: **Receivable** (emerald `ArrowUpRight`) = `summary.owedToMe`; **Payable** (amber `ArrowDownLeft`) = `summary.iOwe`. Tiles `rounded-3xl p-3` tinted `emerald-500/8` / `amber-500/8` borders, amounts `text-base font-black tabular-nums`.
   - Net row (`rounded-4xl bg-muted/50`): `Net position` + `+amount`/`-amount` colored emerald/amber.
4. **Loading:** two skeletons (`h-28` & `h-40`, `rounded-4xl`). **[All-empty state]** if `transactionCount === 0`: `Card rounded-4xl` wrapping `EmptyState` with `ReceiptText size-7`: title `Nothing tracked yet`, `Add your first transaction to start understanding your spending.`, pill **Add your first transaction** (Plus).
5. **Spending breakdown** (when category data exists): `Segmented` `Expense | Income`. Card `p-4` lists **top 4 categories**: row = colored dot (`size-2.5 rounded-full` in category color) + name + amount (`tabular-nums font-semibold`), under it a `h-2 rounded-full bg-muted` animated bar in category color, width = % of max. **[Per-tab empty]**: `EmptyState` `No expenses tracked`/`No income tracked` + `Add your first expense/income to see it broken down here.` + outline pill `Add expense`/`Add income`.
6. **Payment Methods** (when >0): eyebrow `Payment Methods` (CreditCard icon); 2-col grid of `Card rounded-4xl p-4` tiles: method icon tile (`size-9 rounded-2xl`, color per §3.6) + display name + `%`, bold amount `text-base font-bold tabular-nums`, `h-1.5` primary-colored bar (width = % of total). Hover lift / tap scale.
7. **Recent activity** (when >0 or loading): eyebrow `Recent activity` + right link `See all` (`text-primary`). Rows = `SwipeableTransactionItem` (§10.13). Skeleton `h-16 rounded-3xl` ×3 while loading.
8. **Smart Insight** (when `transactionCount > 0`): `rounded-4xl bg-accent/50 p-4` row — `TrendingUp` tile `size-11 rounded-2xl bg-primary/15 text-primary` + `Smart Insight` label + `You spent [amount] this month across N categories.` (or `No expenses recorded this month yet.`)
9. `DeleteTransactionSheet` mounted (from swipe).
**Edit/create:** tap row → Edit transaction sheet (locked to that space); Add via nav.

### 12.6 Activity / Transactions — `/transactions`  (Protected)
**Purpose:** searchable, filterable full history with day grouping.
Sections (`gap-5`):
1. **Header:** title `Activity` (`text-2xl font-extrabold tracking-tight`), sub `N transactions` (`text-sm muted`); right: `Export CSV` outline icon button (`Download`, `rounded-full size-11`) + `Show Filters` outline icon button (`SlidersHorizontal`).
2. **Search** (`relative pl-10` Input, Search icon, placeholder `Search notes, categories…`, debounced 350ms).
3. **Segmented** `All | Expense | Income`.
4. **Filter chips** (expand ~0.2s when toggled): pills `All spaces` + each space name; active `bg-primary text-primary-foreground`, idle `bg-muted text-muted-foreground hover:bg-accent`.
5. **Content:**
   - Loading → 4 skeleton rows `h-16 rounded-3xl`.
   - Error → `EmptyState` (`SearchX size-7` rose): `Couldn't load transactions` + server message.
   - Empty + no filters → `EmptyState` (`ReceiptText`): `No transactions yet` / `Start recording your expenses and income to see them here.` + pill `Add transaction`.
   - Empty + filters → `SearchX`: `No matching transactions` / `No transactions match your current search or filters.` + outline `Clear filters` (✕).
   - Data → **day groups**: day label `relativeDay` (`text-xs font-bold uppercase text-muted-foreground`) with right-aligned day net (`+₹`/`−₹`, or nothing if 0), then stacked `SwipeableTransactionItem`s. Day net = income − expense.
6. **Pagination** (when >1 page; 20/page): `Page X of Y (N total)` + prev/next + numbered pills (1, last, current±1).
**Row anatomy (TransactionItem):** `motion.button whileTap scale-98`, `flex items-center gap-3.5 rounded-3xl border-white/20 bg-card/75 px-3 py-3 shadow-xs backdrop-blur-md hover:shadow-md`:
- Left `size-12 rounded-2xl` tinted category icon (`bg-[color]/1f`, icon `size-5 stroke-[2.2]`).
- Middle: title line `text-sm font-semibold truncate` = note or category; meta line `text-xs muted` = `Category · Payment method` + attribution chip `@username` (`bg-primary/10 text-primary text-[10px] font-semibold`) when another member created it.
- Right: amount `text-sm font-bold tabular-nums` **`+` emerald / `−` destructive** + date `ArrowDownLeft|ArrowUpRight + 12 Feb` (`text-[0.65rem] uppercase muted`).
Tap → edit (or `toast.info("Only the creator or space owner can edit this transaction")` in shared spaces when not allowed).

### 12.7 Spaces — `/spaces`  (Protected)
**Purpose:** manage all ledgers (personal/shared) by purpose.
1. **Header:** `Spaces` title + sub `Organise money by purpose`; right round primary icon button **+** (`Create space`).
2. **Segmented** `All (N) | Personal (N) | Shared (N)`.
3. **Search** pill (`Search spaces…`, leading Search, trailing clear ✕).
4. Loading → 2 skeleton cards `h-28 rounded-4xl`. Empty → `EmptyState` (`Wallet`): `No spaces yet` / `Create a space like Personal, Trip or Business to start tracking money there.` + pill `Create a space` (or `No results found` + `Clear search`).
5. **Space cards** (`Card rounded-4xl p-4`, hover lift `-3px` + `shadow-md`, tap scale `0.98`, cursor pointer; shared-space cards extra `border-primary/20 bg-primary/2 dark:bg-primary/5`):
   - Row: type icon tile `size-11 rounded-2xl` (colors §3.4) + name `font-bold` → `Owner` chip (`Shield` primary) or `Member` chip (`User` muted) on shared; type badge pill; `· N txns` caption.
   - Member avatar stack (shared): `-space-x-2` overlapping `size-6 rounded-full ring-2 ring-card bg-primary/20 text-primary text-[10px]` initials (max 4 + `+N` muted tile) + `N members`.
   - Right column: balance `text-base font-bold tabular-nums` colored by sign (`getBalanceColor`: +emerald / −rose / 0-foreground) + owner-only **edit** `Pencil` and **delete** `Trash2` round `size-8` buttons (`bg-muted` / `bg-destructive/10 text-destructive`).
   - **Monthly budget block** (when budget > 0): `mt-3 pt-2.5 border-t` — label `Monthly budget` + `spent / budget` gutter-style double bar (primary + destructive when over, amber when ≥75%). Captions: `X% spent` + `₹remaining` OR `+₹X over (N%)` destructive. Track `h-2 rounded-full bg-muted/60` (over: `p-0.5` split bar).
6. Tapping card → `/spaces/:id`. Sheets mounted: Create/Edit space, Delete confirmation.

### 12.8 Space detail — `/spaces/:id`  (Protected, role-aware)
1. **Top bar:** back link `Back` (`ArrowLeft`, `text-sm font-semibold text-muted-foreground` hover primary) → `/spaces`; right: `Members` outline pill (`Users` icon + count badge `bg-primary/10 text-primary`) + owner edit `Pencil` icon button + `MoreVertical` popover (menu: `Export CSV`; `Delete Space` [owner, red] or `Leave Space` [member, red with `LogOut`]).
2. **Search** Input (leading Search, placeholder `Search {space} transactions…`, resets page).
3. **Space hero card** (`rounded-4xl p-5 bg-card/80 backdrop-blur-md`): type icon `size-12` + `name` (`text-lg font-extrabold`) + type badge + `N transactions`; round **+** button top-right (`size-12 rounded-full`) → Add transaction pre-locked to this space. Below, stat well (`rounded-2xl bg-muted/40 p-3`):
   - `Balance` → colored big figure; divider; `Income` (`TrendingUp` emerald) `+₹`; `Expenses` (`TrendingDown` rose) `−₹`; divider; **Month Budget** block when set (same bar treatment as 12.7-5).
4. **Segmented** `All | Expense | Income`.
5. **Transaction list** — same day-grouping + swipe/edit rules as 12.6. Empty + clean → `No transactions in this space` / `Tap below to add the first transaction to {space}.` + `Add transaction`; empty + filtered → `No matching transactions` + `Clear filters`. Pagination like 12.6.
6. **Sheets:** Members (§13.9), Edit Space, Delete Space, Transfer Ownership, Remove Member, Leave Space, Delete Transaction.

### 12.9 Dues & Loans — `/dues`  (Protected)
**Purpose:** track money lent/borrowed per person.
1. **Hero** (`-mx-5 rounded-b-[2.5rem]` emerald gradient, like Dashboard): 
   - Top row: `Dues & Loans` (HandCoins tile + bold, `text-sm`) + right round search toggle (Search ⇄ ✕).
   - Search expanding bar when toggled (`Search by name, note, or phone...`).
   - **Net** `text-4xl font-black tabular-nums` + `Net receivable` / `Net payable · N active` caption.
   - 2 stat tiles: **Owed to you** (emerald `ArrowUpRight`, `text-emerald-300` icon in `bg-emerald-400/25`) with `text-xl font-extrabold`; **You owe** (amber `ArrowDownLeft`).
   - **Overdue banner** when >0: `rounded-4xl bg-red-500/20 border-red-400/20` — `AlertTriangle` red-200 + `N dues are overdue · check now`.
2. **Sticky filter bar** (`sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b`): **tabs** `Active` (with count badge), `Owed [↑]`, `I Owe [↓]`, `Done [✓]` as pill filter buttons (active `bg-primary text-primary-foreground shadow-primary/30`); right **view toggle** (`Users` group-by-person ⇄ `LayoutList` flat) in a bordered pill.
3. **Content:**
   - Loading → centered spinner `Loader2 text-primary` + `Loading dues...`.
   - Empty → dashed `EmptyState`: `No active dues` / `No settled dues yet` / `No matching dues`; description `Tap + to record money lent or borrowed`; actions `I Lent` (`bg-emerald-600`) + `I Borrowed` (amber outline).
   - **Person mode (default):** person cards (`rounded-4xl border-border/50 bg-card/80 backdrop-blur-xl`): header row = gradient initials avatar (`size-11`, §3.8, red `!` bubble when overdue) + name (`font-bold`) + optional `tel:` Phone mini-button + `N dues · N overdue (red)` + right net (`+₹owes you` emerald / `−₹ you owe` amber / `settled` mute) + ChevronDown rotate on expand. Expanded body (AnimatePresence) = `DueRow`s divided by hairline.
   - **DueRow:** direction icon tile (`size-9 rounded-4xl`: settled `bg-muted text-muted-foreground` CheckCircle2; lent emerald `ArrowUpRight`; borrowed amber `ArrowDownLeft`) + name + micro badges (`partial` secondary, `settled` emerald `bg-emerald-600`, `Nd late` destructive w/ AlertTriangle) + date line (`Clock` + `due [relative]` red when overdue) + mini progress bar when partially settled (emerald/amber, % label) + right column: **remaining** `text-sm font-bold tabular-nums` (+ `of ₹principal` when partial, line-through when settled) + round settle `CheckCircle2` button (emerald/amber tint) that opens Settle sheet (stopPropagation).
   - **Flat mode:** same DueRow inside bordered cards.
4. **Floating action cluster** (fixed `bottom-24 right-5 z-20`): stack of two pills — `I Borrowed` (`bg-amber-500`, `shadow-amber-500/30`) above `I Lent` (`bg-emerald-600`, `shadow-emerald-600/30`) — spring-stagger entrance. Each opens Create sheet pre-set to direction (optionally pre-filled person from context).
5. **Sheets:** CreateDue (§13.3), SettleDue (§13.4), DueDetail (§13.5).

### 12.10 Insights / Analytics — `/analytics`  (Protected)
**Purpose:** understand money flows over time; drill into categories.
1. **Header:** title `Insights` + sub `Financial analytics & spending breakdown`.
2. **Space chips** (All spaces + each) — same pill pattern as 12.6.
3. **Period Segmented:** `Today | Month | 3M | All | Custom`.
4. **Custom range card** (when `Custom`): `Card rounded-3xl bg-muted/40 p-4` → eyebrow `Custom Date Filter` (CalendarIcon) → `From Date` / `To Date` DatePickers (auto-correct ordering) → footer `Viewing single day`/`Viewing date range` + `Reset to today`.
5. Loading → skeleton stack. Empty period → `EmptyState` (`PieChart`): `No data for this period` / `No transactions found {this month}. Try selecting a different period or add new transactions.`
6. **Income/Expenses mini-cards** (2-col): icon tile (`size-10 rounded-2xl` success / destructive) + label + `text-lg font-bold tabular-nums` + delta badge (`TrendingUp/Down`, `bg-success/15 text-success` or `bg-destructive/15 text-destructive`) + `vs last month` etc. (Expense delta is inverted.)
7. **Savings rate card** (`rounded-4xl p-5`): eyebrow `Savings rate`, big `N%` (`text-3xl font-extrabold`), `of income saved [period]`; right **SVG donut ring** `size-20` (track `stroke-muted/30`; spending arc `stroke-destructive`, saving arc `stroke-success`, round caps, center `N%` `text-[10px] font-bold`). Legend under divider: green dot `Saved ₹X` + red dot `Spent ₹X`.
8. **Quick Insights** (`InsightsCard`, when present): eyebrow `Quick Insights`; each = `Card rounded-3xl p-4` with `Lightbulb size-4` tile (`bg-primary/10 text-primary`) + `text-sm leading-snug` sentence.
9. **Spending by category** (drillable): eyebrow `Spending by category`; card `p-5`, each row (tap → CategoryDrilldownSheet): category icon tile (`size-10 rounded-2xl`, own color) + row `category` + amount; bar (`h-1.5`, category color) + `%`; caption `N transactions · tap to explore`.
10. **Income by category:** same as above but non-clickable, label `Income by category`.
11. **Recurring** (`RecurringCard`, when detected): eyebrow `Recurring` (RefreshCw); card `rounded-4xl p-0`: header row `N recurring patterns detected` + `~₹X/avg`; rows (max 5): category tile + `note || category` + `N× · category` + amount `text-sm font-semibold` + `avg/time`.
12. **CategoryDrilldownSheet** (§13.8).

### 12.11 Settings (You) — `/settings`  (Protected)
**Purpose:** profile summary + preferences + data + legal + sign out.
Title `You` (`text-2xl font-extrabold`).
1. **Profile card** (Link → `/profile`): `Card rounded-4xl p-5` — `UserAvatar size-16 ring-2 ring-primary/20` + name `text-lg font-bold` + `@username` primary + auth provider chip (`Google OAuth` / `Email & Password`, `bg-primary/10`) + `ChevronRight`. Hover lifts bg.
2. **Grouped list pattern** (iOS-Settings style): section eyebrow uppercase `Preferences`; `Card rounded-4xl p-1.5` rows divided by `h-px bg-border/60`, each row = icon tile (`size-10 rounded-2xl bg-primary/10 text-primary`) + title `text-sm font-semibold` + subtitle `text-xs muted` + `ChevronRight`:
   - **Appearance** — icon per current theme (Moon/Sun/Monitor) — subtitle `Light/Dark/System Default [capitalized]`.
   - **Motion** — `Activity` icon — `Full / Reduced / System Default`.
   - **Notifications** — `Bell` — `Invite alerts on`/`Alerts off`/`Configure alerts`.
3. **Feedback & Requests:** eyebrow; row **Request a Feature** (`Sparkles`) — `Suggest an idea or report an issue` → RequestFeatureForm sheet.
4. **Data & Backup:** rows **Export Transactions (CSV)** (`Download`) — `Download spreadsheet with all transaction records`; **Full Data Backup (JSON)** (`Database`) — `Export spaces and transactions for backup`.
5. **Legal:** **Privacy Policy** (`ShieldCheck`) / **Terms of Service** (`FileText`) links.
6. **Sign out** button: outline `rounded-full text-destructive hover:bg-destructive/10 w-full` (`LogOut`), spinner `Signing out…`.
**Sheets:** theme picker (§13.11), motion picker (§13.12), notification prefs (§13.13), request feature (§13.14).

### 12.12 Profile — `/profile`  (Protected)
**Purpose:** manage identity, password, dangerous actions.
Header: circular back (→ `/settings`) + centered title `Profile` + spacer.
1. **Hero card** (`rounded-4xl p-6 bg-gradient-to-b from-card to-muted/30`, centered): `UserAvatar size-20 ring-4 ring-primary/20` — name `text-xl font-extrabold` → `@username` primary → email `text-xs muted` → chips: `Google Account`/`Password Protected` (`bg-primary/10`, Shield icon) + `Joined Apr 2025` (`bg-muted`, Calendar icon).
2. **Personal Information** row (`Card rounded-4xl p-4`): `UserRound` tile + `Name, username & email` + Chevron → sheet.
3. **Security & Password** row (only email/password users): `Lock` tile + `Change your password`.
4. **Danger Zone:** destructive eyebrow (`Trash2`); `Card rounded-4xl p-5 bg-destructive/5 border-destructive/20`: title `Delete Account` (`text-sm font-bold text-destructive`), copy `Permanently delete your account, spaces, and all associated records. This action is irreversible.`, solid-danger pill **Delete My Account**.
**Sheets:** Personal information (name/username/email + live username check + `Save Changes`), Security & password (current + new + strength + `Change Password`), Delete account confirmation (danger box + type-your-name-to-confirm + solid `Permanently delete my account`).

### 12.13 Privacy Policy — `/privacy` and Terms of Service — `/terms` (Public)
Plain, readable document pages: circular back, title, prose blocks (`text-sm leading-relaxed text-muted-foreground`, headings `font-bold`), section list. Calm, minimal, no brand decoration beyond the back button + title.

---

## 13. Sheet-by-sheet specifications

> Trigger availability, titles, and exact actions. Unless noted, all are bottom sheets (§10.6).

### 13.1 Add / Edit transaction (global, one instance app-wide)
- **Trigger:** bottom-nav `+`, header-less everywhere, page empty-state buttons, tapping a transaction row (edit).
- **Title:** `Add transaction` / `Edit transaction` · **Description:** `Less than five seconds, promise.`
- **Body (gap-5, top → bottom):**
  1. `Segmented` **Expense | Income** (switching fixes category list).
  2. **Amount well** (`rounded-4xl bg-muted/70 p-5`): `Rs.` prefix + giant `text-5xl font-extrabold tracking-tight` numeric input (`inputMode=decimal`, filters to numbers/one dot, placeholder `0`, autofocus) + **quick chips** `Rs. +100 · +250 · +500 · +1000 · +5000` (increment running value).
  3. **Category** `text-sm font-medium`: 4-col grid of category tiles (`rounded-2xl p-2.5`, full-width, icon colored by §3.3, label `text-[0.65rem]` truncated; active = `bg-accent/80 ring-1 ring-primary/30`, icon `stroke-2.4`).
  4. **Note** Input (`e.g. Coffee with Sara`, max 500).
  5. **Date | Space** 2-col: DatePicker + quick chips Today/Yesterday/2 days ago; Space Select (`Wallet` leading icon) listing spaces + divider + `+ New space…` (navigates to `/spaces`). Space locked (disabled) when launched from a space detail.
  6. **Payment** `text-sm font-medium`: pill row `Cash · Card · Bank transfer · Wallet` (icons Banknote/CreditCard/Landmark/Wallet; active `bg-primary`).
  7. Primary pill **`Add transaction`** (**`Save changes`** when editing) with spinner `Adding…`/`Saving…`.
- Validation via toast: `Enter a valid amount`, `Create a space first`.
- Success toast: `Transaction added` / `Transaction updated`.

### 13.2 Delete transaction (global)
- **Trigger:** swipe a deletable row (§10.13).
- **Title:** `Delete Transaction` · **Description:** `This will permanently remove the transaction.`
- **Body:** summary row `rounded-3xl border p-4` = category icon tile + note/category + payment method + right amount (`+`/`−` colored); then solid-danger pill **Delete Transaction** (`Trash2`, spinner `Deleting…`) + outline **Cancel**. Success: `Transaction deleted`.

### 13.3 Create due
- **Titles:** none (direction lives in the UI). Body (gap-0, stacked):
  1. **Direction hero** (`rounded-3xl bg-muted/50 p-1`): two half pills **I Lent** (`ArrowUpRight`, solid `bg-emerald-600 text-white shadow-emerald-600/30`) / **I Borrowed** (`ArrowDownLeft`, solid `bg-amber-500 text-white shadow-amber-500/30`).
  2. Context strip: `Recording money you lent` / `You borrow...` + helper `They owe you · creates an expense transaction` (emerald tint) / `You owe them · creates an income transaction` (amber tint).
  3. **Amount** big input (`Rs.` prefix, `text-3xl font-black tabular-nums`, `min 0.01`, autofocus).
  4. **Lent to / Borrowed from** (required) — User icon, `Person's name`; recent-name chips (up to 5 from history).
  5. **Phone** (optional) — tel input `e.g. 9841234567`.
  6. **Date** — quick chips Today/Tomorrow/Next week/Next month + DatePicker.
  7. **Due Date** (optional, CalendarDays) — DatePicker `Set a repayment reminder` + `Clear` link.
  8. **Via** — 4-col payment grid (cash/wallet/bank_transfer/card icons + labels).
  9. **Ledger Space** Select (only when user has >1 space): `{name} ({type})`.
  10. **Note** (optional) `e.g. For trip / dinner bills...`.
  11. Submit pill **Record Lending** (`bg-emerald-600 shadow-emerald-600/25`) / **Record Borrowing** (`bg-amber-500 shadow-amber-500/25`), spinner `Saving...`.
- Success toast: `Lent Rs. X to [name]` / `Borrowed Rs. X from [name]`.

### 13.4 Settle due (Record repayment / payment)
- **Trigger:** settle (✓) button on a due row / from DueDetail.
- **Title:** `Record Repayment` (lent) / `Record Payment` (borrowed).
- **Body:**
  1. Context header (`bg-muted/40`): `CheckCircle2` tile + `Record Repayment`/`Record Payment` + `Money received from / paid to [name]`.
  2. **Balance overview card:** 3-col `Principal | Settled | Remaining` (remaining highlighted `text-primary text-lg font-black`) + progress bar (`h-2.5`): settled `bg-emerald-500`, live preview of this payment `bg-primary/50`, caption `N% settled → N% after this`.
  3. **Settlement Amount\*** — `Rs.` input (`text-2xl font-black`) + right link `Full (₹X)` (Zap) + quick chips `+500/+1000/+2000/+5000` + `Full` (hidden if ≥ remaining).
  4. **Date** DatePicker (defaults today) · **Via** 4-col payment grid · **Note** `e.g. Paid via eSewa / cash in hand...`.
  5. Submit pill: **Settle Fully · ₹X** (`bg-emerald-600`, `PartyPopper`) when full, else **Record ₹X** (`CheckCircle2`).
- Success toast: `Recorded ₹X from [name]`; on full: `Fully settled with [name]!`
- Errors: `Please enter a valid settlement amount`; `Cannot exceed remaining balance of ₹X`.

### 13.5 Due detail
- **Trigger:** tap a due row / person header.
- **Body:**
  1. **Hero header** (`-mx-5 px-5 pt-4 pb-5`, tinted gradient emerald/amber or `bg-muted/40` when settled): gradient icon avatar (`size-12`, ArrowUpRight/ArrowDownLeft/CheckCircle2) + `name` `text-lg font-black` + status badge (`open`/`partially settled`/`settled`; settled = `bg-emerald-600`) + sub `You lent · they owe you`/`You borrowed · you owe them` + `tel:` round button when phone. Then big `remaining` (`text-3xl font-black` emerald/amber, or `Settled` mute) + `remaining of ₹X principal`; 3-col `Principal · Settled · Remaining` mini-stats; progress bar (primary/emerald) + `Repayment progress N%`; date row (given on, `Due`/`Nd overdue` pill); optional note strip (`FileText`).
  2. **Payment History:** header + `N payments` count pill; empty → dashed box `No payments recorded yet` + `Tap "Record Settlement" to start`; else settlement rows: `#N` badge (`bg-emerald-500/10`) + `₹X` black + payment-method badge + relative date + note + **Undo** button (`border-destructive/25 bg-destructive/5 text-destructive`, Undo2 icon).
  3. **Actions:** primary settler pill (**Record Settlement · ₹X**, emerald/amber) — opens Settle sheet; when `open` with no settlements: outline red **Delete Due** → confirm-with-action toast (`Delete this due? This cannot be undone. The linked transaction will also be removed.` → `Delete`). Unsettling uses action-toast (`Undo ₹X settlement?` → `Undo`/`Cancel`).

### 13.6 Create/Edit space (from Spaces & Space detail)
- **Title:** `New space` / `Edit space`.
- **Description:** `Give this space a name, purpose, and optionally invite members.` / `Update space settings and monthly budget.`
- **Body (gap-5):**
  1. **Name** Input (`e.g. Personal, Goa Trip, Family Budget`, max 100, autofocus).
  2. **Type** Segmented `Personal | Family | Trip | Business`.
  3. **Monthly Budget (Optional)** numeric Input (`e.g. 25000`, step 100) + `Rs. / month` hint on the right of label.
  4. **Invite Collaborators (Optional)** — *create only*: input `name@email.com or @username` + inline `Add` pill; Enter/, adds a chip (`rounded-full bg-primary/10 border-primary/20 text-primary` + ✕ to remove; counter `N/10`; rules: `@username` 3–30 `[a-z0-9_]`, valid email, no self, no dupes, ≤10; server errors via toast).
  5. Submit pill **Create space** (Plus) / **Save changes** (Check), spinner `Creating…`/`Saving…`.
- Success toasts: `Space created` / `Space created and invitations sent!` / `Space updated`.

### 13.7 Delete space (Spaces & Space detail)
- **Title:** `Delete Space`. Description states the exact consequence: personal → `This will permanently delete "[name]" and all N transactions in it.`; shared → `This will permanently delete the shared space "[name]" for all members and remove all transactions.`
- **Actions:** solid-danger **Delete Space** (`Trash2`, spinner `Deleting…`) + outline **Cancel**. Success: `Deleted "[name]"` → navigate `/spaces`.

### 13.8 Category drilldown (Analytics)
- **Trigger:** tap a spending category row.
- **Title:** category name · **Description:** `N transactions · ₹X total`.
- **Body:** accent summary row (`bg-accent/50`): category icon tile + `Total spent` + `text-xl font-bold` total; then up to 20 compact rows (`Card rounded-3xl px-4 py-3`): note/category + date (`12 Feb`) left, `-₹X` (`text-destructive`) right; footer link `See all in Transactions` (`ExternalLink`) → `/transactions?category=…`. Empty: `No transactions in this category`.

### 13.9 Space members (Space detail)
- **Title:** `Space Members` · **Description:** `Collaborators in "[name]"`.
- **Body:**
  1. **Active Members (N):** rows (`rounded-2xl bg-muted/40 border`) — initials avatar `size-9 rounded-full bg-primary/20 text-primary` + name + `(You)` when self + `@username` + role badge (**Owner** `ShieldCheck bg-primary/15 text-primary` / **Member** `bg-muted`) + owner-only **Transfer** ghost button + **Remove** `UserMinus` icon (`text-destructive size-7`).
  2. **Invite New Member** (owner): Input `member@email.com or @username` + full-width pill **Invite** (`Mail`).
  3. **Pending Invitations (N)** (owner): rows with `@user`/email + `Sent on [date]` + **Resend** (`RotateCw`) + ✕ revoke (`toast: Invitation revoked`).
  4. **Leave This Space** (non-owner): destructive outline flow → Leave confirmation.

### 13.10 Transfer ownership / Remove member / Leave space (confirmations)
- **Transfer Ownership:** description `Transfer ownership of "[space]" to [name]? You will become a regular member of this space.` → primary **Confirm Transfer** (`Check`) + **Cancel**.
- **Remove Member:** `Are you sure you want to remove [name] from "[space]"? Their past transactions will remain in this space.` → solid-danger **Remove Member** + **Cancel**. Toast `Removed [name] from space`.
- **Leave Space:** `Are you sure you want to leave "[space]"? You will lose access to its transactions until re-invited.` → solid-danger **Leave Space** (`LogOut`) + **Cancel**. Toast `Left "[space]"` → go `/spaces`.

### 13.11 Notification center
- **Trigger:** header bell. **Title:** `Notifications` · **Description:** `Stay updated with shared space activities and invitations`.
- **Body:**
  1. Header row: `N Unread` / `All caught up` (uppercase) + ghost **Mark all as read** (`CheckCheck`, primary) when applicable.
  2. **Pending Invitations (N)** — emphasized cards (`border-primary/30 bg-primary/5 p-3.5`): `spaceName` bold + `Invited by [name]` + `Invite` chip; buttons **Accept** (primary, Check) + **Decline** (outline, ✕). Accept → toast `Joined "[space]"!` → open that space.
  3. **Recent Activity** (or list directly): each item row (`rounded-2xl p-3`; unread = `border-primary/20 bg-primary/5`, read = transparent) — icon tile (`size-8 rounded-full` per §3.5) + bold/unbold title + 2-line message + relative time (`Clock`). Unread dot (`size-2 bg-primary`).
  4. Empty → `Inbox` tile + `No notifications` / `You're completely up to date with all your spaces.`
  5. Tap a non-invite notification → mark read + open its space (unless `space_deleted`).

### 13.12 Theme picker
**Title:** `Choose Theme` · **Description:** `Select your preferred display appearance.`
Three option cards (`rounded-3xl p-4`, active = `border-primary bg-primary/10 text-primary shadow-xs` with icon tile `bg-primary` + trailing `size-2 bg-primary` dot, idle = bordered): **Light Mode** (Sun) / **Dark Mode** (Moon) / **System Default** (Monitor). Tap applies instantly & closes.

### 13.13 Motion picker
**Title:** `Choose Motion` · **Description:** `Control how animated the app feels.`
Same card UI: **Full Motion** (Activity) / **Reduced Motion** (Waves) / **System Default** (Monitor).

### 13.14 Notification preferences
**Title:** `Notification Preferences` · **Description:** `Control which events send you in-app alerts.`
- **Invitation Alerts** toggle — `Notify me when I receive a space invitation`.
- **Member Changes** toggle — `Notify me when members join or leave my spaces`.
- **Transaction Alerts** — Segmented `Realtime | Daily Digest | Off`, helper `How to notify you of transaction activity in shared spaces`.
- Saving indicator `Preferences saved` (Check, emerald). Each control writes instantly.

### 13.15 Request a feature (Settings)
Card layout inside a bare sheet: Sparkles tile + `Request a Feature` + `Have an idea or found an issue? Let us know.` Fields: **Name**, **Email**, **Category** select (`Feature Request / Bug Report / General Feedback / Support / Other`), **Message** textarea (`Tell us what you'd like to see…`); submit pill **Send Request**. Success card: `CheckCircle2` tile + `Thanks for reaching out!` + `Your request has been submitted. We'll review it and get back to you if needed.` + `Send another request`.

### 13.16 Personal information (Profile)
**Title:** `Personal Information` · **Description:** `Update your name, username and email.`
Fields: **Full Name**, **Username** (with live availability check, §12.3 rules), **Email Address**; primary pill **Save Changes** (Check, disabled until valid & no conflicts; spinner `Saving changes…`). Toast: `Profile updated successfully` / `Profile is already up to date`.

### 13.17 Security & password (Profile — email users only)
**Title:** `Security & Password` · **Description:** `Update your account password.`
**Current Password** + **New Password** (≥8 chars, strength bar) + error line; outline pill **Change Password** (`KeyRound`, spinner `Updating password…`). Toast: `Password changed successfully`.

### 13.18 Delete account (Profile)
**Title:** `Delete Account` · **Description:** `This action cannot be undone.`
Danger box: `Your account, along with all your spaces and transactions, will be permanently deleted.` Label `Type [name] to confirm`; free-text Input (must match name, case-insensitive); solid-danger pill **Permanently delete my account** (`Trash2`, spinner). Success → toast `Your account has been deleted` → `/welcome`.

---

## 14. Cross-cutting states

| State | Patterns |
|---|---|
| Initial route / auth check | Full-screen centered spinner (`size-8 border-2 border-muted border-t-primary animate-spin`) |
| Route lazy-load | Same centered spinner |
| Data loading | Matching-radius `Skeleton` blocks (§10.9) in page flow, not separate screens |
| Query error | `EmptyState` card w/ `SearchX` (rose) or `AlertCircle` + server message + recovery action |
| Empty (no data) | `EmptyState` per page with a single, specific CTA button |
| Filtered empty | `EmptyState` + `Clear filters` / `Clear search` outline pill |
| Mutating | Button spinner + optimistic toasts; destructive buttons show contextual spinner label |
| Offline/network | Standard `toast.error` with server message; queries use `staleTime 30s`, single retry |

---

## 15. Role-aware shared-space UI (permissions)

| Capability | Owner | Member |
|---|---|---|
| Edit/delete any transaction | ✔ | only transactions *they* created |
| Create transaction | ✔ | ✔ |
| Invite / resend / revoke invitations | ✔ | ✘ (no section shown) |
| Remove member / transfer ownership | ✔ | ✘ |
| Edit space / set budget | ✔ | ✘ |
| Delete space | ✔ | — |
| Leave space | — | ✔ (Leave flow instead of Delete) |
| Badges on space cards | `Owner` (Shield) | `Member` (User) |

Rules to surface in UI: non-eligible edit taps → `toast.info("Only the creator or space owner can edit this transaction")`; delete click hidden/unavailable on swipe for non-creators (`canDelete=false`, no delete panel).

---

## 16. Responsive behavior

- **Base = mobile** (`360–430px`): all above.
- **Tablet (≥640px):** auth screens get `py-8`; live
  - Analytics custom range becomes 2-col (`sm:grid-cols-2`).
  - Content remains the centered `max-w-md` column; bottom nav floats centered with larger padding.
- **Desktop (≥1024px):** identical centered column; sheets behave as a bottom-anchored panel or centered dialog, `maxWidth` ~ `max-w-md`. Secondary layouts (e.g. two-column) are intentionally out of scope — keep the single-column money focus.

---

## 17. Accessibility

- All icon-only buttons have `aria-label`s (export, filters, add, edit, delete, close, notifications, back).
- Segmented controls are `role="radiogroup"` with checked states; sheets expose title/description via `Drawer.Title/Description` (or `sr-only`).
- Focus: `focus-visible:ring-3 ring-ring/50` on buttons/inputs; visible, not outline-only.
- Contrast: muted text keeps ≥4.5:1 in both themes; primary-foreground on emerald buttons is near-white in light / deep green in dark.
- Touch targets: interactive rows ≥44px; icon buttons ≥32px (`size-8/9/10/11`); `touch-manipulation` on nav links.
- Reduced motion honored globally (§8).
- Numbers always `tabular-nums`; amounts never OCR/emoji ambiguous (minus sign `−`, no `‑`).

---

## 18. Light / dark mapping guide

Every token already has a dark twin (§3.1). Practical dark-mode adjustments to remember when regenerating:
- Card surfaces become `#1A2421` (not pure black); background near-black `#151817`.
- Hero emerald gradients keep the same OKLCH stops but use the *dark* primary (`oklch(0.65 0.14 158)`) and the darker deep stop.
- Translucent surfaces (`bg-card/75-85`, backdrops) blend against the dark bg — blur has higher impact.
- Category `1f`/`22`-alpha tints read the same in both themes (skip dark-specific hue shifts).
- Borders invert from `#E1E9E5` to white @ 12–15%.

---

## 19. Currency & number conventions

- Symbol: `Rs.` prefix on inputs/hero (INR). Compact display: `₹1.2L`, `₹50K` style for big hero numbers; full `₹X,XXX.XX` on detail figures. (Formatting helpers: `formatCurrency`, `formatCompact`, `tabular-nums` everywhere.)
- Day groups show net with sign (`+₹`/`−₹`), hidden when 0.
- Overdue counts and pages always exact integers.

---

*Footer note — what is intentionally NOT in this spec: any non-Lucide icon system, dashboards requiring desktop tables, stock photography, skeuomorphic bill/coin imagery, marketing tier pages. The app is a focused, calm financial companion.*

---

## 20. Page & route index (for quick generation)

| # | Page | Route | Shell |
|---|---|---|---|
| 1 | Welcome | `/welcome` | none |
| 2 | Sign in | `/sign-in` | none |
| 3 | Sign up | `/sign-up` | none |
| 4 | Invite | `/invite/:token` | none |
| 5 | Privacy / Terms | `/privacy`, `/terms` | none |
| 6 | Dashboard | `/` | AppShell |
| 7 | Activity | `/transactions` | AppShell |
| 8 | Spaces | `/spaces` | AppShell |
| 9 | Space detail | `/spaces/:id` | AppShell |
| 10 | Dues & Loans | `/dues` | AppShell (FAB override) |
| 11 | Insights | `/analytics` | AppShell |
| 12 | Settings | `/settings` | AppShell |
| 13 | Profile | `/profile` | AppShell |