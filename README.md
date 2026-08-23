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
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey)) — only needed for AI features (generation, Feynman evaluation)

### Quick Start (first run)

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
open http://localhost:3000
```

You will be redirected to `/dashboard`. From there:

1. **Create a course** — click "Create your first course", give it a title
2. **Create a topic** — open the course, click "Add topic"
3. **Add a source** — click "Add source", paste some text or upload a file
4. **Create a deck** — assign it to a topic (optional)
5. **Add flashcards** — create them manually, or generate them from a source using AI
6. **Study** — go to `/study`, pick a deck, and review cards

All your data lives in your browser's IndexedDB — nothing leaves your machine except AI prompts sent to Google's Gemini API when you use generation or Feynman evaluation.

### API Key Setup (for AI features)

The app works without an API key for manual study, ingestion, search, and analytics. You only need a key if you want to use AI generation or Feynman evaluation:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the app and go to **Settings** (sidebar or mobile nav)
3. Paste your key in the "API Key" field and click **Save**
4. The key is stored in `localStorage` — it is **never** exported, **never** included in backups, and only sent to Google's Gemini API
5. Click the eye icon to show/hide the key

### Production Build

```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### All Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run 268 unit/integration tests (Vitest) |
| `npm run test:e2e` | Run 129 Playwright browser tests |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint` | ESLint |

### Running Tests

```bash
# Unit + integration tests (Vitest with fake-indexeddb — no browser needed)
npm test

# Browser end-to-end tests (Playwright — requires Chromium)
npx playwright install chromium
npm run test:e2e
```

Tests use mocked AI providers — no live Gemini API key required. The browser tests launch a full Chromium instance and exercise the real UI against a temporary Next.js dev server.

### Troubleshooting

**"API key not configured" when using generation or Feynman**
→ Go to Settings and paste your Gemini API key. The key is saved per-browser, so you'll need to set it again if you clear browser data.

**PDF upload doesn't extract text**
→ Scanned or image-only PDFs have no extractable text — OCR is not included. Try a text-based PDF.

**URL ingestion fails**
→ The URL extractor blocks private/internal addresses (localhost, 192.168.x, 10.x). Ensure you're using a publicly accessible HTTP/HTTPS URL. The dev server must be running (the extraction happens server-side).

**Cards don't appear in study**
→ Only due cards appear — FSRS schedules cards into the future based on your ratings. New cards are immediately due. If you've already reviewed all cards, try creating more or wait for existing cards to become due.

**Build fails or dependencies won't install**
→ Ensure you're on Node.js 20+. Run `rm -rf node_modules package-lock.json && npm install` for a clean reinstall.

**Browser tests fail**
→ Run `npx playwright install chromium` first. The tests use port 3800 (configured in `playwright.config.ts`). Kill any process on that port before running: `pkill -f "next dev"`.

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