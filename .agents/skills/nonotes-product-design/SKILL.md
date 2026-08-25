---
name: nonotes-product-design
description: Canonical NoNotes product design system and master frontend quality ruleset. Load BEFORE writing any NoNotes frontend code. Defines typography, color, spacing, radius, motion, interaction states, component behavior, accessibility, responsive rules, AI-UX, study-UX, performance, and 200+ concrete quality gates. Prevents generic AI UI patterns from regressing into the application.
license: MIT
---

# NoNotes Product Design System — Master Ruleset

## When to Apply

This skill MUST be loaded before:

- Creating any new page, route, or component
- Modifying existing UI
- Adding visual features
- Changing layouts, spacing, or typography
- Adding animation or motion
- Reviewing frontend PRs
- Fixing UX or accessibility issues

Companion files in this directory:

- `FRONTEND_REVIEW_CHECKLIST.md` — the code-review gate every frontend change must pass
- `COMPONENT_DECISION_MATRIX.md` — "when I need X, what should I use?" (prevents library creep)
- `SOURCES.md` — traceability: where each ruleset derives from

---

## A. Product Design

1. **Personality first.** NoNotes must feel premium, intelligent, calm, academic, technical, focused, modern, and trustworthy — never like a school project, generic SaaS template, random AI dashboard, component-library demo, over-animated crypto site, or AI-generated landing-page cliché.
2. **Design disappears.** The user should think about their study material, not the UI. If a user notices the design, it is probably wrong.
3. **One primary action per screen.** Every route has exactly one dominant CTA; secondary actions are visually subordinate (derived from Apple HIG "one primary action").
4. **Every screen answers "what do I do here?"** within 2 seconds — the page title, primary action, and current state must be obvious.
5. **Design for the core loop.** Ingest → Process → Generate → Study → Schedule → Evaluate → Review is the product. Every UI decision must serve at least one step of this loop.
6. **Nothing fake.** No fabricated metrics, no dead buttons, no decorative elements that imply function (honesty gate).
7. **Calm over clever.** Restraint is a feature: limit gradients, glows, and decorative flourishes to the landing page only.
8. **Consistency is trust.** The same action looks the same everywhere; the same level of hierarchy uses the same typography/spacing everywhere.

## B. Information Architecture

9. **Three clicks or fewer.** Any entity (course, deck, card, source) is reachable from its parent in ≤3 clicks.
10. **URLs are the structure.** `/courses/[courseId]`, `/courses/[courseId]/decks/[deckId]`, `/study/[deckId]` — the URL hierarchy must mirror the data hierarchy, so the back button always makes sense.
11. **Breadcrumb-able.** Any page 2+ levels deep shows an obvious parent path (header breadcrumb like "Study workspace / Courses / Biology 101").
12. **One home.** `/dashboard` is the hub after login; the landing page is the only pre-login surface.
13. **Deck ownership is explicit.** Cards belong to decks, decks belong to courses (optionally topics). UI must never imply a card can float outside its deck.
14. **Search is the escape hatch.** When hierarchy gets deep, global search (Cmd+K) rescues users — it must always be reachable.

## C. Navigation

15. **Persistent, predictable placement.** Navigation never moves between pages (Material/navigation-consistency rule).
16. **Current location always highlighted.** Active nav item uses `bg-sidebar-accent text-sidebar-accent-foreground` plus (on desktop) icon/label weight change.
17. **Icon + label for every nav item.** Icon-only navigation harms discoverability (Material). Exception: compact secondary controls with `aria-label`.
18. **Max 5 items in mobile bottom/sheet navigation** (Material bottom-nav rule). NoNotes: Dashboard, Courses, Study, Settings — 4 core destinations.
19. **Deep pages keep navigation reachable.** Study session and deck detail never hide the nav; the user can always escape.
20. **Back behavior is predictable.** Back returns to the previous screen with scroll/state preserved; never silently resets to dashboard.
21. **Destructive nav items are separated** from normal items (e.g., "Danger zone" in Settings is visually and spatially distinct).
22. **Do not mix nav paradigms at the same level.** Don't combine a sidebar + top tabs + bottom bar for the same hierarchy level.
23. **Modals are not navigation.** Primary flows (create course, study) are never trapped inside modals; modals are for quick, secondary actions.
24. **Navigation labels match page titles.** What the nav says and what the page h1 says must match exactly.

## D. Application Shell

25. **Shell is constant.** The sidebar + header chrome is identical across all workspace routes; only `main` content changes.
26. **Header communicates location.** The header shows "Study workspace / {current page}" using the resolved route label — never a hardcoded string that can go stale.
27. **Header holds global actions.** Command palette trigger (Cmd+K), notifications, user affordance — in the same order everywhere.
28. **Fixed elements reserve space.** Fixed sidebar/header/bottom nav never overlap scrollable content (WCAG 2.2 focus-not-obscured).
29. **Mobile: hamburger → Sheet.** Mobile navigation is a left Sheet; the sheet manages focus, Escape, and backdrop close.
30. **Page content container is consistent:** `mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12` (content-heavy routes) or `max-w-3xl` (reading routes like Feynman/Settings).
31. **No dead chrome.** Bell/user icons without functionality are forbidden — either implement or remove (honesty gate).

## E. Landing Pages

32. **Real product story, not template copy.** Headline states the outcome ("Study with intention, not repetition") rather than "AI-powered platform".
33. **Navbar: logo + primary CTA.** Sticky, backdrop-blurred, contrast-safe; collapses to essential links on mobile.
34. **Hero must be scannable in 5s:** badge, headline, one supporting paragraph, primary + secondary CTA.
35. **Visual proof over claims.** Use a real product mockup (actual app screenshot) — never fake features.
36. **Core loop is explained visually.** Ingest → Generate → Recall → Retain as a 4-step grid with icons, not a paragraph.
37. **Feature sections answer "why should I care".** Each feature card: icon, title, one-sentence benefit grounded in a real NoNotes capability.
38. **One clear CTA per section**; the final CTA section repeats the primary action.
39. **Footer is complete:** logo/tagline, navigation links, product identity — never "© template year".
40. **Mobile landing is designed, not stacked.** Hero copy, CTAs, and the loop grid reflow deliberately at 390px.
41. **Restraint rule:** the landing page is the ONLY place gradients/glows may appear; the app itself stays flat and calm.

## F. Typography

42. **Two fonts max.** Geist Sans (display + body) and Geist Mono (code/data). No third font without a design-system change.
43. **Headings use `font-heading`; body uses `font-sans`.** Never reverse them.
44. **Semantic heading elements** (h1→h3) with the design-system classes; never a div styled as a heading.
45. **Page h1:** `text-3xl sm:text-4xl font-semibold tracking-[-0.03em]` — exactly one per route.
46. **Section titles:** `font-heading text-xl font-semibold`; card titles: `font-heading text-base font-medium`.
47. **Body:** `text-base leading-7`; secondary body: `text-sm leading-6 text-muted-foreground`.
48. **Labels:** `text-sm font-medium`; metadata: `text-xs`; overlines: `text-xs font-medium uppercase tracking-[0.16em]`.
49. **Use Tailwind text scale only.** No raw font-size values anywhere.
50. **Readable measure.** Paragraphs capped at `max-w-xl` (~65 chars); never full-width body text (B13/USWDS line-length rule).
51. **`tabular-nums` for all changing numbers** (counts, due totals, percentages, timers) to prevent layout shift.
52. **`whitespace-pre-wrap` for user-authored content** (card prompts/answers, explanations) so line breaks survive.
53. **Weight carries hierarchy**, not just size: semibold headings, medium labels, regular body (Material type roles).
54. **Line-height discipline:** 1.1–1.3 display, 1.5 body-small, 1.6–1.75 long-form body (NN/g/typography guidelines).
55. **No ALL-CAPS paragraphs.** Uppercase is reserved for short overlines/section labels; never for sentences or body copy.

## G. Color

56. **Tokens only.** Colors come exclusively from CSS variables (`--primary`, `--muted-foreground`, `--border`…). Never raw hex/oklch in components (Material semantic-token rule).
57. **Deep Space Ink is the baseline.** Dark-first: `--background oklch(0.115 0.025 260)`, violet `--primary`, red `--destructive`, emerald/amber/violet/cyan semantic accents.
58. **Primary is for the primary action.** Reserve `bg-primary` for the one dominant CTA per screen; everything else uses outline/ghost/secondary.
59. **Destructive is always red** (`--destructive`) and spatially separated from primary actions (HIG destructive-emphasis rule).
60. **Success/warning/info use the semantic tokens** (emerald-300 / amber-300 / violet-300 / cyan-300) — never ad-hoc colors.
61. **Contrast ≥ 4.5:1 for body text** and ≥ 3:1 for large text and UI glyphs against their background (WCAG 1.4.3/1.4.11).
62. **Never communicate with color alone** — pair color with an icon, label, or text (WCAG 1.4.1).
63. **Muted text stays readable:** `--muted-foreground` must hold ≥ 4.5:1 on `--background` and on `--card` (dark theme verified separately).
64. **Borders are subtle** (`--border`, ~10% white in dark); visible but never competing with content.
65. **`app-backdrop` is the only ambient gradient** and it is static and subtle — no animated glows.
66. **Focus ring always `--ring`** (violet) at `ring-2`, never removed.

## H. Spacing

67. **8px rhythm.** All spacing comes from Tailwind's 4px scale (gap-1…gap-8); no arbitrary px values.
68. **Vertical rhythm tiers:** 4/8/16/24/32px between related → separate → sections. Similar hierarchy levels share the same spacing everywhere.
69. **Card grids:** `grid gap-3 sm:grid-cols-2 xl:grid-cols-3` (analytics may use 4 columns).
70. **Sections within a page:** `flex flex-col gap-8`.
71. **Whitespace is intentional grouping.** Related items touch (gap-2/3); unrelated sections separate (gap-8) (Apple whitespace-balance rule).
72. **Density matches the surface.** Study/reading surfaces breathe; data surfaces (analytics, lists) may be denser — never mix densities on one page.
73. **Touch spacing:** ≥8px between distinct touch targets (Material 8dp rule).

## I. Layout

74. **Mobile-first authoring.** Write base styles for mobile, add `sm:`/`lg:`/`xl:` for larger screens (Tailwind responsive rule).
75. **Fluid grids, never fixed widths.** `grid-cols-1` → `sm:grid-cols-2` → `xl:grid-cols-3`; no `w-[600px]` containers.
76. **No horizontal overflow at any breakpoint** — test 390/768/1280/1440.
77. **Max-width discipline:** `max-w-7xl` content pages, `max-w-3xl` reading pages, `max-w-xl` paragraphs.
78. **Alignment is exact.** Shared vertical rhythm between sibling sections; no off-by-1px inconsistencies.
79. **Z-index is a managed scale:** base < sticky header (z-50) < dialog/sheet overlay (z-50+) < toast (top). No arbitrary z-9999.
80. **Sticky elements reserve padding** so content never hides behind them (WCAG 2.2 2.4.11 focus-not-obscured).
81. **Use `min-h-dvh` (not `100vh`)** for full-height surfaces (mobile URL-bar rule).
82. **Primary content first on mobile.** Core content renders before secondary panels; fold, don't bury.
83. **Cards adapt:** 3-col → 2-col → 1-col grids; dialogs cap at `max-w-[calc(100%-2rem)]`.

## J. Components (General)

84. **Every component has all states:** default, hover, focus-visible, active/pressed, disabled, loading (where async), error/success (where applicable).
85. **One source of truth per primitive.** A button is the shared Button component — never a bespoke button-looking div.
86. **Reuse before build.** Existing component → shadcn registry → approved external source (copy) → custom (last resort) (see COMPONENT_DECISION_MATRIX.md).
87. **Accessible name on everything interactive** — visible label or `aria-label`.
88. **No layout shift on state change.** Hover/press/loading never changes element dimensions (transform/opacity only).
89. **Async components show their state** (disabled + suffix text like "Saving…").
90. **Components own their styles.** No page-level CSS reaching into a component's internals.

## K. Buttons

91. **One primary per action group.** Primary = filled `bg-primary`; everything else outline/ghost/secondary.
92. **Variant semantics are stable:** default (primary action), outline (secondary), ghost (tertiary/inline), destructive (danger), link (inline text nav).
93. **Button labels are verbs** ("Create course", "Generate cards", "Export data") — never nouns alone.
94. **Destructive buttons confirm.** Any delete/destructive button opens a confirmation or requires a second click.
95. **Loading state = disabled + progress.** Never leave a button clickable while its async work is in flight (double-submit rule).
96. **Icon buttons need `aria-label`** and a ≥44px hit area (size-11 minimum on touch).
97. **Hover, focus, and active feedback for every button** (`hover:bg-primary/80`, `focus-visible:ring-2`, `active:translate-y-px`).
98. **Disabled ≠ invisible.** `disabled:opacity-50 disabled:pointer-events-none` — still readable, clearly inert.
99. **Buttons look like buttons.** Real `<button>` or Base UI Button, `cursor-pointer`; a styled div is not a button.
100. **Same action, same label/placement** across the app (consistency gate).

## L. Forms

101. **Visible labels, never placeholder-only** (WCAG 3.3.2 labels-or-instructions).
102. **Error messages sit under the offending field** with the field flagged (WCAG 3.3.1 error identification).
103. **Error text states cause + fix** ("Enter at least 3 characters", not "Invalid input") (HIG error-clarity).
104. **Validation on blur, not every keystroke** (Material inline-validation rule).
105. **After failed submit, focus the first invalid field** (WCAG 3.3.1 + focus management).
106. **Required fields are marked** (asterisk or "required" label).
107. **Submit shows loading → success/error**; the submit button disables while pending.
108. **Asterisk/required markers and helper text below complex inputs** (Material helper-text rule).
109. **Forms don't lose data.** Unsaved changes warn before modal dismissal (Apple sheet-dismiss-confirm rule).
110. **Group related fields** with visual grouping and logical order.
111. **`aria-invalid` + `aria-describedby` on error fields** so screen readers announce errors (WCAG 3.3.1).
112. **Errors surface in an `aria-live`/`role="alert"` region** (WCAG 4.1.3 status messages).

## M. Inputs

113. **Minimum 44px tall on touch** (min-h-11).
114. **Correct `type` for correct mobile keyboard** (email, number, url) (HIG input-type rule).
115. **Semantic input types + `autocomplete`** for autofill support (name, email, url).
116. **Password/key fields have show/hide toggle** (Settings API key inputs).
117. **Placeholder is an example, never the label.**
118. **Full-width on mobile**; consistent `h-10` sizing on desktop.
119. **Focus ring on every input** (`focus-visible:ring-2 focus-visible:ring-ring`).
120. **Character/limits communicated** (e.g., "Max 70 MB") before the user hits the wall.

## N. Dialogs

121. **Every dialog has a `DialogTitle`** and, where needed, a `DialogDescription` (WCAG/APG dialog pattern).
122. **Escape closes; backdrop click closes; explicit Close button exists** (APG dismiss pattern).
123. **Focus moves into the dialog on open** and returns to the trigger on close (APG).
124. **Focus is trapped inside** while the dialog is open (APG modal pattern) — provided by the Base UI primitive; never hand-roll.
125. **Dialog fits the viewport** — `max-w-[calc(100%-2rem)]`, scrollable content when tall (mobile rule).
126. **Actions live in `DialogFooter`**: Cancel (left, non-destructive) + primary submit (right).
127. **Submit disables during save; success state replaces footer** (e.g., "Course created!" + Open course / Close).
128. **Destructive dialogs make the consequence explicit** ("Delete course and its 12 cards?") — never "OK/Cancel" on a delete.
129. **No primary-navigation flows inside modals.** If a flow is the main journey, it's a page, not a dialog.
130. **Dialogs animate scale+fade in ≤200ms** and exit faster (~150ms); respect reduced motion.

## O. Tables

131. **Tables have real `<th>` headers** with scope, and a `<caption>` or aria-label.
132. **Numeric columns use `tabular-nums`** and right-align where standard.
133. **Sortable columns expose `aria-sort`** (WCAG 1.3.1).
134. **Responsive tables don't force horizontal scroll** — collapse to stacked cards at `sm:` breakpoints.
135. **Row actions are icon buttons with `aria-label`** (edit/delete per row).
136. **Empty tables show an empty state, not a bare header row.**

## P. Cards

137. **Card anatomy is fixed:** CardHeader (CardTitle + CardDescription + CardAction) → body → CardFooter (metadata, date, due count, confirmations).
138. **Clickable cards are links** (whole card navigates) with hover affordance; non-clickable cards stay inert.
139. **Card titles are the link text** — meaningful, unique within the page.
140. **Card hover = subtle elevation/translate** (transform, no layout shift).
141. **Cards show their state:** due count badges, "up to date" emerald, error red — color never alone (add icon/text).
142. **Card grids are consistent** (gap-3, same radius/height rhythm); no one-off card designs per page.
143. **No card soup.** Where a simple list is clearer than cards (settings items, search results), use a list.
144. **Destructive actions on cards confirm before firing** (delete card → confirmation).

## Q. Empty States

145. **Every data surface has a designed empty state** — never a blank page or bare "no data".
146. **Empty state = icon container + message + one action** ("No courses yet — Create your first course").
147. **The empty-state action is the primary next step** (Material empty-data-state rule).
148. **Empty states are encouraging, not apologetic**; they teach what the surface is for.
149. **Loading must not flash an empty state.** Show skeleton until data resolves; only then render empty state if truly empty (no empty-flash).
150. **Nested empty states explain their parent** ("No topics yet — add one to organize decks").

## R. Loading States

151. **Async >300ms gets a skeleton or spinner** (Apple progressive-loading rule).
152. **Skeletons mirror final layout** — same dimensions/positions as loaded content (CLS prevention).
153. **Buttons show inline progress** ("Saving…", "Generating…") rather than blocking spinners.
154. **Route-level loads use skeletons, not spinners**, for page content.
155. **Spinners communicate and stop.** Never an infinite indeterminate spinner where progress is knowable.
156. **Loading never blocks navigation** (user can always cancel/escape).
157. **Data fetches are non-blocking** — stale content can remain visible during refresh rather than flashing blank.
158. **Double-trigger protection:** disabled during in-flight async (create/delete/generate/export/import).

## S. Error States

159. **Error messages are human, specific, recoverable** ("Gemini is rate-limited. Try again in a minute.").
160. **Every error offers a recovery path** — retry button, edit link, or clear next action (HIG error-recovery).
161. **Failures never corrupt or half-write data** (transactional writes — see lib/db patterns).
162. **Provider errors don't leak keys or raw responses** — surface a classified message (quota/rate-limit/network/schema).
163. **Inline form errors** (field-level) plus optional summary; never only a top-of-page toast.
164. **Errors are announced to screen readers** (`role="alert"` or `aria-live="assertive"`).
165. **No silent failures.** If something can't load, the UI says so — no frozen spinners.
166. **Error boundaries catch render crashes** with a recoverable fallback (reload button) rather than a white screen.

## T. Success States

167. **Every completed action confirms** — brief inline success, checkmark, or state change (Material success-feedback).
168. **Success confirms the result, not just the click** ("Course created!" + the next action).
169. **The next action is offered** after creation flows (Open course / Add source / Generate cards).
170. **Transient toasts auto-dismiss in 3–5s** and never steal focus (HIG toast rule).
171. **Success never relies on color alone** — checkmark/icon + text.
172. **Post-action state is accurate** (list refreshed, counts updated, new entity visible).

## U. Microinteractions

173. **Feedback within 100ms of interaction** (Apple tap-feedback rule).
174. **Hover, press, focus all give feedback** — microinteractions are the states, not decoration.
175. **Press feedback ≤ 150–300ms, subtle** (translate-y-px, color shift — never layout jitter).
176. **Interactive elements change cursor** (`cursor-pointer`).
177. **Every hover has an affordance before the click** (the element reads as clickable).
178. **No gratuitous micro-interactions** — each one communicates state, hierarchy, or the result of an action.

## V. Animation

179. **Duration window:** micro 150–200ms, UI transitions 200–300ms, complex ≤400ms (Material/NN/g timing rules).
180. **Easing:** ease-out for entering, ease-in for exiting, never linear for UI motion; prefer standard curves.
181. **Exit faster than enter** (~60–70% of enter duration) for responsiveness (Material motion).
182. **Animate transform/opacity only.** Never animate width, height, top, left (layout-thrash rule).
183. **Animate 1–2 key elements per view max** (excessive-motion rule).
184. **Dialog/Sheet motion: scale+fade or slide from trigger** for spatial context.
185. **List entrance staggers by 30–50ms per item** if used at all; don't stagger large lists.
186. **Animations are interruptible** and never block input.
187. **No infinite animation except the spinner.**
188. **Motion communicates cause-effect** — if it doesn't express a relationship, remove it (Apple motion-meaning rule).

## W. Motion Accessibility

189. **Respect `prefers-reduced-motion`** globally (already in `globals.css`) — every animation has a static equivalent (WCAG 2.3.3).
190. **Nothing essential is conveyed only through motion** (WCAG 2.2.2 pause-stop-hide).
191. **No blinking/flashing content** (>3 flashes/sec violates WCAG 2.3.1).
192. **Parallax and large scale are banned** in the app; landing page uses none that can't be disabled.
193. **Fade thresholds:** never linger below opacity 0.2 — fade fully or keep visible.
194. **Motion never causes layout shift or CLS** (transform-only rule).

## X. Responsive Design

195. **Test at 390×844, 768×1024, 1280×800, 1440×900** before marking any feature done.
196. **No horizontal overflow at any width** — the #1 mobile bug; check with Playwright `scrollWidth <= clientWidth`.
197. **Dialogs and sheets fit 390px width** (`max-w-[calc(100%-2rem)]`).
198. **Mobile nav (Sheet) works:** opens, closes, focus-managed, Escape.
199. **Card grids collapse 3→2→1 columns.**
200. **Tables collapse to stacked cards under `sm:`.**
201. **Forms full-width on mobile; labels remain visible.**
202. **Study controls stay reachable on mobile** (rating buttons above the fold of the card).
203. **Touch targets ≥44px with ≥8px spacing.**
204. **`min-h-dvh`, never `100vh`** for app-shell full-height layouts.
205. **Mobile content order = priority order** (primary content first).
206. **Landscape orientation stays usable** (no clipped fixed elements).

## Y. Mobile UX

207. **Tap is the primary interaction** — never rely on hover for essential actions (ui-ux-pro-max touch rule).
208. **No precision taps:** min 44px targets, adequate spacing (touch-density rule).
209. **Gesture conflicts avoided:** no horizontal swipe on main scrollable content; vertical scroll only.
210. **`touch-action: manipulation`** where taps should not wait for double-tap zoom.
211. **System gestures never blocked** (browser back, pull-to-refresh where sensible).
212. **Fixed bottom elements reserve safe area** (bottom nav content inset).
213. **Text inputs ≥44px tall** so mobile keyboards don't cause mis-taps.
214. **No hover-only reveal patterns** on mobile (dropdowns/actions must be tappable directly).

## Z. Keyboard UX

215. **Everything mouse-driven is keyboard-driven** (WCAG 2.1.1 keyboard).
216. **Tab order = visual order**, logical and linear (WCAG 2.4.3 focus order).
217. **Study session shortcuts:** Space (reveal), 1/2/3/4 (Again/Hard/Good/Easy), Enter — documented in the UI, and buttons always remain clickable.
218. **Cmd/Ctrl+K opens global search** from any workspace page; Escape closes.
219. **Escape closes dialogs, sheets, and the command palette.**
220. **Arrow keys navigate command palette results; Enter selects.**
221. **No keyboard traps** — focus always moves out of every component (WCAG 2.1.2 no-keyboard-trap).
222. **Focus moves to main content after route change** for screen-reader users (APG focus-on-route-change).
223. **Skip link** to main content is present for keyboard users (WCAG 2.4.1 bypass blocks).
224. **Shortcut hints are visible but optional** (small kbd hints; real buttons always present).

## AA. Accessibility

225. **Semantic HTML first** — real buttons, links, headings, labels; ARIA only to fill genuine gaps (ARIA first-rule).
226. **Heading hierarchy is sequential** — one h1, then h2s, then h3s, no skipping (WCAG 1.3.1).
227. **Form fields: `<label htmlFor>` always** (WCAG 3.3.2).
228. **Icon-only controls: `aria-label`** (ui-ux-pro-max a11y rule).
229. **Color contrast:** body ≥4.5:1, large text/UI ≥3:1 (WCAG 1.4.3/1.4.11).
230. **Alt/aria for meaningful images; decorative icons `aria-hidden`.**
231. **Status changes announced** via `aria-live="polite"` / `role="status"` (WCAG 4.1.3).
232. **Screen-reader meaning matches visual meaning** — reading order, roles, states (selected, expanded, disabled) correct.
233. **No motion-triggered vestibular risk** — no parallax, no large movement (WCAG 2.3.3).
234. **Touch targets ≥44×44** (Apple HIG / Material minimums).
235. **Reduced motion respected everywhere.**
236. **Focus visible on all interactive elements** (`focus-visible:ring-2 ring-ring`, never `outline-none` alone) (WCAG 2.4.7 focus-visible).
237. **Landmarks present:** header, nav, main, footer where applicable.
238. **`aria-current="page"` on active nav items** for screen readers.

## AB. Focus Management

239. **Focus enters dialogs/sheets on open, returns to trigger on close** (APG).
240. **Focus is trapped inside open modals** (Base UI provides; never disable it).
241. **`focus-visible` distinguishes mouse from keyboard** — never hide focus rings globally.
242. **Focus never lands on hidden elements** (closed menu items, off-screen content).
243. **Route change moves focus to main content** (h1 or main) for keyboard/screen-reader users.
244. **After form submit error, focus the first invalid field.**
245. **Focus is never lost to the void** — if an element unmounts, focus goes somewhere sensible (body → next control).
246. **Sticky headers never obscure the focused element** (WCAG 2.2 2.4.11).

## AC. Touch Targets

247. **Minimum 44×44px** for all interactive elements (Apple HIG).
248. **48×48 on primary mobile actions** where practical (Material).
249. **≥8px between adjacent targets.**
250. **Small icon buttons expand hit area** (padding or hitSlop) beyond the visual glyph.
251. **Study rating buttons on mobile are full-width rows** — easy, unambiguous taps.
252. **No 24px text-only links as primary mobile actions** — pad them.

## AD. Visual Hierarchy

253. **Hierarchy via size, spacing, and weight — not color alone.**
254. **One dominant element per screen** (the primary CTA or the card being studied).
255. **Secondary content is visually subordinate** — muted text, smaller size, fewer borders.
256. **Related items grouped; unrelated separated** (Gestalt proximity).
257. **Page structure reads top-down:** h1 → section overline → content.
258. **Numbers are emphasized** (`font-heading text-3xl`) on stat surfaces; labels muted underneath.
259. **No competing emphasis.** Two filled primary buttons on one screen is a hierarchy failure.
260. **Consistent emphasis levels across routes** (the same kind of element is emphasized the same way everywhere).

## AE. Content Design

261. **Write for the student, not the database.** Labels describe actions ("Generate cards from source") not fields ("sourceChunkIds").
262. **Consistent terminology everywhere** — course/topic/deck/card/source/chunk mean the same thing on every screen.
263. **Button labels are verbs; nav labels are nouns.**
264. **No jargon in user-facing text** (FSRS is "smart scheduling", not "FSRS algorithm" — or explain it once).
265. **Errors state the cause and the fix.**
266. **Empty states teach** — what this surface is and what to do first.
267. **Loading text is honest** ("Generating 5 cards…" not "Please wait").
268. **Copy length is scannable** — headings ≤ 8 words, descriptions ≤ 2 sentences.
269. **No stale or contradictory copy** ("All caught up" while cards are due).
270. **Dates and counts are human-formatted** ("2 days ago", "12 cards due"), locale-aware.

## AF. AI UX

271. **Missing API key → clear setup path.** The UI says what's needed and links to Settings (never a silent failure).
272. **Generation states are explicit:** configuring → generating → reviewing → accepted (each with visible state).
273. **Generation shows what's happening** ("Generating 5 cards from Lecture Notes…" with cancel/close).
274. **Generated content is reviewed before persistence** — preview → edit → reject → accept; nothing saves before acceptance (provenance gate).
275. **Edited generated cards preserve provenance** (sourceChunkIds survive edit/reject/accept).
276. **Provider failures are classified and recoverable:** quota, rate-limit, network, timeout, malformed response — each with a useful message and retry where appropriate.
277. **Failed AI operations never corrupt local data** (no partial writes; transactional).
278. **API keys never appear in UI, logs, errors, or exports.**
279. **Feynman feedback is structured and actionable** — scores plus concrete corrections, missing concepts, and follow-ups.
280. **AI output is validated by schema** (Zod) before rendering; malformed output → clear "couldn't parse response" error, not a crash.
281. **Long-running AI tasks don't block the UI.**
282. **No secrets, keys, or provider headers leak into the DOM or console.**

## AG. Study UX

283. **The card is the stage.** Prompt front and center; no chrome competing with the question.
284. **Reveal is one obvious action** (Space or button), then ratings appear.
285. **Rating buttons map to labels + shortcuts** — Again (1) / Hard (2) / Good (3) / Easy (4), always visible as buttons.
286. **Progress is visible and never regresses** ("3 of 12") — Again requeues without moving progress backward.
287. **After the last card, completion state shows** a summary + "Study again" that refetches current due cards.
288. **Rapid input is safe** — double-key/click protection; a rating in flight can't double-apply.
289. **Empty/no-due states are encouraging** ("Nothing due — come back later" or "Add cards first").
290. **No distractions during study** — no nav churn, no toasts, no countdown noise.
291. **Keyboard shortcuts are documented in the UI** (kbd hints, subtle).
292. **FSRS state is invisible to the user** but its effects (due counts, "up to date") are visible and accurate.

## AH. Dashboard UX

293. **Stat cards answer "how am I doing"** — cards due, reviews done, retention; numbers are tabular and real (never fake).
294. **Each stat has a label + muted description**, not bare numbers.
295. **Dashboard surfaces next actions** — due decks, continue studying, add sources.
296. **Empty dashboard teaches the loop** (create course → add source → generate cards).
297. **Numbers update live after actions** (create course/card, review) — no stale counts.
298. **Hierarchy: numbers dominant, labels secondary, actions tertiary.**
299. **Reload persistence** — dashboard reflects stored data, never in-memory-only state.
300. **No decorative metrics or invented KPIs.**

## AI. Search UX

301. **Cmd/Ctrl+K opens search from anywhere in the workspace.**
302. **Input auto-focuses on open; results respond to every keystroke.**
303. **Results are grouped by type** (Courses, Decks, Cards, Sources) with type badges.
304. **Result rows show title, excerpt, parent context, and type — enough to identify without opening.**
305. **Arrow keys + Enter navigate; Escape closes; selected result is highlighted.**
306. **Empty query shows recent/all or hints; no-results state is honest and suggests alternatives.**
307. **Clicking a result navigates to the exact entity.**
308. **Search reflects current data** — create/edit/delete updates results without full rebuild.
309. **Search works offline/local-only** (in-memory index over Dexie; no network).
310. **Mobile search is reachable** (header icon on small screens) and the palette fits the viewport.

## AJ. Settings UX

311. **Settings groups are scoped sections** (AI, Data, Appearance, Danger zone) — not one long scrolling form.
312. **Each setting explains itself** (label + one-line description + state).
313. **API-key inputs: password-style with show/hide, per-key add/remove, count shown, keys never displayed in plaintext.**
314. **Save is explicit and confirms; clear/remove confirms.**
315. **Danger zone is visually distinct and separated** (red border/heading; destructive confirmations).
316. **Export/import are discoverable with clear labels and file guidance.**
317. **Storage/danger info is honest** (real counts, real limits).
318. **Settings persist on reload** (localStorage/IndexedDB), and changes reflect immediately in the app.

## AK. PWA Behavior

319. **App shell loads offline** (service worker caches shell assets); IndexedDB data works offline.
320. **Offline study works** — the entire study loop (reveal/rate/FSRS) is local-only.
321. **Offline AI fails gracefully** — a clear "AI unavailable offline" message, never a hang or crash.
322. **Export works offline** (pure client-side JSON).
323. **Installable manifest + icons** are valid and consistent (name, theme-color, display standalone).
324. **Service worker scope is app-only** — no caching of user data or secrets in the SW cache.
325. **Reload preserves state** — offline reload keeps IndexedDB data.
326. **Network-dependent features degrade, not disappear** (URL ingestion shows a clear error offline).

## AL. Performance

327. **Waterfalls eliminated:** parallelize independent data fetches with `Promise.all` (Vercel async-parallel).
328. **Bundle discipline:** direct imports (no barrel files), `next/dynamic` for heavy components, no unused deps (Vercel bundle rules).
329. **Avoid unnecessary re-renders:** memoize expensive subtrees, derive state during render (not in effects), use functional setState (Vercel rerender rules).
330. **Effects only where needed** — no state-synchronization effects that could be derived (Vercel rerender-derived-state).
331. **Dexie reads are scoped** — indexed lookups, not full-table scans per keystroke.
332. **Search index rebuilds are debounced/incremental** — never rebuilt on every keystroke.
333. **Large PDF/URL processing doesn't freeze the UI** (worker/chunked/async progress).
334. **CLS ≈ 0** — reserve space for async content, skeletons match layout, images declare dimensions.
335. **Client/server boundary respected** — server components stay server; client components are interaction-only.
336. **No unnecessary client components** (Vercel server/client discipline) — keep pages server-rendered where possible.
337. **Image/media optimization** — responsive, lazy where below fold (ui-ux-pro-max image rules).
338. **Long lists virtualize or paginate** at 50+ items (virtualize-lists rule).

## AM. React/Next Architecture

339. **Server components by default; `"use client"` only for interaction.**
340. **Data fetching lives in server components or repositories** — not scattered through client effects.
341. **`startTransition` for non-urgent updates** (search filtering, list refresh) (Vercel rerender-transitions).
342. **Event handlers hold interaction logic** — effects are not event handlers (Vercel rerender-move-effect-to-event).
343. **Stale closures and races are handled** — cancellation/ignore patterns for async effects that unmount mid-flight.
344. **Keyed lists with stable keys** (entity ids, never array index for reorderable data).
345. **Repository layer is the single data-access path** (lib/db/repositories) — components never touch Dexie directly.
346. **Derived state computed during render** with `useMemo` where expensive; never synced via `useEffect` + `setState` (Vercel rule).
347. **Route titles resolve dynamically** (AppShell maps pathname → label) — no hardcoded per-page titles.
348. **Component boundaries are clean** — presentational components don't import repositories; containers orchestrate.
349. **No `any` escapes in UI code; props are typed.**
350. **Hydration-safe** — no client-only data rendered differently on server vs client without explicit handling (Vercel hydration rules).

## AN. Tailwind Architecture

351. **Tokens, not literals** — colors/fonts/radii come from `@theme`/CSS variables; no arbitrary values where a token exists.
352. **Mobile-first utility composition** (base + `sm:`/`lg:` variants).
353. **Repeated patterns extract to components** — long class strings are extracted, not copied.
354. **Arbitrary values are rare and justified** (never `w-[500px]` when a token works).
355. **`@apply` sparingly** — prefer plain utilities in components (maintainability).
356. **Dark theme is the single theme** (NoNotes is dark-first); light mode is not half-supported.
357. **`prefers-reduced-motion` is global** (already in globals.css) — don't re-implement per component.
358. **No inline `style={{}}` where a utility class exists.**

## AO. Component Reuse

359. **Discovery order is fixed:** existing NoNotes components → shadcn registry (`npx shadcn@latest add`) → approved external sources (copy source) → custom build (see COMPONENT_DECISION_MATRIX.md).
360. **shadcn components are owned source** — customize variants in the project, don't fork libraries.
361. **No duplicate primitives** (two button components, two dialog systems).
362. **External libraries are pattern sources, not dependencies** — copy the component, cite the license.
363. **One icon system: Lucide.** No emoji-as-icon, no mixed icon sets (ui-ux-pro-max icon rules).
364. **Base UI primitives under shadcn stay the foundation** — don't hand-roll dialog/sheet/select when the primitive exists.
365. **A new component earns its place** — if a feature can use an existing component, it does.
366. **Components ship with their Playwright coverage** (behavior, not just rendering).

## AP. Browser Testing

367. **Every new interaction gets Playwright coverage** — real UI interaction, not just function calls.
368. **Routes tested at desktop + mobile (390×844)**: no horizontal overflow, dialogs fit, nav works.
369. **Console must be clean** — tests fail on unexpected console errors.
370. **Async states tested:** loading → success → error → retry.
371. **Persistence tested by reload** — IndexedDB state survives reload.
372. **Destructive flows tested with cancel + confirm paths.**
373. **Keyboard flows tested** (Space/Enter/1-4 in study, Cmd+K, Escape).
374. **AI flows use mocked provider boundaries** — deterministic, never live API calls.

## AQ. Visual Regression

375. **Screenshots for high-value stable surfaces only** (landing, dashboard, deck detail, study) — no brittle full-site snapshots.
376. **Snapshots assert layout, not pixel-perfection** — check overflow, element presence, spacing.
377. **Screenshots have stable data** — seed deterministic fixtures.
378. **Baseline diffs are reviewed, not auto-accepted.**
379. **Reduced-motion and mobile variants captured where meaningful.**
380. **Visual changes are deliberate** — a screenshot diff must correspond to an intentional change.

## AR. Security UX

381. **API keys stored locally (localStorage), never exported, never logged, never in errors.**
382. **Secret inputs are masked with show/hide; count shown, values not.**
383. **Import validates schema, version, referential integrity, and size before any write** — transactional commit, zero partial writes.
384. **Untrusted content (URLs, PDFs, imported JSON) never renders as raw HTML** (no `dangerouslySetInnerHTML`).
385. **SSRF protections on URL ingestion** (block private/loopback IPs, per-hop redirect validation).
386. **Destructive actions confirm and communicate consequence.**
387. **Errors never expose internals** (no stack traces, no schema dumps to users).
388. **Local-first means data stays local** — no hidden network uploads.

## AS. Release Quality

389. **Zero console.log / debug statements in production code.**
390. **Zero TODO/FIXME/HACK/XXX in production code.**
391. **No dead code paths, no abandoned components.**
392. **Every route has a smoke test; every workflow has an e2e test.**
393. **Typecheck, lint (0 errors), build, and tests all green before completion.**
394. **Playwright suite passes with 0 retries, 0 flaky, 0 failures.**
395. **No secrets or fixtures with real credentials in the repo.**
396. **Docs match reality** — README/ROADMAP never claim unimplemented features.

## AT. Anti-Patterns (Forbidden)

397. **Dead buttons and fake links** — nothing that looks interactive but does nothing.
398. **Generic AI-SaaS UI** — the violet-on-white "dashboard with gradient hero" cliché.
399. **Random gradients, glows, or glassmorphism** in the app surface (landing only).
400. **Emoji as icons.**
401. **Multiple competing UI libraries** in one component tree.
402. **Placeholder-only labels**, icon-only controls without names.
403. **Instant state changes with zero feedback** (0ms transitions).
404. **Removing focus rings** to "clean up" the design.
405. **Horizontal scroll on mobile.**
406. **Infinite decorative animation** (marquees, spinning badges).
407. **Fake metrics or fabricated product claims.**
408. **eslint-disable comments to hide real issues.**
409. **`console.log` shipped to production.**
410. **Copy-paste component designs that break the design system** (different radius/spacing/hierarchy per page).

---

## Canonical Component Behavior (NoNotes-specific)

### Buttons (Base UI `@base-ui/react/button`)

| State | Behavior |
|-------|----------|
| Default | `bg-primary text-primary-foreground` |
| Hover | `hover:bg-primary/80` |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` |
| Active | `active:translate-y-px` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Loading | Disabled + "…" suffix ("Saving…") |

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.

### Cards

```
Card → CardHeader (CardTitle link + CardDescription + CardAction) → body → CardFooter (metadata)
```

### Dialogs

```
Dialog → DialogContent → DialogHeader (Title + Description) → form → DialogFooter (Cancel + Submit)
```

Rules: title + description required; Escape/backdrop close; submit disables during save; success state replaces footer.

### Navigation

- Desktop: fixed left sidebar, icon + label, active = `bg-sidebar-accent text-sidebar-accent-foreground`
- Mobile: Sheet from left, focus-managed
- Header: resolved page title, never hardcoded

### Command Palette

Cmd+K open · Escape/backdrop/select close · auto-focus input · arrows navigate · Enter selects · grouped results with type badges · footer shows count + shortcuts.

---

## Design Tokens Quick Reference

- **Fonts:** `font-heading` (Geist Sans), `font-sans` (Geist Sans), `font-mono` (Geist Mono)
- **Radius:** `rounded-lg` buttons · `rounded-xl` cards/dialogs · `rounded-2xl` hero/empty-state containers · `rounded-full` progress
- **Spacing:** 4px scale; `gap-1/2/3/4/6/8` rhythm; card grid `gap-3`
- **Motion:** hover `transition-colors`; press `active:translate-y-px`; focus `ring-2 ring-ring`; dialog enter `animate-in fade-in-0 zoom-in-95` (200ms), exit `animate-out fade-out-0 zoom-out-95` (150ms)
- **Layout:** `mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12`; reading pages `max-w-3xl`

## Verification Command

After any frontend change:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Plus: browser console clean, no horizontal overflow at 390px, keyboard flows verified, reduced-motion respected, screenshots reviewed for stable surfaces.
