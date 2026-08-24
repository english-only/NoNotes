---
name: nonotes-product-design
description: Canonical NoNotes product design system. Use before writing ANY frontend code for NoNotes — defines typography, color, spacing, radius, motion, interaction states, component behavior, and quality gates. Prevents generic AI UI patterns from regressing into the application.
license: MIT
---

# NoNotes Product Design System

## When to Apply

This skill MUST be loaded before:

- Creating any new page, route, or component
- Modifying existing UI
- Adding visual features
- Changing layouts, spacing, or typography
- Adding animation or motion
- Reviewing frontend PRs
- Fixing UX or accessibility issues

## Brand Personality

NoNotes must feel: **premium, intelligent, calm, academic, technical, focused, modern, trustworthy.**

NoNotes must NOT feel like: a school project, a generic SaaS template, a random AI dashboard, a component-library demo, an over-animated crypto site, or an AI-generated landing-page cliché.

The design should **disappear into the experience** — the user should think about their study material, not the UI.

---

## Typography

### Font Family

| Role | Font | CSS Variable |
|------|------|-------------|
| Display / Headings | Geist Sans | `--font-geist-sans` / `font-heading` |
| Body | Geist Sans | `--font-geist-sans` / `font-sans` |
| Code / Monospace | Geist Mono | `--font-geist-mono` / `font-mono` |

### Hierarchy

| Level | Class | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|-------|------|--------|-------------|----------------|-------|
| Page Title | `text-3xl sm:text-4xl font-semibold` | 30px / 36px | 600 | tracking-[-0.03em] | Every route's h1 |
| Section Title | `font-heading text-xl font-semibold` | 20px | 600 | tracking-tight | Section headings inside pages |
| Card Title | `font-heading text-base font-medium` | 16px | 500 | leading-snug | Card titles (via CardTitle) |
| Body | `text-base leading-7` | 16px | 400 | 1.75 | Page descriptions |
| Body Small | `text-sm leading-6` | 14px | 400 | 1.5 | Card descriptions, helper text |
| Label | `text-sm font-medium` | 14px | 500 | — | Form labels, button labels |
| Metadata | `text-xs` | 12px | 400 | — | Dates, counts, secondary info |
| Overline | `text-xs font-medium tracking-[0.18em] uppercase` | 12px | 500 | 0.18em | Section overlines (e.g., "Today's workspace") |
| Section Label | `text-xs font-medium tracking-[0.16em] uppercase` | 12px | 500 | 0.16em | Sub-section labels |
| Stat Value | `font-heading text-3xl font-semibold tracking-tight` | 30px | 600 | -0.02em | Dashboard stat cards |

### Rules

- Always use `font-heading` for headings (it maps to Geist Sans)
- Always use semantic heading elements (h1, h2, h3) with appropriate classes
- Body text must use `text-muted-foreground` for secondary content
- Never use raw font-size values — use Tailwind's text scale
- Max paragraph width: `max-w-xl` (36rem / ~65 characters) for readability
- Use `tabular-nums` for all numbers that update (counts, percentages, timestamps)
- Use `whitespace-pre-wrap` for user-authored content (flashcard prompt/answer)

---

## Color — Deep Space Ink

The application uses a **dark-first** color system with semantic CSS variables.

### Core Palette (Dark Mode — default)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(0.115 0.025 260)` | Page background |
| `--foreground` | `oklch(0.94 0.012 260)` | Primary text |
| `--card` | `oklch(0.145 0.028 260)` | Card/elevated surfaces |
| `--primary` | `oklch(0.7 0.16 287)` | Primary actions, brand accent (violet) |
| `--primary-foreground` | `oklch(0.14 0.025 260)` | Text on primary backgrounds |
| `--secondary` | `oklch(0.2 0.03 260)` | Secondary surfaces |
| `--muted` | `oklch(0.19 0.025 260)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.67 0.025 260)` | Secondary text |
| `--accent` | `oklch(0.24 0.06 285)` | Accent surfaces (violet-leaning) |
| `--accent-foreground` | `oklch(0.87 0.08 285)` | Text on accent surfaces |
| `--destructive` | `oklch(0.68 0.19 25)` | Destructive actions (red) |
| `--border` | `oklch(1 0 0 / 10%)` | Borders, separators |
| `--ring` | `oklch(0.7 0.16 287)` | Focus rings |

### Semantic Color Tokens

| Token | Color | Usage |
|-------|-------|-------|
| `text-emerald-300` | Emerald | Success, completion, "All caught up" |
| `text-amber-300` | Amber | Warnings, misconceptions |
| `text-violet-300` | Violet | Study time, secondary metrics |
| `text-cyan-300` | Cyan | Active courses, sources |
| `text-destructive` / `text-red-400` | Red | Errors, Again ratings |

### Rules

- NEVER use raw hex values or arbitrary oklch() in components — use CSS variables
- Always use `text-muted-foreground` for secondary text
- Always use `text-foreground` (or no class — it's the default) for primary text
- Success states use `text-emerald-300` or `text-emerald-400`
- Error states use `text-destructive`
- Warning states use `text-amber-300`
- The `app-backdrop` utility class provides the subtle violet/cyan gradient background

---

## Spacing

### Page Layout

```
mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12
```

Every route's main content container must use this exact class string (or its equivalent). There are two variants:

| Route Type | Max Width |
|-----------|-----------|
| Content-heavy (dashboard, courses, study, analytics, course workspace) | `max-w-7xl` |
| Reading-focused (Feynman, settings) | `max-w-3xl` |

### Section Spacing

Sections within a page use `flex flex-col gap-8`.

### Card Grid

Card grids use `grid gap-3 sm:grid-cols-2 xl:grid-cols-3` (or 4 columns for analytics/overview).

### Rhythm

The spacing rhythm is **8px-based** (Tailwind's default `--spacing` units: 1 = 4px).

| Level | Class | Use |
|-------|-------|-----|
| xs | `gap-1` (4px) | Tight icon+text pairings |
| sm | `gap-2` (8px) | Button groups, form row gaps |
| md | `gap-3` (12px) | Card grids |
| lg | `gap-4` (16px) | Form sections, content blocks |
| xl | `gap-6` (24px) | Section internal spacing |
| 2xl | `gap-8` (32px) | Between sections |

---

## Radius

Radius uses the CSS variable `--radius: 0.75rem` with derived tokens.

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | `var(--radius)` = 0.75rem | Sidebar nav links, buttons |
| `rounded-xl` | `calc(var(--radius) * 1.4)` ≈ 1.05rem | Cards, dialogs, containers |
| `rounded-2xl` | `calc(var(--radius) * 1.8)` ≈ 1.35rem | Empty-state icon containers, CTA sections |

Rules:
- Buttons use `rounded-lg`
- Cards use `rounded-xl`
- Modals use `rounded-xl`
- Never mix `rounded-none` with `rounded-3xl` on the same page
- Progress bars use `rounded-full`

---

## Motion

NoNotes uses Tailwind's `tw-animate-css` for transitions. There is no Framer Motion dependency.

### Hover

```css
transition-colors hover:bg-muted hover:text-foreground
```

Buttons, links, and interactive cards use `transition-colors` with a hover state change.

### Press

```css
active:not-aria-[haspopup]:translate-y-px
```

Buttons have a subtle 1px downward translation on press (built into the Base UI Button variant).

### Focus

```css
focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
```

All interactive elements get a visible focus ring.

### Dialog / Modal

Dialogs use built-in `tw-animate-css` animations:
- Enter: `animate-in fade-in-0 zoom-in-95` (200ms)
- Exit: `animate-out fade-out-0 zoom-out-95` (150ms)
- Backdrop: `animate-in fade-in-0` / `animate-out fade-out-0` (100ms)

### Loading

- Skeleton screens: `animate-pulse rounded bg-muted` for placeholder blocks
- Spinner: `animate-spin` on a Loader2 or RefreshCw icon
- Button loading: Disabled state + "…" suffix (e.g., "Saving…", "Exporting…")

### Animation Rules

- Animation duration: 150–300ms
- No animation purely for decoration
- No infinite repeating animations (except spinner)
- No bounce, no excessive scaling, no parallax
- Always respect `prefers-reduced-motion` (already handled in `globals.css`)
- Use CSS transitions — do not add Framer Motion / Motion unless there's a specific complex interaction requirement
- Background glow (`app-backdrop`) is intentionally subtle and static

---

## Component Behavior

### Buttons (via Base UI `@base-ui/react/button`)

| State | Behavior |
|-------|----------|
| Default | `bg-primary text-primary-foreground` |
| Hover | `hover:bg-primary/80` |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` |
| Active | `active:translate-y-px` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Loading | Disabled state + "…" suffix text |

Available variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`

Available sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

### Cards (via shadcn)

```
Card
  CardHeader
    CardTitle        ← clickable link to entity
    CardDescription  ← secondary info (course name, type badge)
    CardAction       ← edit/delete/study buttons (top-right)
  CardFooter         ← date, due count, delete confirmation
```

### Dialogs (via shadcn / Base UI)

```
Dialog
  DialogContent
    DialogHeader
      DialogTitle
      DialogDescription
    <form>            ← form content
    DialogFooter      ← Cancel + Submit buttons
```

Rules:
- Every dialog must have a title and description
- Escape closes the dialog
- Clicking outside closes the dialog
- Submit button disables during save
- Success state replaces footer (e.g., "Course created!" + action buttons)

### Navigation

- Desktop: Fixed left sidebar with icon+label nav items
- Mobile: Sheet-based hamburger menu from the left
- Active page: `bg-sidebar-accent text-sidebar-accent-foreground`
- Inactive page: `text-sidebar-foreground/65 hover:bg-sidebar-accent/60`
- Header shows current page title (not hardcoded)
- All nav items have both icon and label

### Command Palette / Search

- Open: Cmd+K / Ctrl+K
- Close: Escape, backdrop click, or result selection
- Input auto-focused on open
- Arrow keys navigate results
- Enter selects
- Results show icon, title, type badge, excerpt, parent context
- Footer shows result count + keyboard hints

---

## Interaction Quality Gates

Every interactive element MUST:

1. **Perform a real action** — no dead buttons, no fake links
2. **Have an accessible name** — `aria-label` for icon-only, visible label otherwise
3. **Have visible interactive affordance** — color change, underline, cursor change
4. **Have hover/focus/pressed states** — distinct visual feedback for each
5. **Have disabled/loading behavior** for async operations
6. **Not visually imply functionality that doesn't exist**

Forbidden patterns:
- `<button>` elements that don't do anything
- Links with `href="#"` that aren't anchors
- `onClick` on non-interactive elements (div, span, p)
- Decorative icons that look like buttons
- Duplicate submit buttons (one in form, one outside)
- Icon-only buttons without `aria-label`

---

## Responsive Design

### Breakpoints

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile first |
| `sm:` | 640px | Large phones / small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Small desktops |
| `xl:` | 1280px | Large desktops |

### Minimum Test Sizes

- 390×844 (iPhone 14)
- 768×1024 (iPad)
- 1280×800 (Laptop)
- 1440×900 (Desktop)

### Rules

- No horizontal overflow at any breakpoint
- Dialogs must fit within viewport: `max-w-[calc(100%-2rem)]`
- Card grids collapse from 3-col → 2-col → 1-col
- Mobile nav uses Sheet from left
- Desktop nav uses fixed sidebar
- Touch targets ≥ 44px (size-11 / min-h-11 on mobile nav items)

---

## Component Development Workflow

When a new UI requirement appears:

1. **Search existing NoNotes components** — check `components/ui/` and page `_components/` directories
2. **Search shadcn/ui** — use `npx shadcn@latest add <component>` for official components
3. **Consult approved external sources** — Aceternity UI, Magic UI, React Bits (for reference only; copy/paste source code, don't install entire libraries)
4. **Prefer reuse** — adapt existing components before creating new ones
5. **Build custom only when existing sources don't fit**
6. **Add Playwright browser coverage** for every new interaction
7. **Check accessibility** — labels, focus, keyboard, contrast
8. **Check responsive** — test at 390px, 768px, 1280px
9. **Run full test suite** before marking complete

---

## Frontend Acceptance Gates

A frontend feature CANNOT be marked complete unless:

- Every button performs a real action
- Every link navigates somewhere real
- Loading state exists for async operations > 300ms
- Async actions prevent double-submit (disabled while saving)
- Mobile layout has no horizontal overflow
- Focus is visible on all interactive elements
- Modals close with Escape and backdrop click
- Typography hierarchy is consistent
- Animation respects reduced-motion
- No console errors
- Playwright tests cover the feature
- The full existing test suite passes