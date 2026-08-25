# NoNotes Component Decision Matrix

Use this when a new UI requirement appears. The rule is: **search existing → search shadcn → copy from an approved external source → build custom only if nothing fits.**

Precedence order:

1. Existing NoNotes components (`components/ui/`, page `_components/`)
2. shadcn/ui registry (`npx shadcn@latest add <component>`)
3. Approved external sources (copy source code, do not install the library)
4. Custom build (justify it)

---

## Application Primitives

| Need | Use | Source | Notes |
|------|-----|--------|-------|
| Button | `components/ui/button` | Base UI + shadcn | Variants: default/outline/secondary/ghost/destructive/link |
| Dialog / Modal | `components/ui/dialog` | Base UI + shadcn | Focus trap, Escape, backdrop close built in |
| Sheet (mobile nav, side panels) | `components/ui/sheet` | Base UI + shadcn | For mobile navigation and side drawers |
| Card | `components/ui/card` | shadcn | CardHeader/CardTitle/CardDescription/CardAction/CardFooter |
| Input / Textarea | `components/ui/input` (+ label) | shadcn | Always pair with visible `<label>` |
| Select / Dropdown | `components/ui/select` or Base UI select | Base UI + shadcn | Never a hand-rolled `<div>` dropdown |
| Tabs | `components/ui/tabs` | Base UI + shadcn | For course-workspace section switching |
| Tooltip | `components/ui/tooltip` | Base UI + shadcn | Keyboard-reachable, hover + focus |
| Badge / Tag | `components/ui/badge` | shadcn | Type badges, status chips |
| Separator | `components/ui/separator` | shadcn | Section dividers |
| Skeleton | `components/ui/skeleton` | shadcn | Loading placeholders |
| Progress | `components/ui/progress` | shadcn | Study progress, import progress |
| Toast / Sonner | `components/ui/sonner` or shadcn toast | shadcn | Transient feedback; auto-dismiss 3-5s, no focus steal |
| Command palette | `components/search/command-palette.tsx` | Custom (exists) | Cmd+K global search |
| Dropdown menu (overflow actions) | `components/ui/dropdown-menu` | Base UI + shadcn | Overflow actions on cards |
| Alert / inline notice | `components/ui/alert` | shadcn | Error/warning/info banners |
| Form | No dedicated form lib | Custom + shadcn | Simple forms: local state + validation |

## Existing NoNotes Components (search first)

| Component | Location | For |
|-----------|----------|-----|
| `AppShell` | `components/layout/app-shell.tsx` | Workspace chrome — never rebuild |
| `DesktopSidebar` / `MobileNavigation` | `components/layout/` | All in-app navigation |
| `CommandPalette` | `components/search/command-palette.tsx` | Global search |
| `SectionPlaceholder` | `components/shared/section-placeholder.tsx` | Loading placeholder blocks |
| Course/Deck/Source workspace components | `app/(workspace)/courses/_components/` | Course workflows |
| Study components | `app/(workspace)/study/_components/` | Study picker + session |
| Analytics dashboard | `app/(workspace)/analytics/_components/` | Metrics rendering |
| Settings page | `app/(workspace)/settings/_components/` | Settings workflows |

## Visual / Marketing Components (landing page only)

| Need | Use | Source | License | Install vs Copy |
|------|-----|--------|---------|-----------------|
| Hero section layout | Existing landing page patterns | NoNotes landing page | — | Reuse |
| Animated backgrounds / aurora | Aceternity UI (aurora-background) | ui.aceternity.com | MIT | **Copy source** only; must respect reduced-motion |
| Gradient text / spotlight | Aceternity UI (spotlight) | ui.aceternity.com | MIT | **Copy source** only; landing page only |
| Bento grid | Aceternity / Magic UI bento | ui.aceternity.com / magicui.design | MIT | **Copy source**; use sparingly, not for app surfaces |
| Framer Motion animations | Magic UI (motion primitives) | magicui.design | MIT | **Copy source**; only if tw-animate-css can't express it |
| Number ticker / count-up | React Bits (animate-number) | reactbits.dev | MIT | **Copy source**; dashboard stat cards only |
| Marquee / shimmer | Magic UI | magicui.design | MIT | Generally avoid (infinite animation); landing only if used |

## Icons

| Need | Use |
|------|-----|
| All icons | Lucide (`lucide-react`) — one set, consistent stroke |

## Charts / Data Viz (analytics)

| Need | Use | Notes |
|------|-----|-------|
| Simple bars / lines | Hand-rolled SVG or `recharts` if it becomes necessary | Current app uses lightweight custom rendering; don't add a chart library without a concrete need |
| Rating distribution | Bar list / custom bar chart | Existing analytics pattern; keep |

## Explicitly REJECTED

| Library | Why |
|---------|-----|
| MUI / Material-UI | Contradicts Tailwind + shadcn foundation; bundle bloat |
| Chakra UI | Competing design system |
| Ant Design | Enterprise look; incompatible with Deep Space Ink |
| Radix UI direct | Already used underneath Base UI; don't mix two headless layers |
| Mantine | Competing design system; bundle bloat |
| Tailwind UI (paid) | Reference only; copy patterns into project components |
| Framer Motion as a dependency | Only if tw-animate-css cannot express the interaction; copy from Magic UI instead |

## Rules of Thumb

1. If it exists in `components/ui/`, use it — do not build a second version.
2. If shadcn has it, `npx shadcn@latest add <component>` (project owns the source).
3. External libraries (Aceternity, Magic UI, React Bits) are **pattern sources**: copy the component source, keep the license header, adapt tokens to Deep Space Ink.
4. Never install a whole library for one component.
5. Never mix two libraries that do the same job (one dialog system, one select, one icon set).
6. Every new or customized component ships with: Playwright coverage, accessibility check, mobile check, design-token compliance.