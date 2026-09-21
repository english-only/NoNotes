# NoNotes

A **local-first study application** built around active recall and spaced repetition: Gemini-powered flashcard generation from your own material, FSRS scheduling, Feynman evaluation, global search, analytics, and offline PWA support. Your data never leaves your browser.

## Features

- **PDF & URL ingestion** — parallel text extraction with live progress; everything chunked and stored locally in IndexedDB
- **AI flashcard generation** — map-reduce generation over the *full* source (no truncation), zod-validated output, works with user-supplied Gemini keys or any OpenAI-compatible endpoint
- **FSRS spaced repetition** — the modern scheduler, with golden-pinned outputs
- **Feynman evaluation** — explain a topic, get scored feedback
- **Global search, analytics, data export/import** — all client-side
- **Offline PWA** — install and study without a connection

## Quick start

```bash
npm install
npm run dev          # Next.js dev server → http://localhost:3000
```

Then open Settings and add your Gemini API key (stored only in your browser's localStorage).

## Scripts

```bash
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run test         # vitest (378 tests)
npm run test:coverage # coverage ratchet on lib/** + app/_components
npm run test:e2e     # playwright (131 tests)
npm run lint         # eslint (app components lib)
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Dexie (IndexedDB) · @google/genai · ts-fsrs · Tailwind CSS 4 · shadcn-style UI · Vitest + Playwright

## Architecture in one paragraph

Everything runs in the browser: sources are chunked into IndexedDB, generation map-reduces batches against the AI provider directly from the client, FSRS drives scheduling, and a single server route (`/api/extract-url`) exists only as an SSRF-guarded, rate-limited URL-to-text proxy. See `AGENTS.md` for the engineering rules the codebase follows.

## Agent harness (ECC subset)

This repository carries a curated subset of the **ECC (Everything Claude Code)** agent harness used for development: `agents/` (68 agent checklists), `skills/` (286 skills), `rules/`, `hooks/`, and the `.claude/skills/` auto-load mirror. `AGENTS.md` documents how agents should operate in this codebase. These directories are development tooling — the application itself (`app/`, `lib/`, `components/`) has no dependency on them.

## License

MIT.
