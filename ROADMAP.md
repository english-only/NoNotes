# NoNotes Roadmap

Phasing follows `NO_NOTES_SPEC.md` §95 (MVP priority) and §96 (core loop priority).
Per spec §86–88 and §94, this file is updated at the end of every phase, and a phase is
only marked complete when it passes the spec's definition of done.

Legend: `[x]` complete · `[ ]` not started · `[~]` in progress

## Phase 0 — Foundation `[x]`
- [x] Next.js 16 App Router shell (dashboard/courses/study/analytics/settings)
- [x] Deep Space Ink design system (oklch tokens, dark-only theme, Geist type)
- [x] Responsive app shell (desktop sidebar, mobile sheet), navigation, routing
- [x] Build / typecheck / lint / test tooling green

## Phase 1 — Local Data Layer `[x]`
- [x] Dexie schema: `courses`, `topics`, `decks`, `flashcards`, `reviewLogs` (v1)
- [x] Client-only DB boundary (`lib/db/client.ts`) so server components never touch IndexedDB
- [x] Vitest test infrastructure for IndexedDB-backed repositories (fake-indexeddb)

## Phase 2 — Course CRUD `[x]`
- [x] `course-repository` (list / create / get / update / delete) with unit tests
- [x] Courses page: real list from IndexedDB (loading / empty / error states)
- [x] Create-course dialog (title + description, validation, loading state)
- [x] Delete course with in-card confirm
- [x] ROADMAP updated

## Phase 3 — Topics `[x]`
- [x] `topic-repository` (list-by-course / create / get / update / delete) with unit tests
- [x] Course detail route `/courses/[courseId]` (dynamic, client-fetched) with topic list
- [x] Topic create / edit dialog + delete with in-card confirm
- [x] Course delete now cascades to its topics (transactional)
- [x] Course cards link to their detail page
- [x] ROADMAP updated

## Phase 4 — Decks & Flashcards `[~]`
- [x] `deck-repository` (list-by-course / list-by-topic / create / get / update / delete) with course + topic FK validation and unit tests
- [x] Decks section in the course workspace: browse, create / edit / delete with optional topic assignment
- [x] `flashcard-repository` (list-by-deck / create / get / update / delete) with deck FK validation and unit tests
- [x] Deck detail route `/courses/[courseId]/decks/[deckId]` with manual flashcard authoring (create / edit / delete)
- [x] Cascade: course delete → decks → flashcards; deck delete → flashcards (transactional)
- [ ] Deck browse within topic route (when the topic-detail route exists)
- [x] ROADMAP updated

## Phase 5 — Study Sessions `[x]`
- [x] `/study` deck picker (deck list, course context, card counts, empty/error states)
- [x] `/study/[deckId]` session flow: prompt → reveal → rate (Again/Hard/Good/Easy)
- [x] Pure session state machine (`lib/study/session.ts`) with unit tests (incl. Again re-queue)
- [x] Keyboard shortcuts (Space/Enter reveal, 1–4 rate) + focus management; loading/error/empty/not-found/completion states
- [x] "Study" entry point on deck cards; ratings are session-local (persistence is Phase 6)
- [x] ROADMAP updated

## Phase 6 — FSRS Scheduling `[x]`
- [x] `lib/fsrs` scheduler adapter over ts-fsrs (v5.4.1): full explicit card state (stability, difficulty, intervals, reps, lapses, learning steps), deterministic (fuzz disabled), unit tested
- [x] Ratings persist to `reviewLogs` atomically with the card update (`recordReview`); cards carry full FSRS state + `dueAt`; reveal→rating `elapsedMs` captured
- [x] Due-card queue: `[deckId+dueAt]` compound index (Dexie v2) + `listDueFlashcardsByDeck`; `/study/[deckId]` studies due cards only with a "Nothing due" state; `/study` picker shows due counts and "All caught up"
- [x] Migration: Dexie v1 → v2 backfills default FSRS state on existing cards (unit tested)
- [x] ROADMAP updated

## Phase 7 — Dashboard Live Data `[x]`
- [x] Replace hardcoded dashboard stats with real Dexie queries (due today, active courses, study time)
- [x] Dashboard stats component with live loading/error/empty states
- [x] ROADMAP updated

## Phase 8 — Ingestion `[x]`
- [x] Source / Chunk schema + Dexie v3 migration with indexes
- [x] Source repository (CRUD, course/topic FK validation, cascade delete with chunks)
- [x] Chunk repository (CRUD, ordinal ordering, by-source queries)
- [x] Source processing pipeline: text/markdown/pdf/url → strip formatting → normalize whitespace → paragraph-aware chunking
- [x] Ingestion UI: add-source dialog in course workspace, source list with delete confirmation
- [x] PDF intake: client-side extraction via pdfjs-dist, text extraction, page ordering, malformed/empty/oversized handling
- [x] URL intake: server-side API route (avoids CORS), HTML text extraction, SSRF protection, timeout/size limits
- [x] Source type extended: `"text" | "markdown" | "pdf" | "url"`
- [x] TDD: unit tests for PDF extractor, URL extractor, API route, processor
- [x] Playwright: 8 browser scenarios for ingestion UI
- [x] Regression: existing 99 scenarios still pass (107/107 total)
- [x] ROADMAP updated

## Phase 9 — AI Generation `[x]`
- [x] `lib/ai/provider.ts` — provider interface + Zod schemas for flashcard generation
- [x] `lib/ai/gemini.ts` — Gemini provider via `@google/genai` (spec §41)
- [x] `lib/ai/generation.ts` — generation service (source chunks → validated flashcards, review-then-persist workflow)
- [x] Structured output validation with Zod (spec §42)
- [x] Settings page: API key management (localStorage, show/hide, clear)
- [x] Generation UI: "Generate from source" dialog — generate → review/edit/reject → persist accepted cards
- [x] sourceChunkIds provenance preserved through generate → review → persist
- [x] TDD: provider tests, Gemini tests (mocked), generation service tests
- [x] ROADMAP updated

## Phase 10 — Feynman Evaluation `[x]`
- [x] `FeynmanAttempt` schema + Dexie v4 migration (`feynmanAttempts` table)
- [x] `feynman-repository` (CRUD by course/deck, unit tested)
- [x] `FeynmanEvaluationInput/OutputSchema` — Zod schemas for structured evaluation
- [x] `lib/ai/evaluation.ts` — evaluation service (source-grounded, validates AI output)
- [x] `GeminiProvider.evaluateExplanation` — AI evaluation method (spec §39, §43)
- [x] `/feynman` page: select course/source → enter concept + explanation → get structured feedback (scores, misconceptions, missing concepts, corrections, improvement, follow-up)
- [x] Navigation updated with Feynman entry
- [x] TDD: schema tests, repository tests, evaluation service tests, Gemini tests
- [x] Attempt persistence for evaluation history
- [x] History view: recent attempts with scores, dates, and weaknesses

## Phase 11 — Search `[x]`
- [x] BM25-style TF-IDF search engine (local, no dependencies)
- [x] In-memory index built from Dexie data (courses, topics, decks, flashcards, sources, chunks)
- [x] Global search UI: Cmd/Ctrl+K command palette with debounced input
- [x] Result ranking by relevance score with title-match boosting
- [x] Result type badges and parent context display
- [x] Navigation to entity on result click (courses, topics, decks, flashcards, sources)
- [x] Empty/no-results state, loading state, keyboard navigation (arrows, Enter, Escape)
- [x] Search index invalidation after CRUD operations
- [x] Accessible: labeled input, ARIA roles, focus management
- [x] Responsive: works on mobile (390×844)
- [x] TDD: unit tests for tokenizer, BM25 scoring, index building, search ranking
- [x] Playwright: 14 browser scenarios covering search UI, CRUD updates, navigation, mobile
- [x] Regression: existing 85 scenarios still pass (99/99 total)
- [x] ROADMAP updated

## Phase 12 — Analytics `[x]`
- [x] Real metrics from review history: total cards, total reviews, due now, mastery %
- [x] Rating distribution visualization (Again/Hard/Good/Easy)
- [x] Study summary: reviews this week, sources ingested, average stability
- [x] Per-deck breakdown: due cards, Again count, Good count, average stability
- [x] "Needs attention" section: weak decks sorted by Again count + due cards
- [x] Empty state when no reviews exist
- [x] ROADMAP updated

## Phase 13 — PWA & Polish `[x]`
- [x] Web manifest with SVG icons (spec §58)
- [x] Service worker for offline app-shell caching (spec §58)
- [x] PWA installability: standalone display, theme color, viewport (spec §58)
- [x] JSON export: all user data (courses, topics, decks, flashcards, reviewLogs, sources, chunks, feynmanAttempts) with schemaVersion + appVersion + exportedAt; API keys never exported (spec §64)
- [x] JSON import: schema/version validation, referential-integrity checks, preview with entity counts, merge/replace modes, transactional commit, malformed/oversized handling (spec §64)
- [x] Settings UI: export button, import file picker with preview, destructive data reset with confirmation, per-table storage info
- [x] Unit tests: 28 import/export tests (validation, referential integrity, replace/merge, rollback, edge cases)
- [x] Playwright: 22 browser scenarios (PWA manifest/icons/SW, export download, import preview/confirm/cancel/replace, storage info, danger zone, API key, responsive, console)
- [x] Full regression: 129/129 Playwright scenarios pass × 3 consecutive runs, 0 flaky, 0 retries
- [x] ROADMAP updated
