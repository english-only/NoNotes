# NoNotes Frontend QA Checklist

This checklist must be completed for every frontend feature before marking it done.

## Functional

- [ ] Click works (primary action executes)
- [ ] Keyboard works (Tab, Enter, Space, Escape, arrows)
- [ ] Navigation works (links lead to correct routes)
- [ ] Loading state visible for async > 300ms
- [ ] Error state shows meaningful message + retry
- [ ] Success state confirms completion
- [ ] Cancel/back returns to previous state without side effects
- [ ] Destructive actions show confirmation
- [ ] Reload preserves correct state (IndexedDB data intact)
- [ ] Double-submit prevented (disabled while saving)

## Visual

- [ ] Desktop (1280×800) — layout correct
- [ ] Tablet (768×1024) — layout correct
- [ ] Mobile (390×844) — layout correct, no horizontal overflow
- [ ] No clipped text or truncated labels
- [ ] No overlapping elements
- [ ] No broken text wrapping
- [ ] Consistent spacing (matches design system rhythm)
- [ ] Correct typography hierarchy
- [ ] Correct icon sizing and alignment
- [ ] No visual regressions vs existing pages

## Accessibility

- [ ] All form inputs have `<label>` with `htmlFor`
- [ ] Icon-only buttons have `aria-label`
- [ ] Focus is visible on all interactive elements (`focus-visible:ring-2`)
- [ ] Keyboard navigation order is logical
- [ ] Dialogs trap focus and close with Escape
- [ ] Screen-reader semantics correct (role, aria-live, aria-busy where appropriate)
- [ ] Touch targets ≥ 44px on mobile
- [ ] Reduced motion respected (`prefers-reduced-motion`)
- [ ] Color is never the only indicator (add icon/text)

## Interaction States

- [ ] Hover — distinct visual feedback
- [ ] Focus — visible focus ring
- [ ] Active/pressed — feedback (translate, color change)
- [ ] Disabled — reduced opacity + cursor change
- [ ] Loading — spinner/skeleton + disabled
- [ ] Error — message + recovery path
- [ ] Success — confirmation

## Regression

- [ ] All unit tests pass (`npm test`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Lint passes with 0 errors (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] Full Playwright suite passes (`npm run test:e2e`)
- [ ] No new console errors in Playwright
- [ ] All existing routes still work

## Mobile Specific

- [ ] No horizontal overflow
- [ ] Dialogs fit within viewport
- [ ] Forms are usable (labels visible, inputs full-width)
- [ ] Buttons reachable (not hidden behind fixed elements)
- [ ] Navigation sheet opens/closes correctly
- [ ] Touch targets adequately spaced (>8px between)