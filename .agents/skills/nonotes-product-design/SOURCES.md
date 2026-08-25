# NoNotes Design Ruleset — Sources & Traceability

This file records where the master ruleset (SKILL.md) derives from. It is honest about what was **inspected** (loaded skills, fetched pages, search results) versus what comes from established industry knowledge.

## Locally Loaded Skills (inspected in full during this pass)

| Skill | What was taken | SKILL.md sections |
|-------|----------------|-------------------|
| `ui-ux-pro-max` | 99 UX guidelines: touch targets ≥44px, animation 150–300ms, transform/opacity only, reduced motion, labels-not-placeholders, error near field, one primary action, bottom nav ≤5, color-not-only, focus rings, semantic tokens, skeleton over spinner, toast 3–5s, destructive emphasis | A, C, F, G, K, L, M, N, P, Q, R, S, U, V, W, X, Y, Z, AA, AC, AD, AL |
| `react-best-practices` (Vercel) | 57 performance rules: eliminate waterfalls, Promise.all, no barrel imports, dynamic imports, derive-during-render not effects, functional setState, startTransition, move effect logic to events, hydration discipline | AL, AM |
| `tailwind-css-patterns` | Mobile-first authoring, token usage, utility composition over @apply, content-path config, dark mode, focus styles, reduced-motion respect | F, H, I, X, AN |
| `code-reviewer` (loaded in prior passes; review methodology applied) | Confidence-based review filtering, false-positive awareness | FRONTEND_REVIEW_CHECKLIST.md |

## Web Research Performed (searches + authoritative pages surfaced)

### Accessibility
- **W3C WCAG 2.2** (w3.org/TR/WCAG22) — searched; key criteria applied: 2.4.11 focus-not-obscured, 1.4.3 contrast, 2.1.1 keyboard, 2.4.7 focus-visible, 2.3.3 animation-from-interactions, 3.3.1 error identification, 4.1.3 status messages
- **WAI-ARIA APG Dialog pattern** (w3.org/WAI/ARIA/apg/patterns/dialog-modal) — searched; applied: focus trap, initial focus, return focus, Escape dismissal
- **WAI-ARIA APG** (general) — keyboard support, roles/states
- **Arizona / Vispero focus-management guidance** — WCAG 2.2 focus-not-obscured by sticky headers

### UX / Heuristics
- **NN/g 10 Usability Heuristics** (nngroup.com/articles/ten-usability-heuristics) — searched; applied: visibility of system status, user control and freedom, consistency and standards, error prevention, recognition over recall, aesthetic and minimalist design
- **NN/g Animation Duration** (nngroup.com/articles/animation-duration) — searched; applied: 100–300ms UI animation windows
- **Material Design (M2/M3)** — type system roles (display/headline/title/body/label), motion duration/easing rules, bottom-nav ≤5, touch target 48dp, 8dp spacing, error feedback patterns
- **Apple HIG concepts** — one primary action, destructive emphasis, tap feedback 100ms, exit-faster-than-enter, motion conveys meaning, sheet dismissal confirm

### Typography
- **Material type system / USWDS typography / B13 line-length guide / Figma typography resource** — searched; applied: 45–75 char measure, type-scale discipline, weight-driven hierarchy, semantic type tokens

### Motion
- **Smashing Magazine — Designing with Reduced Motion** — searched; applied: prefers-reduced-motion as a first-class design input
- **Material 3 Motion** (m3.material.io/styles/motion) — duration/easing language
- **Web animation best-practices gists** — durations <300ms, ease-out entrance

### Responsive / Mobile
- **GitHub Primer mobile checklist** (primer.style) — searched; referenced
- **Mobile-first responsive guidance** (multiple 2025/2026 sources) — 44px touch targets, mobile-first, fluid grids, no horizontal scroll, safe areas
- **ui-ux-pro-max** — viewport meta, min-h-dvh, gesture conflicts, bottom-nav rules

### Frontend Engineering Rulesets
- **theDaviddias/Front-End-Checklist** (github.com/thedaviddias/front-end-checklist, 73k★) — the canonical frontend quality system (HTML, CSS, accessibility, performance, SEO, security). Identified as the primary external ruleset reference for this project. Rules adapted: semantic HTML, meta/head hygiene, image dimensions (CLS), accessible forms, performance budget awareness
- **theDaviddias/Front-End-Design-Checklist** — design-requirements framing
- **Front-End JavaScript/TS Code Review Checklist** (OleksandrKucherenko gist) — style/structure categories for review
- **React/Next.js best-practices searches** (freeCodeCamp, Telerik, Strapi, Robin Wieruch) — component composition, hooks extraction, folder structure; the Vercel skill supersedes these for concrete rules

### Component Ecosystem (evaluated, not installed)
| Source | Evaluated as | Verdict |
|--------|-------------|---------|
| **shadcn/ui** (ui.shadcn.com) | Primary foundation (already installed) | ADOPT — project owns the source; `npx shadcn@latest add` workflow |
| **Base UI** (@base-ui/react) | Headless primitives under shadcn | KEEP (installed) |
| **Aceternity UI** (ui.aceternity.com) | Landing/marketing components | REFERENCE ONLY — copy source (MIT), landing page only |
| **Magic UI** (magicui.design) | Motion primitives | REFERENCE ONLY — copy source; only if tw-animate-css is insufficient |
| **React Bits** (reactbits.dev) | Animated components (count-up etc.) | REFERENCE ONLY — copy source; dashboard stats only |
| **Origin UI** | App/form patterns | REFERENCE ONLY — not needed for current forms |
| **Radix UI / React Aria** | Accessible primitives | Already provided by Base UI layer; do not add a second headless layer |

### Competitive Product Benchmarks (patterns extracted, branding NOT copied)
- **Learning products** (Quizlet, Anki, RemNote, Knowt, Readwise, Obsidian): active-recall card as the stage; minimal chrome during study; due-count-driven dashboards; keyboard-first study flows; spaced-repetition states communicated through due counts rather than algorithm jargon
- **Premium UX products** (Linear, Vercel, Raycast, Stripe, Figma, Craft): calm neutral surfaces with one accent color; command-palette-first power UX (Cmd+K); restrained motion; precise spacing/type rhythm; destructive actions gated and separated; settings grouped in scoped sections
- These informed sections AG (Study UX), AI (Search UX), AJ (Settings UX), AH (Dashboard UX)

## Honest Limits

- W3C/WCAG, APG, NN/g, and Material docs were **located via search**; the concrete rules applied are drawn from the skill contents (ui-ux-pro-max encodes HIG/MD/WCAG) and standard, well-established interpretations of those sources. Full spec texts were not re-read line-by-line.
- No external component library was installed or its full source inspected beyond search results — the component evaluations are based on public documentation/search summaries.
- Competitive benchmarks are based on general knowledge of these products' well-documented UX patterns, not live product walkthroughs.

## Traceability Map (source → SKILL.md sections)

| Source | SKILL.md sections |
|--------|-------------------|
| ui-ux-pro-max skill | 1–8 (partial), 15, 56–73, 84–130, 145–178, 179–194, 195–214, 225–252, 327–338 |
| react-best-practices (Vercel) | 327–350 |
| tailwind-css-patterns | 67–73, 74–83, 351–358 |
| WCAG 2.2 + APG | 28, 61, 62, 81, 101–112, 121–130, 215–246 |
| NN/g heuristics + animation | 4, 5, 179–188 |
| Material Design (M2/M3) | 17, 18, 53, 67–73, 179–194, 247–252 |
| Apple HIG (via ui-ux-pro-max + knowledge) | 3, 58, 59, 102, 103, 169, 170, 173, 247–252 |
| Front-End-Checklist (daviddias) | 225–238, 327–338, 389–396 |
| Learning + premium product benchmarks | 283–310, 311–318, 319–326 |
| Component ecosystem evaluation | COMPONENT_DECISION_MATRIX.md |