# NoNotes

**A focused workspace for turning study material into lasting recall.**

NoNotes is a local-first study application built around active recall and spaced repetition. It ingests your learning material, helps you generate structured flashcards, schedules reviews using FSRS, and evaluates your understanding through the Feynman technique.

## Core Product Loop

```
Ingest → Process → Generate → Study → Schedule → Evaluate → Review
```

| Stage | What it does |
|---|---|
| **Ingest** | Import study material: text, Markdown, PDF, or URL |
| **Process** | Clean, normalize, and chunk content into reusable segments |
| **Generate** | AI creates flashcards grounded in your source material |
| **Study** | Active recall with keyboard-optimized card review |
| **Schedule** | FSRS schedules future reviews based on your ratings |
| **Evaluate** | Explain concepts in your own words; receive structured AI feedback |
| **Review** | Analytics identify weak areas and track progress |

## Current Features

### Ingestion
- **Text** — paste or type directly
- **Markdown** — preserves structure while stripping formatting for clean chunks
- **PDF** — client-side text extraction via pdfjs-dist (10 MB limit)
- **URL** — server-side HTML extraction with SSRF protection

### AI Generation
- Gemini-powered flashcard generation from source chunks
- Review → edit → reject → accept workflow before cards are persisted
- `sourceChunkIds` provenance preserved end-to-end

### Study & Scheduling
- Due-card queue: study only what's scheduled
- Keyboard shortcuts: <kbd>Space</kbd>/<kbd>Enter</kbd> reveal, <kbd>1</kbd>–<kbd>4</kbd> rate
- FSRS (Free Spaced Repetition Scheduler) via ts-fsrs 5.4.1
- Atomic review persistence (card state + review log in one transaction)

### Feynman Evaluation
- Select a concept, explain it in your own words
- AI evaluates your explanation against source material
- Structured feedback: scores, misconceptions, missing concepts, corrections
- Attempt history with grading and weak-area tracking

### Search
- Global command palette (<kbd>⌘</kbd><kbd>K</kbd> / <kbd>Ctrl</kbd><kbd>K</kbd>)
- BM25-style TF-IDF ranking across courses, topics, decks, flashcards, sources, and chunks
- Keyboard navigation, result type badges, instant index refresh

### Analytics
- Real metrics from review history: due counts, rating distribution, deck breakdown
- "Needs attention" section highlighting weak decks and cards repeatedly missed

### PWA & Offline
- Web manifest with SVG icons — installable as a standalone app
- Service worker caches the app shell for offline navigation
- All study data lives in IndexedDB — works without network
- AI features fail gracefully when offline

### Import / Export
- Full JSON export of all user data (8 tables + version metadata)
- Import with preview, merge/replace modes, and transactional commit
- API keys are **never** exported

### Settings
- API key management (localStorage, show/hide, clear)
- Per-table storage information
- Destructive data reset with confirmation
- Import/export controls

## Architecture

- **Local-first**: all persistent data in IndexedDB via Dexie
- **No cloud backend**: no accounts, no servers, no tracking
- **AI through abstraction**: provider-specific code in `lib/ai/`, swappable
- **Strict TypeScript**: full type coverage, Zod validation for all AI output
- **Next.js 16 App Router**: server components where possible, client components where necessary

## Getting Started

### Prerequisites
- Node.js 20+
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit/integration tests (Vitest) |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

### API Key Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the app and go to **Settings**
3. Paste your key in the API Key field and click **Save**
4. The key is stored in `localStorage` (never exported, never sent to any server except Google's Gemini API)

### Running Tests

```bash
# Unit + integration tests (Vitest with fake-indexeddb)
npm test

# Browser end-to-end tests (Playwright)
npm run test:e2e
```

Tests use mocked AI providers — no live Gemini calls required.

## Known Limitations

- **Semantic search** is deferred (BM25 keyword search is the current baseline)
- **Exam Mode** is deferred (spec marks it as "potential future functionality")
- **Additional AI providers** (Groq) are not yet implemented — the provider abstraction exists for future drop-in
- **Topic-detail route** (`/courses/[courseId]/topics/[topicId]`) is deferred
- **Scanned/image-only PDFs** return empty text — OCR is not included
- **URL ingestion** requires the dev server (API route) — does not work from a static export

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Database | Dexie 4 (IndexedDB) |
| FSRS | ts-fsrs 5.4.1 |
| AI | Google Gemini (`@google/genai`) |
| Validation | Zod 4 |
| Testing | Vitest, Playwright, fake-indexeddb |
| PDF | pdfjs-dist |

## License

Private — not yet licensed for redistribution.