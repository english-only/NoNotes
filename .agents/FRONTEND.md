# NoNotes Frontend Instructions

When modifying NoNotes frontend code, follow these rules in order.

## 1. BEFORE Writing Code

### Load Required Skills

- `nonotes-product-design` — the 410-rule master quality ruleset (typography, color, spacing, motion, interaction states, component behavior, anti-patterns)
- `ui-ux-pro-max` — UX guidelines, accessibility rules, animation/typography/color/component patterns
- `react-best-practices` — Vercel's 57 React/Next.js performance rules (waterfalls, bundle, re-render, hydration)
- `tailwind-css-patterns` — Tailwind utility composition, responsive design, dark mode
- `code-reviewer` — review methodology before marking anything complete
- `verification-before-completion` — never claim "done" without running tests

### Inspect Existing

1. Check `components/ui/` for existing primitives
2. Check the relevant page `_components/` directory for reusable patterns
3. Check `nonotes-product-design/COMPONENT_DECISION_MATRIX.md` for the authorized component source for your need
4. Check the relevant section in `nonotes-product-design/SKILL.md` (A–AT) for what's required

## 2. Component Discovery Order

1. **Existing NoNotes components** — `components/ui/`, page `_components/`
2. **shadcn/ui official** — `npx shadcn@latest add <component>` (source-owned, customizable)
3. **Approved external sources** — Aceternity UI / Magic UI / React Bits (copy source code only; never install as a dependency; retain license header; adapt to Deep Space Ink tokens)
4. **Custom build** — only if none of the above fit

See `COMPONENT_DECISION_MATRIX.md` for the full "when I need X → use Y" table.

## 3. Design Tokens (DO NOT DEVIATE)

- **Colors:** CSS variables only (`var(--primary)`, `var(--border)`, `var(--muted-foreground)`)
- **Fonts:** `font-heading` / `font-sans` / `font-mono`
- **Spacing:** Tailwind 4px scale (gap-1/2/3/4/6/8)
- **Radius:** `rounded-lg` (buttons), `rounded-xl` (cards/dialogs), `rounded-2xl` (hero/containers), `rounded-full` (progress)
- **Motion:** hover `transition-colors`, press `active:translate-y-px`, focus `ring-2 ring-ring`, dialog enter `animate-in fade-in-0 zoom-in-95` (200ms), exit `animate-out fade-out-0 zoom-out-95` (150ms)
- **Layout:** `mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12` (content routes); `max-w-3xl` (reading routes)

**No raw hex, no raw oklch, no arbitrary values where a design token exists.**

## 4. Quality Requirements (Open FRONTEND_REVIEW_CHECKLIST.md for full list)

Every interaction MUST:
- Perform a real action (no dead buttons)
- Have an accessible name (visible label or `aria-label`)
- Show hover/focus/pressed/disabled/loading states
- Not visually imply functionality that doesn't exist

Every page MUST:
- Have no horizontal overflow at 390×844
- Have keyboard-reachable controls
- Have visible focus on every interactive element
- Respect reduced motion
- Pass all existing Playwright tests

## 5. AFTER Writing Code

Run the full verification suite:

```bash
npm test           # 268 unit/integration tests
npm run typecheck  # must be clean
npm run lint       # 0 errors, 0 warnings
npm run build      # must compile
npm run test:e2e   # all Playwright scenarios, 0 retries
```

Then verify:
- Browser console is clean (no unexpected errors)
- Every new interaction has Playwright coverage
- Mobile layout at 390×844 (no horizontal overflow)
- Keyboard flows work (Tab, Space, Enter, Escape, shortcuts)
- Reduced motion: animations respond to the system setting
- Accessibility: focus visible, labels present, screen-reader semantics correct
- No regressions in existing routes

Go through the FRONTEND_REVIEW_CHECKLIST.md gate before marking anything complete.

## 6. Prohibited (EXPLICIT BAN)

- Dead buttons / fake links (links to `#`, `onClick` on divs)
- Generic AI-SaaS UI patterns (violet-on-white gradient hero, random glassmorphism)
- Random gradients, glows, or decorative animation in the app surface
- Emoji as icons (use Lucide)
- Multiple competing UI libraries in one component tree
- Removing focus rings to "clean up" the design
- Horizontal scroll on mobile
- `console.log` in production code
- `eslint-disable` to hide real issues
- Fake metrics or fabricated product claims
- Tooltips or alerts with generic boilerplate copy