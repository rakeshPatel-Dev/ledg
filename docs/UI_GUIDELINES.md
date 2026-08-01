# UI Guidelines

## Design Philosophy

The interface should disappear.

Users should focus on recording expenses rather than learning the application.

Every screen should answer:

"What is the next thing the user wants to do?"

---

# Core Principles

- Fast
- Minimal
- Accessible
- Consistent
- Mobile-first
- Keyboard-friendly

---

# Color Palette

Primary

Emerald

Success

Green

Warning

Amber

Danger

Red

Neutral

Slate

Avoid using more than one primary accent color.

---

# Typography

Font

Inter

Fallback

system-ui

Hierarchy

Heading

Bold

Subheading

Medium

Body

Regular

Caption

Small

---

# Spacing

Use an 8px spacing system.

Examples

8

16

24

32

40

48

64

---

# Border Radius

Small

8px

Cards

12px

Dialogs

16px

Buttons

10px

Maintain consistency.

---

# Shadows

Use subtle elevation.

Avoid heavy shadows.

---

# Icons

Lucide React only.

Do not mix icon libraries.

---

# Buttons

Primary

Filled

Secondary

Outline

Danger

Red

Ghost

Transparent

Avoid more than four button styles.

---

# Forms

Labels always visible.

Required fields marked.

Inline validation.

No alert popups.

---

# Tables

Sticky headers.

Sortable columns.

Searchable.

Pagination after 50 records.

---

# Dashboard

Top

Balance

↓

Income

↓

Expenses

↓

Charts

↓

Recent Transactions

---

# Mobile

Bottom navigation.

Large tap targets.

One-handed operation.

---

# Empty States

Every empty state should explain:

Why it's empty.

What the user should do next.

Example

"No transactions yet.

Add your first transaction to start tracking your spending."

---

# Loading States

Prefer skeletons.

Avoid spinners whenever possible.

---

# Error Messages

Human language.

Bad

"Validation Error"

Good

"Amount must be greater than zero."

---

# Animations

Duration

150–250ms

Avoid long transitions.

Use motion only to clarify state changes.

---

# Accessibility

Keyboard navigation.

ARIA labels.

High contrast.

Visible focus states.

Screen reader support.

Minimum touch target

44×44 pixels.