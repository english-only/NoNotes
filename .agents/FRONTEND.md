# NoNotes Frontend Instructions

When modifying NoNotes frontend code, follow these rules in order:

## 1. Load Required Skills

Before writing any frontend code, load:
- `nonotes-product-design` — the canonical design system (typography, color, spacing, motion, interaction states)
- `ui-ux-pro-max` — UX guidelines, accessibility rules, component patterns
- `react-best-practices` — React/Next.js performance patterns
- `tailwind-css-patterns` — Tailwind utility patterns
- `code-reviewer` — review all changes before completion
- `verification-before-completion` — verify before claiming done

## 2. Component Discovery Order

1. Existing NoNotes components (`components/ui/`, page `_components/`)
2. shadcn/ui official registry (`npx shadcn@latest add <name>`)
3. External references (Aceternity UI, Magic UI) — copy source, don't install

## 3. Design Tokens

- All colors via CSS variables (`var(--primary)`, `var(--border)`, etc.)
- All fonts via `font-heading` / `font-sans` / `font-mono`
- All spacing via Tailwind's 4px scale
- All border-radius via `rounded-lg` / `rounded-xl` / `rounded-2xl`
- No raw hex, no raw oklch, no arbitrary values unless the design system requires it

## 4. Quality Requirements

Every interaction MUST:
- Perform a real action
- Have an accessible name
- Show hover/focus/pressed states
- Have disabled/loading states for async ops
- Not imply functionality that doesn't exist

Run after changes:
```
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## 5. Prohibited

- Dead buttons / fake links
- Generic AI SaaS UI patterns
- Random gradients, glows, or decorative animation
- Emoji as icons (use Lucide)
- Mixing UI libraries
- console.log in production code
- eslint-disable comments to hide real issues