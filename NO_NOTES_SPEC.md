# NoNotes — Product & Engineering Specification

**Document:** `NO_NOTES_SPEC.md`
**Status:** Active
**Project:** NoNotes
**Purpose:** Persistent product, architecture, UX, engineering, and quality specification for the NoNotes clean-slate rebuild.

---

# 1. SOURCE-OF-TRUTH RULE

This document defines the intended product and engineering standards for NoNotes.

When implementing NoNotes:

1. Read this document before beginning a substantial task.
2. Read `ROADMAP.md` before selecting work.
3. Read `DECISIONS.md` before changing established architecture.
4. Prefer the latest explicit project decision over older assumptions.
5. Do not invent requirements that are not present here or explicitly requested later.
6. Do not implement future roadmap phases unless explicitly instructed.
7. Do not rewrite working systems without a concrete reason.
8. Do not introduce dependencies without justification.
9. Do not sacrifice functionality merely to improve visual appearance.
10. Do not sacrifice accessibility, maintainability, or performance for visual effects.

If a later explicit instruction conflicts with this document, the later explicit instruction wins.

---

# 2. PRODUCT IDENTITY

## 2.1 Name

**NoNotes**

The name represents the core philosophy:

The student should not have to spend enormous amounts of time manually producing notes, flashcards, questions, or revision material.

The system should help transform learning material into useful active-recall resources.

---

# 3. PRODUCT VISION

NoNotes is a serious study and knowledge-retention application centered around:

* active recall
* spaced repetition
* structured study material
* intelligent content ingestion
* local-first processing
* efficient revision
* useful analytics
* low cognitive friction

The central workflow is:

**INGEST → UNDERSTAND → GENERATE → STUDY → SCHEDULE → EVALUATE → RETAIN**

The application should help a student move from raw learning material to effective revision with minimal unnecessary manual work.

NoNotes should feel like a serious learning tool rather than a generic notes application with an AI chatbot attached.

---

# 4. TARGET USERS

Primary users:

* high-school students
* university students
* serious self-directed learners
* students preparing for exams
* learners managing multiple subjects or courses

Secondary users:

* researchers
* lifelong learners
* technical learners
* people studying independently from documents and online resources

The interface should prioritize students first.

---

# 5. CORE PROBLEM

Traditional study workflows often require the learner to:

1. Find material.
2. Read it.
3. Take notes.
4. Rewrite notes.
5. Create flashcards.
6. Create questions.
7. Schedule revision.
8. Track weak areas.
9. Repeat the process.

Much of this administrative work does not directly improve understanding.

NoNotes should automate or simplify as much of this pipeline as practical while preserving the student's actual thinking and retrieval practice.

---

# 6. CORE PRODUCT PHILOSOPHY

## 6.1 Active Recall Over Passive Consumption

NoNotes should prioritize retrieval.

The product should encourage:

* answering questions
* recalling concepts
* explaining ideas
* solving problems
* reviewing weak material
* spaced repetition

It should not optimize primarily for passive reading.

---

## 6.2 Local-First Where Practical

NoNotes should perform as much computation locally as reasonably possible.

Potential local systems include:

* IndexedDB
* Dexie
* FSRS scheduling
* BM25 search
* semantic embeddings
* document processing
* chunking
* vector search
* Web Workers

External APIs should be used when an LLM or remote service provides meaningful value.

Do not send data to remote services unnecessarily.

---

## 6.3 Low Cognitive Friction

The application should make studying easier, not add another complicated productivity system to manage.

Avoid unnecessary:

* configuration
* menus
* dialogs
* confirmations
* decorative UI
* navigation depth
* repetitive input

The most important actions should be obvious.

---

## 6.4 Focus Over Gamification

Gamification is secondary.

Potential future features:

* streaks
* XP
* milestones
* celebrations
* achievements
* progress rewards

These must never interfere with the core learning loop.

Do not implement gamification while fundamental studying, ingestion, scheduling, or reliability remains incomplete.

---

# 7. CORE PRODUCT LOOP

The intended high-level loop is:

### 1. Ingest

The student provides study material.

Supported sources should eventually include:

* PDF
* Markdown
* plain text
* pasted text
* URLs
* potentially additional document formats later

### 2. Process

NoNotes:

* extracts text
* cleans content
* identifies structure
* chunks content
* stores source information
* optionally embeds content locally

### 3. Generate

AI can generate structured learning resources:

* flashcards
* question/answer pairs
* conceptual questions
* exam-style questions
* explanations
* other study assets

### 4. Study

The student performs active recall.

### 5. Schedule

FSRS determines future review timing.

### 6. Evaluate

The student can explain concepts using the Feynman technique and receive structured feedback.

### 7. Review

Analytics help identify:

* weak topics
* due material
* retention
* study history
* progress

---

# 8. INITIAL PRODUCT AREAS

The application is expected to eventually contain:

* Dashboard
* Courses / Subjects
* Course View
* Topics
* Study Materials
* Decks
* Flashcards
* Study Session
* Exam Mode
* Feynman Evaluation
* Search
* Analytics
* Settings

Do not assume all of these need to be implemented immediately.

Follow `ROADMAP.md`.

---

# 9. CLEAN-SLATE STATUS

The previous NoNotes application was deleted.

The current repository is a completely clean slate.

There is no legacy architecture to preserve.

There is no requirement to migrate the old application.

Previous implementation details are useful only as product knowledge and design requirements.

The new implementation should be designed properly from the beginning.

---

# 10. PRIMARY TECHNICAL STACK

Use the following stack unless a later explicit decision changes it.

## Framework

* Next.js
* App Router
* React
* TypeScript

## Styling

* Tailwind CSS v4

## UI

* shadcn/ui
* Base UI where appropriate
* Radix UI where appropriate
* React Aria where appropriate

## Icons

* Lucide React

## Animation

* Motion for React

Use:

```text
motion
```

and:

```text
motion/react
```

for new Motion implementations.

Do not start new implementations with the obsolete `framer-motion` package unless there is a concrete compatibility reason.

## Local Database

* Dexie
* IndexedDB

## Validation

* Zod

## Forms

* React Hook Form where appropriate

## Notifications

* Sonner

## Tables

* TanStack Table where appropriate

## Virtualization

* TanStack Virtual where appropriate

## Testing

* Vitest

## AI

* `@google/genai` for Gemini integration where appropriate

Potential additional provider:

* Groq

## Local Embeddings

Potentially:

* Transformers.js
* Web Workers

Model selection should prioritize reasonable quality, browser compatibility, model size, and performance.

---

# 11. ARCHITECTURAL PRINCIPLES

## 11.1 Server Components by Default

Use Next.js Server Components by default.

Use Client Components only when required for:

* state
* browser APIs
* IndexedDB
* event-heavy interactions
* animations
* interactive study sessions
* Web Workers
* client-side AI/search processing

Do not make the entire application a Client Component.

---

## 11.2 Separate Responsibilities

Maintain clear boundaries between:

* UI
* domain logic
* database
* AI services
* search
* ingestion
* scheduling
* analytics

Business logic should not be buried inside visual components.

---

## 11.3 Reusable Components

Components should be reusable when they represent meaningful UI or behavior.

Avoid:

* giant monolithic pages
* duplicated primitives
* unnecessary component fragmentation

Do not turn every `<div>` into a component.

---

# 12. RECOMMENDED PROJECT STRUCTURE

The exact structure may evolve, but a reasonable starting point is:

```text
app/
  layout.tsx
  page.tsx
  globals.css

  dashboard/
  courses/
  study/
  analytics/
  settings/

components/
  ui/
  layout/
  shared/
  features/

lib/
  ai/
  db/
  fsrs/
  ingestion/
  search/
  validation/
  utils/

hooks/

workers/

types/

public/

tests/
```

Use feature-oriented organization when it makes the code easier to maintain.

Do not rigidly follow this structure if another structure is demonstrably cleaner.

---

# 13. DESIGN SYSTEM

## 13.1 Visual Direction

The design language is:

**Deep Space Ink**

Characteristics:

* dark-first
* technical
* premium
* focused
* restrained
* readable
* modern
* responsive

The interface should look deliberately designed rather than AI-generated.

---

# 14. COLOR SYSTEM

Use semantic design tokens rather than scattering raw colors through components.

Primary semantic tokens should include concepts such as:

```text
background
foreground
card
card-foreground
popover
popover-foreground
primary
primary-foreground
secondary
secondary-foreground
muted
muted-foreground
accent
accent-foreground
destructive
border
input
ring
```

The base environment should feel like deep near-black/navy rather than pure black.

Potential conceptual base:

```text
Deep Space Ink
≈ #070B14
```

Do not hard-code this everywhere.

Map colors through the theme system.

Accent colors may use restrained violet/cyan relationships where appropriate.

Do not make every element glow.

---

# 15. GLASSMORPHISM

Glass effects are allowed but restrained.

Use:

* subtle borders
* backdrop blur
* transparent surfaces
* layered elevation

Glass should communicate hierarchy.

Do not:

* put glass on everything
* create unreadable translucent text
* use blur purely for decoration
* combine excessive blur with excessive gradients

---

# 16. TYPOGRAPHY

Potential type system:

* Space Grotesk for display/headings
* Inter for body/UI

Typography should be evaluated visually rather than blindly enforced.

Use strong hierarchy:

* display
* page title
* section heading
* body
* label
* metadata

Avoid excessive font weights.

Do not make every heading enormous.

---

# 17. ICONOGRAPHY

Use Lucide React for application icons.

Do not:

* manually create SVG icons
* paste raw SVG icon blocks
* mix unrelated icon libraries unnecessarily

Icons should communicate function clearly.

Icon-only controls must have accessible labels.

---

# 18. COMPONENT LIBRARY SYSTEM

Use the following hierarchy.

### Priority 1

Existing project components.

### Priority 2

shadcn/ui.

### Priority 3

Base UI / Radix UI / React Aria.

### Priority 4

Compatible free/open-source shadcn registries.

### Priority 5

React Bits.

### Priority 6

Aceternity UI free components.

### Priority 7

Small custom component.

### Priority 8

Complex custom implementation only when genuinely necessary.

Do not recreate common primitives manually.

---

# 19. STANDARD COMPONENTS

Prefer existing components for:

* Button
* Input
* Textarea
* Select
* Combobox
* Dialog
* Drawer
* Sheet
* Dropdown Menu
* Tooltip
* Popover
* Tabs
* Accordion
* Command
* Calendar
* Date Picker
* Alert
* Alert Dialog
* Badge
* Avatar
* Card
* Table
* Pagination
* Progress
* Skeleton
* Toast

Do not install an entire UI framework merely to obtain one component.

---

# 20. CREATIVE COMPONENTS

Free/open-source sources may be used for visually complex components.

Useful categories include:

### React Bits

Good for:

* animated text
* creative backgrounds
* magnetic effects
* animated cards
* visual effects
* interactive decorative components

### Aceternity UI

Good for:

* hero sections
* spotlight effects
* bento layouts
* timelines
* animated cards
* background effects
* advanced landing-page sections

These are optional.

NoNotes is primarily a study application, so decorative components should not dominate the product.

---

# 21. DEPENDENCY DISCIPLINE

Before adding a dependency:

1. Determine whether the existing stack already solves the problem.
2. Check whether shadcn or an existing component solves it.
3. Check bundle and runtime implications.
4. Prefer mature open-source packages.
5. Avoid duplicate functionality.

Do not install multiple libraries for the same purpose.

Do not invent package names.

Do not invent CLI commands.

Do not claim a component exists without verifying it.

---

# 22. ANIMATION SYSTEM

Use Motion for meaningful animation.

Appropriate uses:

* modal entrances
* drawer transitions
* flashcard flips
* layout transitions
* card expansion
* subtle hover interactions
* press feedback
* page transitions where appropriate
* staggered content reveals
* drag interactions where useful

Do not animate every component.

---

# 23. ANIMATION PRINCIPLES

Animations should be:

* fast
* subtle
* purposeful
* physically coherent
* interruptible where possible

Avoid:

* excessive bouncing
* long transitions
* gratuitous parallax
* infinite distracting animations
* animation that delays interaction

Respect:

```text
prefers-reduced-motion
```

Use CSS transitions for trivial state changes where Motion adds no meaningful benefit.

---

# 24. RESPONSIVE DESIGN

Design mobile-first.

Support:

* small phones
* large phones
* tablets
* laptops
* desktops
* large displays

Do not simply shrink desktop layouts.

Adapt the interaction model.

Examples:

Desktop sidebar:

→ mobile drawer

Dense table:

→ cards/list or horizontally scrollable layout depending on content

Large navigation:

→ compact mobile navigation

Hover interaction:

→ touch-compatible alternative

---

# 25. TOUCH TARGETS

Interactive controls should be usable on touch devices.

Do not make important controls tiny.

Do not require hover to discover critical functionality.

Avoid tiny icon-only buttons unless their meaning is obvious and they have accessible labels.

---

# 26. ACCESSIBILITY

Accessibility is mandatory.

Every interactive feature should support:

* keyboard navigation
* visible focus state
* semantic HTML
* accessible names
* correct ARIA semantics
* logical tab order
* sufficient contrast
* disabled states
* loading states
* error states

Use accessible primitives rather than rebuilding accessibility logic manually.

---

# 27. INTERACTION STATES

Important interactive components should account for:

* default
* hover
* focus
* active
* pressed
* disabled
* loading
* success
* error
* selected
* expanded
* collapsed

Do not leave buttons visually unchanged while asynchronous work is occurring.

---

# 28. LOADING UX

Avoid blank screens.

Use:

* skeletons
* progress indicators
* optimistic UI where safe
* progressive rendering
* Suspense where appropriate

Skeletons should roughly represent the eventual layout.

Do not replace every loading state with a generic spinner.

---

# 29. ERROR UX

Errors must explain what happened.

Avoid useless messages such as:

```text
Something went wrong.
```

unless accompanied by useful recovery information.

Provide:

* explanation
* retry where possible
* recovery action
* inline validation
* appropriate global error handling

Handle:

* network failures
* API failures
* malformed AI output
* invalid files
* unsupported formats
* storage failures
* permission failures
* offline state

---

# 30. EMPTY STATES

Collections should have intentional empty states.

A useful empty state may include:

* icon
* concise explanation
* primary action
* secondary action if appropriate

Do not show an unexplained empty rectangle.

---

# 31. FORMS

Use React Hook Form + Zod for complex forms.

Forms should include:

* labels
* validation
* useful error messages
* loading state
* disabled state
* success state where applicable
* keyboard support
* appropriate input types
* autocomplete attributes where appropriate

Never rely exclusively on placeholder text as a label.

---

# 32. NOTIFICATIONS

Use Sonner for transient global notifications.

Appropriate uses:

* successful import
* failed ingestion
* completed generation
* background processing completion
* recoverable API failures

Do not use toasts for information that needs to remain visible.

Use inline messaging for persistent errors.

---

# 33. DATA MODEL

The conceptual domain should eventually include entities such as:

```text
User
Course
Topic
Source
Document
Chunk
Deck
Flashcard
Review
StudySession
Exam
Question
FeynmanAttempt
AnalyticsEvent
```

The exact schema should be designed during the database architecture phase.

Do not prematurely over-normalize the database.

Do not create fields that have no current product purpose.

---

# 34. LOCAL DATABASE

Dexie over IndexedDB should be the primary client-side persistence mechanism where local-first storage is appropriate.

The database should eventually store:

* courses
* topics
* sources
* documents
* decks
* cards
* reviews
* scheduling state
* study sessions
* user preferences
* relevant local search data

Use database versioning/migrations.

Never casually destroy user data during schema changes.

---

# 35. FSRS

NoNotes should use FSRS for spaced repetition scheduling.

The scheduler should run locally.

Core concepts include:

* card state
* due date
* stability
* difficulty
* interval
* review history
* rating

The implementation should be isolated from UI code.

For example:

```text
lib/fsrs/
```

The scheduling engine must be unit tested thoroughly.

Do not bury scheduling mathematics inside React components.

---

# 36. STUDY SESSION

The study session is one of the most important product surfaces.

It should prioritize:

* focus
* readability
* rapid interaction
* retrieval
* minimal distraction

A flashcard interaction may include:

1. Prompt
2. Student recall
3. Reveal answer
4. Self-assessment/rating
5. FSRS scheduling
6. Next card

Avoid unnecessary navigation during a study session.

---

# 37. FLASHCARD UX

Flashcards should eventually support:

* front
* back
* reveal
* keyboard shortcuts where useful
* touch interaction
* FSRS rating
* progress
* due count
* session state

A card flip animation may use Motion.

Do not make the animation so elaborate that it slows down studying.

---

# 38. EXAM MODE

Exam Mode should feel different from ordinary flashcard review.

It should prioritize:

* focused questions
* answer submission
* marking/evaluation
* progress
* performance

Potential future functionality:

* timed exams
* question pools
* multiple choice
* short answer
* generated exam questions
* review of mistakes

Do not implement all variants at once.

---

# 39. FEYNMAN MODE

Feynman Mode allows the student to explain a concept in their own words.

Workflow:

1. Select concept/topic.
2. Prompt student to explain it simply.
3. Student writes explanation.
4. NoNotes evaluates it against relevant source material.
5. Return structured feedback.
6. Identify missing or incorrect concepts.
7. Allow retry.

The evaluation should prioritize understanding rather than superficial keyword matching.

---

# 40. AI ARCHITECTURE

AI functionality must be isolated behind a service abstraction.

Do not scatter provider-specific API calls throughout UI components.

Potential architecture:

```text
lib/ai/
  provider.ts
  gemini.ts
  groq.ts
  schemas.ts
  prompts/
```

The exact structure may differ.

The rest of the application should interact with an abstract AI service rather than directly depending on Gemini.

---

# 41. AI PROVIDERS

Initial preferred provider:

Google Gemini through:

```text
@google/genai
```

Potential additional provider:

Groq.

The system should make it possible to add or replace providers without rewriting the application.

---

# 42. AI OUTPUT VALIDATION

Never blindly trust model output.

AI-generated structured data must be validated.

Use Zod schemas where appropriate.

If an AI response is malformed:

1. Detect it.
2. Attempt safe recovery where appropriate.
3. Retry only when justified.
4. Surface a useful error when recovery fails.

Never allow malformed model output to silently corrupt application data.

---

# 43. AI PROMPT ARCHITECTURE

Prompts should be:

* versionable
* isolated from UI
* understandable
* testable
* specific about output schemas
* resistant to unnecessary verbosity

Avoid putting giant prompt strings inside React components.

---

# 44. API KEY HANDLING

Never hard-code API keys into source code.

Never commit secrets.

If users supply their own API keys, handle them deliberately.

The exact security architecture must be decided before implementing user-facing key management.

Do not expose server-side secrets to client code.

---

# 45. DOCUMENT INGESTION

Eventually support:

* PDF
* Markdown
* plain text
* URLs

The ingestion pipeline should conceptually be:

```text
INPUT
 ↓
VALIDATE
 ↓
EXTRACT
 ↓
NORMALIZE
 ↓
CHUNK
 ↓
STORE
 ↓
OPTIONALLY EMBED
 ↓
GENERATE STUDY MATERIAL
```

Each stage should have clear responsibilities.

---

# 46. PDF PROCESSING

PDF processing should:

* validate file type
* validate reasonable size limits
* extract text
* preserve useful structure where possible
* handle malformed documents gracefully
* report failures clearly

Large document processing should avoid blocking the main UI thread.

---

# 47. TEXT CHUNKING

Chunking should preserve semantic coherence.

Avoid arbitrary splitting that destroys meaning.

Chunking parameters should be configurable internally if necessary.

Chunk metadata should retain source relationships.

---

# 48. URL INGESTION

URL ingestion should not rely permanently on a single external proxy.

Architecture should support resilient strategies.

Potential issues to handle:

* CORS
* blocked sites
* dynamic pages
* inaccessible content
* invalid URLs
* network failure
* rate limits

Never pretend an inaccessible URL was successfully imported.

---

# 49. LOCAL EMBEDDINGS

Semantic search may use Transformers.js.

Embedding computation should occur in a Web Worker where practical.

Do not block the main UI thread with expensive model inference.

The system should handle model download failures.

---

# 50. EMBEDDING FALLBACK

If the embedding model cannot be loaded because of:

* network failure
* unavailable model
* browser limitations
* storage limitations
* unsupported environment

the application should have a graceful fallback where practical.

Potential fallback:

* TF-IDF
* hashing-based representation
* BM25-only search

Do not make semantic embeddings a single point of failure for the entire application.

---

# 51. SEARCH

NoNotes should eventually support hybrid search.

Components:

### Keyword search

BM25 or equivalent.

### Semantic search

Vector similarity.

### Hybrid ranking

Combine signals where beneficial.

Search should remain useful even when semantic embedding is unavailable.

---

# 52. WEB WORKERS

Use Web Workers for computationally expensive browser operations such as:

* embeddings
* vector indexing
* large document processing
* other CPU-heavy work

Worker communication should be typed and robust.

Handle:

* worker initialization
* progress
* errors
* cancellation where appropriate
* completion

---

# 53. SEARCH UX

Search should eventually provide:

* fast results
* useful ranking
* highlighted matches where appropriate
* source context
* empty state
* loading state
* error state

Search should not become a generic global command palette unless that is deliberately designed.

---

# 54. DASHBOARD

The dashboard should answer:

* What should I study?
* What is due?
* What am I currently learning?
* How am I progressing?
* Where are my weak areas?

It should not simply be a collection of decorative statistics.

Prioritize actionable information.

---

# 55. COURSE STRUCTURE

A course/subject should organize study material.

Conceptual hierarchy:

```text
Course
 ├── Topics
 │    ├── Sources
 │    ├── Decks
 │    └── Study material
 └── Analytics
```

The exact hierarchy may evolve.

---

# 56. ANALYTICS

Analytics should provide useful information such as:

* cards reviewed
* retention
* due reviews
* topic mastery
* study history
* weak areas
* performance trends

Avoid vanity metrics.

Do not create graphs merely because dashboards look better with graphs.

---

# 57. PRIVACY

NoNotes should minimize unnecessary external data transmission.

Local-first processing should be used where practical.

The application should clearly distinguish:

* local processing
* remote AI processing
* stored local data
* user-provided API credentials

Do not silently send user study material to external services.

---

# 58. PWA

The architecture should eventually support PWA behavior.

Potential requirements:

* web manifest
* installability
* icons
* offline-aware UX
* local data
* service worker
* caching
* safe-area handling
* mobile viewport behavior

Do not implement elaborate offline synchronization before the core application works.

---

# 59. PERFORMANCE

Performance requirements:

* fast initial UI
* minimal unnecessary JavaScript
* Server Components where appropriate
* lazy loading
* efficient client state
* efficient IndexedDB access
* worker-based heavy computation
* optimized images
* minimal dependencies

Avoid:

* unnecessary global state
* huge client bundles
* unnecessary rerenders
* loading heavy libraries for tiny features

---

# 60. SECURITY

Never:

* expose secrets
* hard-code API keys
* trust arbitrary user input
* inject unsanitized HTML
* blindly execute remote content

Validate external data.

Treat:

* uploaded files
* URLs
* AI output
* imported data

as untrusted input.

---

# 61. TESTING

Use Vitest.

Testing should cover domain logic before superficial UI snapshots.

Priority test areas:

1. FSRS scheduling
2. database operations
3. data validation
4. document chunking
5. search
6. AI response parsing
7. study-session logic
8. import/export
9. important utility functions

Use integration tests where behavior crosses boundaries.

---

# 62. TYPE SAFETY

Use strict TypeScript.

Avoid:

```text
any
```

unless genuinely unavoidable.

Do not silence errors simply to make builds pass.

Avoid excessive type assertions.

Prefer explicit domain types.

---

# 63. ERROR BOUNDARIES

Important application regions should have appropriate error handling.

A failure in:

* ingestion
* search
* AI generation
* analytics

should not unnecessarily crash the entire application.

---

# 64. IMPORT / EXPORT

Eventually support local data portability.

Potential formats:

* JSON
* structured backup format

Export should include necessary user data.

Import must validate data before writing it to the database.

Do not overwrite existing user data without explicit confirmation.

---

# 65. SETTINGS

Settings should eventually contain relevant controls such as:

* AI provider configuration
* API key management
* model selection
* key rotation status
* storage information
* import/export
* theme
* preferences

Do not put unrelated configuration into Settings merely because there is empty space.

---

# 66. THEME

Dark mode is the primary visual direction.

Light mode may be supported later.

Theme switching must use semantic design tokens.

Do not duplicate entire component styles for dark/light mode.

---

# 67. UI ANTI-PATTERNS

Do not create:

* endless rounded cards
* generic dashboard grids
* meaningless gradients
* excessive glassmorphism
* glowing text
* huge empty hero sections
* decorative blobs
* random neon accents
* unnecessary badges
* fake statistics
* pointless animations
* excessive shadows
* tiny unreadable metadata
* hover-only functionality
* inaccessible icon buttons

If an element does not improve usability, hierarchy, comprehension, or product identity, question whether it belongs.

---

# 68. AI-GENERATED UI ANTI-PATTERNS

Avoid interfaces that look obviously generated by an AI website builder.

Symptoms include:

* every section in a card
* every card rounded identically
* purple-blue gradient everywhere
* arbitrary floating elements
* excessive glass
* giant headings
* meaningless "AI-powered" labels
* decorative metrics
* unnecessary pill badges
* random icon usage
* identical three-column layouts

NoNotes should feel like a coherent product.

---

# 69. CONTENT DESIGN

Interface copy should be:

* concise
* useful
* direct
* understandable

Avoid unnecessary marketing language inside the application.

Do not use:

* "Supercharge your learning journey"
* "Unlock your potential"
* "Revolutionize your study workflow"

Prefer direct language:

* "Due today"
* "Start review"
* "Import material"
* "Generate cards"
* "Explain this concept"

---

# 70. MOBILE STUDY EXPERIENCE

Mobile study should be a first-class experience.

Important study controls should be reachable without awkward hand positioning.

Flashcards should be readable.

Buttons should be touch-friendly.

Keyboard shortcuts are useful on desktop but must never be the only interaction method.

---

# 71. DESKTOP STUDY EXPERIENCE

Desktop should make effective use of available space without becoming cluttered.

Potential layout:

* navigation
* contextual content
* study workspace
* progress/context information

Do not add side panels merely because desktop has space.

---

# 72. DRAG AND DROP

Where drag-and-drop is used:

* provide a normal file picker alternative
* show drag state
* handle invalid files
* show upload/process state
* handle cancellation
* handle failure

Never make drag-and-drop the only ingestion mechanism.

---

# 73. ACCESSIBLE FILE INPUTS

File uploads must include:

* accepted formats
* useful errors
* progress
* disabled state
* cancellation where possible

Do not silently reject unsupported files.

---

# 74. STATE MANAGEMENT

Do not introduce a global state library automatically.

Use:

* React state
* URL state
* server state
* IndexedDB
* context

where appropriate.

Only add a dedicated state library if application complexity genuinely requires it.

---

# 75. URL STATE

Use URL state for things that should be:

* shareable
* bookmarkable
* navigable via browser history

Examples:

* selected course
* selected topic
* search query
* filters
* view mode

Do not put everything in global state.

---

# 76. ROUTING

Use Next.js App Router.

Routes should reflect meaningful product entities.

Potential structure:

```text
/
 /dashboard
 /courses
 /courses/[courseId]
 /courses/[courseId]/topics/[topicId]
 /study
 /study/[deckId]
 /exam
 /feynman
 /search
 /analytics
 /settings
```

The exact routing structure should evolve with the actual UX.

---

# 77. NAVIGATION

Navigation should make current location obvious.

Potential application shell:

* desktop sidebar
* mobile drawer
* top-level navigation
* contextual breadcrumbs where useful

Do not create deep navigation hierarchies without reason.

---

# 78. COMMAND PALETTE

A command palette may eventually provide:

* navigation
* search
* actions
* quick study
* course switching
* settings

Potential keyboard shortcut:

```text
Cmd/Ctrl + K
```

Do not implement it until it provides meaningful value.

---

# 79. KEYBOARD SHORTCUTS

Useful shortcuts may eventually include:

* reveal answer
* next card
* previous card
* rate card
* open search
* open command palette

Shortcuts must never replace accessible UI controls.

Provide discoverability where appropriate.

---

# 80. STUDY SESSION PERFORMANCE

Study sessions should avoid unnecessary network requests.

Card progression and scheduling should feel immediate.

Where safe:

* update local state optimistically
* persist locally
* synchronize later if remote functionality exists

Do not make the user wait for a server response just to move to the next card if the operation can safely be local.

---

# 81. OFFLINE BEHAVIOR

Local study functionality should continue to work when possible.

At minimum, the application should gracefully handle:

* offline state
* failed API calls
* unavailable embedding model
* unavailable external content

Do not pretend remote functionality succeeded while offline.

---

# 82. AI FAILURE HANDLING

AI can fail because of:

* rate limits
* malformed output
* provider outage
* network failure
* quota exhaustion
* invalid credentials
* model availability

The UI should provide understandable feedback.

Where appropriate:

* retry
* fallback provider
* fallback model
* local fallback

Do not endlessly retry failed requests.

---

# 83. API ABSTRACTION

A provider should not leak deeply into domain logic.

Bad:

```text
FlashcardComponent → Gemini API
```

Better:

```text
FlashcardComponent
        ↓
Generation Service
        ↓
AI Provider
        ↓
Gemini / Groq / other
```

---

# 84. DATA VALIDATION

Validate data at boundaries:

* form submission
* API responses
* AI output
* import
* URL ingestion
* database writes where appropriate

Do not assume external data is correct.

---

# 85. OBSERVABILITY

During development, errors should be diagnosable.

Use:

* useful console errors during development
* structured error messages
* meaningful error boundaries
* clear operation names

Do not spam the console with meaningless logs.

Remove temporary debugging logs before considering a feature complete.

---

# 86. DEVELOPMENT WORKFLOW

Every implementation phase should follow:

```text
READ
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
TYPECHECK
 ↓
REVIEW
 ↓
UPDATE ROADMAP
```

Do not skip verification.

---

# 87. PHASE BOUNDARIES

Never implement the entire roadmap in one agent run.

Each phase should be:

* independently understandable
* reasonably bounded
* testable
* reviewable
* recoverable

If a phase becomes too large, split it into sub-phases.

---

# 88. AGENT BEHAVIOR

When Freebuff is instructed to implement a phase:

1. Read this specification.
2. Read `ROADMAP.md`.
3. Read `DECISIONS.md`.
4. Inspect the current implementation.
5. Determine exactly what the current phase requires.
6. Implement only that scope.
7. Test the changes.
8. Typecheck.
9. Fix issues introduced by the work.
10. Update `ROADMAP.md`.
11. Report what was completed.

Do not:

* silently change architecture
* start future phases
* rewrite unrelated systems
* install unnecessary dependencies
* fabricate APIs
* fabricate components
* leave known errors unresolved

---

# 89. WHEN TO CREATE A CUSTOM COMPONENT

Create a custom component when:

* the UI is genuinely product-specific
* existing primitives cannot express the required behavior cleanly
* customization would otherwise become more complicated than a small implementation

Reuse primitives for accessibility and behavior where appropriate.

---

# 90. WHEN TO USE A REGISTRY COMPONENT

Use a registry component when:

* it provides a substantial visual/interaction benefit
* it is compatible with the architecture
* it is free/open-source
* it does not introduce unnecessary dependency complexity

Modify it to fit NoNotes rather than forcing NoNotes around it.

---

# 91. WHEN NOT TO USE ANIMATION

Do not use Motion merely because Motion is available.

Avoid animation when:

* it delays an important action
* it makes text harder to read
* it distracts during study
* it increases CPU usage without benefit
* it conflicts with reduced-motion preferences

---

# 92. PERFORMANCE BUDGET MINDSET

Every dependency and visual effect has a cost.

Ask:

* Does this improve the product?
* Does it increase bundle size?
* Does it run on the main thread?
* Does it affect mobile performance?
* Does it make development harder?
* Is there a simpler solution?

Choose the simplest solution that meets the requirement.

---

# 93. PRODUCT QUALITY BAR

A feature is not complete merely because the happy path works.

A completed feature should consider:

* happy path
* loading
* error
* empty state
* mobile
* keyboard
* accessibility
* persistence
* performance
* invalid input
* recovery

---

# 94. DEFINITION OF DONE

A feature is considered complete when:

* functionality works
* relevant UI is responsive
* loading states exist where necessary
* errors are handled
* empty states are handled
* accessibility is reasonable
* TypeScript passes
* relevant tests pass
* no obvious console errors remain
* existing functionality has not been unnecessarily broken
* architecture remains understandable
* `ROADMAP.md` accurately reflects completion

---

# 95. MVP PRIORITY

The first usable NoNotes version should prioritize:

1. Application foundation
2. Courses
3. Topics
4. Decks
5. Flashcards
6. Study sessions
7. FSRS
8. Local persistence

Then:

9. PDF/text ingestion
10. AI generation
11. Feynman evaluation
12. Search
13. Analytics
14. PWA
15. advanced polish

Do not build every possible feature before a basic study loop works.

---

# 96. CORE LOOP PRIORITY

The most important product milestone is:

```text
Create course
 ↓
Create/import material
 ↓
Create deck
 ↓
Study cards
 ↓
Rate cards
 ↓
FSRS schedules next review
 ↓
Return later
 ↓
Review due cards
```

If this loop is excellent, the product has a foundation.

Everything else is secondary.

---

# 97. FUTURE EXTENSIBILITY

The architecture should leave room for:

* multiple AI providers
* cloud synchronization
* authentication
* collaboration
* richer analytics
* mobile wrappers
* additional document types
* richer exam modes
* advanced search
* user-defined study workflows

Do not build these systems prematurely.

Design clean boundaries so they can be added later.

---

# 98. WHAT NOT TO BUILD PREMATURELY

Do not prematurely implement:

* social feeds
* leaderboards
* complex gamification
* collaboration
* elaborate cloud sync
* unnecessary microservices
* custom backend infrastructure
* complicated authentication
* enterprise permissions
* elaborate onboarding
* dozens of themes

The core learning experience comes first.

---

# 99. FUTURE GAMIFICATION

Potential future features:

* streaks
* XP
* achievements
* milestones
* study goals
* completion celebrations

These should reinforce actual studying.

They should not reward meaningless clicking.

---

# 100. FUTURE CLOUD ARCHITECTURE

Cloud synchronization may eventually be introduced.

If implemented, the architecture should distinguish:

```text
LOCAL SOURCE OF TRUTH
        <->
SYNC LAYER
        <->
REMOTE DATABASE
```

Do not assume cloud synchronization is required for MVP.

---

# 101. IMPORT / EXPORT PHILOSOPHY

User study data should not be trapped inside NoNotes.

Where practical, users should be able to export their data.

This is important for:

* backups
* migration
* trust
* experimentation

---

# 102. NO VENDOR LOCK-IN WHERE UNNECESSARY

Prefer open formats and open-source libraries where practical.

Avoid designing the entire product around one proprietary service when an abstraction can prevent unnecessary lock-in.

---

# 103. DESIGN REVIEW QUESTIONS

Before finalizing a UI feature, evaluate:

1. Is the primary action obvious?
2. Is the information hierarchy clear?
3. Is there unnecessary decoration?
4. Does it work on mobile?
5. Does it work with keyboard?
6. Are loading/error/empty states handled?
7. Does it fit the Deep Space Ink system?
8. Does it look consistent with adjacent screens?
9. Does animation improve the interaction?
10. Would removing an element make the interface better?

---

# 104. ENGINEERING REVIEW QUESTIONS

Before finalizing code, evaluate:

1. Is the component in the right layer?
2. Is business logic separated from UI?
3. Is there duplicated functionality?
4. Is the dependency necessary?
5. Is the code typed?
6. Are errors handled?
7. Is the code testable?
8. Is the browser main thread being blocked?
9. Does this introduce unnecessary client-side code?
10. Does this make future phases harder?

---

# 105. FINAL PRINCIPLE

NoNotes should not be optimized for maximum feature count.

It should be optimized for maximum usefulness per unit of complexity.

The ideal implementation is:

**simple underneath, polished on top, fast in use, reliable under failure, and genuinely useful for studying.**

The product should feel like a serious tool built by people who understand learning, software engineering, and interface design.

Do not build bullshit.

Build the smallest system that makes the core learning loop excellent, then expand it carefully.
