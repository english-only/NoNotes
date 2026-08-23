import Dexie, { type Table } from "dexie";

import { createInitialState } from "@/lib/fsrs/scheduler";
import type {
  Chunk,
  Course,
  Deck,
  FeynmanAttempt,
  Flashcard,
  FsrsState,
  ReviewLog,
  Source,
  Topic,
} from "@/lib/db/schema";

export class NoNotesDatabase extends Dexie {
  courses!: Table<Course, string>;
  topics!: Table<Topic, string>;
  decks!: Table<Deck, string>;
  flashcards!: Table<Flashcard, string>;
  reviewLogs!: Table<ReviewLog, string>;
  sources!: Table<Source, string>;
  chunks!: Table<Chunk, string>;
  feynmanAttempts!: Table<FeynmanAttempt, string>;

  constructor(name = "nonotes") {
    super(name);

    this.version(1).stores({
      courses: "id, updatedAt",
      topics: "id, courseId, updatedAt",
      decks: "id, courseId, topicId, updatedAt",
      flashcards: "id, deckId, dueAt, updatedAt",
      reviewLogs: "id, flashcardId, reviewedAt",
    });

    this.version(2)
      .stores({
        courses: "id, updatedAt",
        topics: "id, courseId, updatedAt",
        decks: "id, courseId, topicId, updatedAt",
        flashcards: "id, deckId, dueAt, [deckId+dueAt], updatedAt",
        reviewLogs: "id, flashcardId, reviewedAt",
      })
      .upgrade(async (tx) => {
        // v1 flashcards carry no scheduler state. Backfill a default new-card
        // state due at the card's existing dueAt so pre-migration cards stay
        // due immediately and enter the review queue as before.
        const now = Date.now();
        await tx
          .table<Flashcard & { fsrs?: FsrsState }, string>("flashcards")
          .toCollection()
          .modify((card) => {
            if (!card.fsrs) {
              card.fsrs = createInitialState(card.dueAt ?? now);
            }
          });
      });

    this.version(3)
      .stores({
        courses: "id, updatedAt",
        topics: "id, courseId, updatedAt",
        decks: "id, courseId, topicId, updatedAt",
        flashcards: "id, deckId, dueAt, [deckId+dueAt], updatedAt",
        reviewLogs: "id, flashcardId, reviewedAt",
        sources: "id, courseId, topicId, createdAt",
        chunks: "id, sourceId, [sourceId+ordinal]",
      })
      .upgrade(async () => {
        // v3 adds sources and chunks. No data to backfill — existing decks
        // and cards are unaffected.
      });

    this.version(4)
      .stores({
        courses: "id, updatedAt",
        topics: "id, courseId, updatedAt",
        decks: "id, courseId, topicId, updatedAt",
        flashcards: "id, deckId, dueAt, [deckId+dueAt], updatedAt",
        reviewLogs: "id, flashcardId, reviewedAt",
        sources: "id, courseId, topicId, createdAt",
        chunks: "id, sourceId, [sourceId+ordinal]",
        feynmanAttempts: "id, courseId, deckId, createdAt",
      })
      .upgrade(async () => {
        // v4 adds feynmanAttempts. No data to backfill.
      });
  }
}

export const db = new NoNotesDatabase();

// Expose the Dexie instance on `window` so Playwright test helpers can use
// the app's own connection instead of opening conflicting raw-IDB handles.
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__nonotes_db__ = db;
}
