# Design System

**Project:** Ledg  
**Version:** 1.0  
**Last Updated:** August 2026

---

# Design Philosophy

Ledg is not an accounting application.

It is a **personal finance companion**.

The interface should feel calm, premium, and effortless. Users should spend their time understanding their finances—not learning how to use the application.

The UI should disappear into the background.

Every design decision should answer one question:

> **Does this reduce friction?**

---

# Design Principles

## Minimal First

Only show what the user needs.

Remove unnecessary borders, labels, buttons, and visual noise.

---

## Speed Over Decoration

The interface should feel instantaneous.

Avoid animations that slow users down.

Prioritize responsiveness over visual effects.

---

## Mobile First

Most expenses are recorded on a phone.

Design for mobile first, then scale naturally to tablet and desktop.

---

## Human-Centered

Use language that feels natural.

Instead of

```
Validation Error
```

Use

```
Amount must be greater than 0.
```

---

## Accessibility

Everyone should be able to use Ledg.

Support

- Keyboard navigation
- Screen readers
- High contrast
- Visible focus states
- Large touch targets

---

# Visual Identity

The overall aesthetic should feel inspired by

- Apple Wallet
- Apple Health
- iOS Settings
- Linear
- Notion
- Arc Browser

Keywords

- Calm
- Premium
- Spacious
- Elegant
- Modern
- Minimal
- Trustworthy

Avoid

- Flashy gradients
- Neon colors
- Heavy shadows
- Dashboard clutter
- Skeuomorphism
- Neumorphism

---

# Color Palette

## Background

```
#F8F8F7
```

## Surface

```
#FFFFFF
```

## Primary

Emerald Green

```
#10B981
```

Used for

- Primary buttons
- Positive values
- Active states

---

## Text

Primary

```
#111827
```

Secondary

```
#6B7280
```

Muted

```
#9CA3AF
```

---

## Semantic Colors

Success

Green

Warning

Amber

Danger

Red

Information

Blue

---

# Typography

Font

Inter

Fallback

```
system-ui
```

Hierarchy

Display

48px

Heading

32px

Section

24px

Body

16px

Caption

14px

Small

12px

Use generous line spacing.

Never overcrowd text.

---

# Spacing

Use an 8-point grid.

Examples

```
8
16
24
32
40
48
64
```

Avoid arbitrary spacing values.

---

# Border Radius

Small

8px

Inputs

12px

Cards

20px

Dialogs

24px

Floating buttons

9999px

---

# Shadows

Very subtle.

Cards should appear elevated without feeling heavy.

Avoid dark shadows.

---

# Icons

Use **Lucide React** exclusively.

Do not mix icon libraries.

Icons should communicate function rather than decoration.

---

# Buttons

## Primary

Filled

Emerald background

White text

---

## Secondary

Light background

Dark text

---

## Ghost

Transparent

Used inside toolbars

---

## Destructive

Red

Used only for destructive actions.

---

# Inputs

Large touch targets.

Rounded corners.

Clear labels.

Inline validation.

Never rely solely on placeholders.

---

# Navigation

Desktop

Left sidebar

Top search

User avatar

Mobile

Bottom navigation

Floating Add button

---

# Dashboard

The dashboard should answer

> "How am I doing?"

Layout

```
Balance

↓

Income / Expense Cards

↓

Charts

↓

Recent Transactions
```

Avoid overwhelming users with too many charts.

---

# Transactions

Use cards instead of tables whenever possible.

Each transaction card contains

- Category icon
- Title
- Amount
- Date
- Payment method
- Notes (optional)

Cards should feel lightweight.

---

# Forms

Expense creation should require minimal effort.

Fields

- Amount
- Category
- Payment Method
- Date
- Notes

Future versions may support

- Voice input
- AI parsing

---

# Search

Search should feel similar to Spotlight or Raycast.

Keyboard shortcut

```
Ctrl + K
```

Users can search

- Transactions
- Categories
- Settings
- Reports

---

# Analytics

Charts should be minimal.

Preferred

- Donut chart
- Line chart
- Bar chart

Avoid

- Pie charts with many slices
- 3D charts
- Gauges

---

# Empty States

Every empty state should answer

Why is this empty?

What should I do next?

Example

```
No transactions yet.

Add your first expense to start tracking your finances.
```

---

# Loading States

Prefer

Skeletons

Instead of

Spinners

Users should immediately see page structure.

---

# Animations

Duration

150–250ms

Purpose

- Reinforce interactions
- Guide attention
- Provide feedback

Never animate purely for decoration.

---

# Dark Mode

Dark mode is a first-class feature.

Do not invert colors automatically.

Design both themes intentionally.

---

# Future AI Features

Reserve UI space for

- AI Insights
- Monthly Summary
- Spending Trends
- Financial Health Score
- Voice Entry

These sections should appear as

```
Coming Soon
```

during MVP.

---

# Responsive Design

Mobile

Primary experience.

Tablet

Expanded cards.

Desktop

Sidebar + multi-column layout.

The UI should adapt naturally without changing interaction patterns.

---

# Component Guidelines

Cards

Large radius

Minimal borders

Soft shadows

Buttons

Consistent sizing

Inputs

Consistent heights

Dialogs

Centered on desktop

Bottom sheet on mobile

Charts

Minimal labels

Readable colors

---

# Interaction Principles

Every interaction should provide immediate feedback.

Examples

- Button press animation
- Success toast
- Loading skeleton
- Hover elevation
- Active navigation indicator

Avoid confirmation dialogs unless absolutely necessary.

Prefer Undo.

---

# Product Feel

If someone opens Ledg for the first time, they should think

> "This feels like an Apple-designed finance app."

The interface should feel trustworthy, elegant, and effortless—not like enterprise accounting software.

---

# Inspiration

Primary

- Apple Wallet
- Apple Health
- iOS Settings
- Linear
- Notion

Secondary

- Copilot Money
- Monarch Money
- Arc Browser
- Raycast

The goal is not to copy these products, but to learn from their simplicity, clarity, and attention to detail.