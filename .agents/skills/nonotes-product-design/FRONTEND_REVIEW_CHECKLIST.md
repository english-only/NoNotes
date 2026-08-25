# NoNotes Frontend Review Checklist

This checklist must be completed during code review for every frontend change. Sections map to the design-system categories in SKILL.md.

## Pre-Review: Automated Verification

Run before requesting review:

- [ ] `npm test` — all unit/integration tests pass
- [ ] `npm run typecheck` — no type errors
- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm run build` — compiles successfully
- [ ] `npm run test:e2e` — full Playwright suite passes, 0 retries

## Functional

- [ ] Every button performs a real action (no dead buttons)
- [ ] Every link navigates to a real destination (no `href="#"`)
- [ ] Keyboard: Tab order logical, Enter/Space/Escape work, no keyboard traps
- [ ] Async actions show loading state (button disabled with "…" suffix)
- [ ] Async actions prevent double-submit (disabled while in-flight)
- [ ] Error states show a meaningful message + recovery path (retry/edit)
- [ ] Success states confirm completion + offer next action
- [ ] Cancel/back returns to prior state without side effects
- [ ] Destructive actions confirm before executing
- [ ] Reload preserves correct state (IndexedDB data intact)
- [ ] No stale UI after data mutations (counts, lists, due dates update)

## Visual

- [ ] Desktop (1280×800): layout correct, no clipped text, no overlap
- [ ] Tablet (768×1024): layout correct
- [ ] Mobile (390×844): layout correct, no horizontal overflow, dialogs fit viewport
- [ ] Typography hierarchy correct (h1→h3 consistent, no skipped levels)
- [ ] Spacing consistent with design-system rhythm (4px scale)
- [ ] Radius consistent (buttons rounded-lg, cards rounded-xl, dialogs rounded-xl)
- [ ] Color tokens used (no raw hex/oklch in components)
- [ ] Icons from Lucide, consistent sizing, no emoji as icons
- [ ] No visual regressions vs existing pages

## Navigation

- [ ] Current location highlighted in sidebar/mobile nav
- [ ] Nav label matches page h1
- [ ] Back behavior predictable (returns to prior screen with state)
- [ ] Deep pages keep navigation reachable (sidebar/header present)
- [ ] Mobile Sheet opens/closes, focus managed
- [ ] No broken breadcrumb/header path

## Accessibility

- [ ] Semantic HTML: real `<button>`, `<a>`, `<label>`, `<h1>`-`<h3>`
- [ ] Form inputs have `<label htmlFor>`
- [ ] Icon-only buttons have `aria-label`
- [ ] Focus visible on all interactive elements (`focus-visible:ring-2`)
- [ ] Keyboard navigation logical and complete
- [ ] Dialogs: focus trapped, Escape/backdrop close, focus returns to trigger
- [ ] Status changes use `aria-live`/`role="alert"` where screen readers must hear them
- [ ] Touch targets ≥ 44px (≥ 48px on mobile primary actions)
- [ ] Color is never the sole indicator (paired with icon/text)
- [ ] Reduced motion respected (prefers-reduced-motion)
- [ ] Screen-reader reading order matches visual order
- [ ] `aria-current="page"` on active nav items

## Interaction States

- [ ] Default: element is identifiable and has correct affordance
- [ ] Hover: distinct visual change (color, underline)
- [ ] Focus-visible: ring-2 ring-ring, never outline-none-only
- [ ] Active/pressed: feedback (translate-y-px, color shift)
- [ ] Disabled: opacity-50 + pointer-events-none
- [ ] Loading: disabled + spinner/skeleton + "…" text
- [ ] Error: message near problem + recovery path
- [ ] Success: confirmation visible (checkmark/text/state change)

## Buttons

- [ ] One primary button per action group (bg-primary, rest outline/ghost/secondary)
- [ ] Destructive buttons are red + confirm before executing
- [ ] Labels are verbs ("Create course", "Export data")
- [ ] Icon buttons have aria-label
- [ ] Button state transitions smooth and immediate

## Forms

- [ ] Labels visible, not placeholder-only
- [ ] Required fields marked
- [ ] Validation on blur (not keystroke)
- [ ] Error under the offending field, not top-of-page only
- [ ] Error states cause + fix
- [ ] After submit error, first invalid field focused
- [ ] Submit shows loading → success/error
- [ ] Unsaved form warns before dismissal

## Dialogs

- [ ] DialogTitle + DialogDescription present
- [ ] Escape closes, backdrop click closes, Close button exists
- [ ] Focus trapped in dialog, returns to trigger on close
- [ ] Content scrollable; fits viewport (max-w-[calc(100%-2rem)])
- [ ] Actions in DialogFooter: Cancel + Submit
- [ ] Submit disables during save
- [ ] Destructive dialogs explicit ("Delete course and its 12 cards?")

## Empty / Loading / Error States

- [ ] Empty state: icon + message + action (never blank or bare "no data")
- [ ] Loading state: skeleton (mirrors layout) or inline spinner (no empty-flash)
- [ ] Error state: human message + recovery path (never frozen spinner or blank)

## Animation / Motion

- [ ] Duration 150–300ms (complex ≤400ms)
- [ ] Transform/opacity only (no width/height/top/left animations)
- [ ] 1–2 animated elements max per view
- [ ] No infinite animation except spinner
- [ ] Exit faster than enter (~60-70%)
- [ ] Reduced motion: all animations disabled/static fallback

## Mobile

- [ ] No horizontal overflow
- [ ] Dialogs fit viewport
- [ ] Forms usable (full-width inputs, visible labels)
- [ ] Buttons reachable (not behind fixed elements, keyboard)
- [ ] Touch targets ≥ 44px with ≥ 8px spacing
- [ ] Navigation Sheet works
- [ ] No hover-only interactions

## AI UX

- [ ] Missing API key → clear setup path (link to Settings)
- [ ] Generation states explicit (configuring → generating → reviewing → accepted)
- [ ] Generated content reviewed before persistence
- [ ] Provider failures classified (quota/rate-limit/network/malformed)
- [ ] No API keys in UI, logs, errors, or DOM
- [ ] AI output schema-validated before render
- [ ] Long-running AI doesn't block UI

## Study UX

- [ ] Card content center stage (prompt front, answer hidden)
- [ ] Reveal one obvious action (Space/button)
- [ ] Ratings 1/2/3/4 (Again/Hard/Good/Easy) always visible as labeled buttons
- [ ] Progress visible, never regresses
- [ ] Completion state shows summary + "Study again"
- [ ] Double-key/click prevention during rating
- [ ] Keyboard shortcuts documented

## Performance

- [ ] No unnecessary re-renders (memoized subtrees, derived state)
- [ ] No effects where derived state works
- [ ] Dexie reads scoped/sorted, not full-table scans per action
- [ ] Search index incremental, not full-rebuilt per keystroke
- [ ] No CLS (skeletons match layout, images dimensioned)
- [ ] Client/server boundary respected

## Security

- [ ] API keys never hardcoded, exported, logged, or in errors
- [ ] Import validates schema/version/integrity before write
- [ ] No `dangerouslySetInnerHTML` on untrusted content
- [ ] Destructive actions confirm
- [ ] Errors sanitized (no stack traces/raw responses to user)

## Regression

- [ ] All existing unit tests pass
- [ ] Typecheck clean
- [ ] Lint 0 errors / 0 warnings
- [ ] Build succeeds
- [ ] Full Playwright suite passes (0 retries, 0 flaky)
- [ ] Browser console clean (no unexpected errors)
- [ ] All routes still navigate correctly
- [ ] Mobile + desktop layout unchanged where not intended
- [ ] Existing keyboard shortcuts still functional

## Release Gate (Mark COMPLETE only when ALL above are ✅)

- [ ] No dead buttons or fake links
- [ ] No TODO/FIXME/HACK/XXX in production code
- [ ] No console.log in production code
- [ ] No secrets in repo, tests, or build output
- [ ] README/ROADMAP match reality
- [ ] Working tree clean or intentionally staged