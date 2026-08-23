import { db } from "@/lib/db/client";
import type {
  Chunk,
  Course,
  Deck,
  FeynmanAttempt,
  Flashcard,
  ReviewLog,
  Source,
  Topic,
} from "@/lib/db/schema";

/** Version of the export schema. Used for forward/backward compatibility. */
export const EXPORT_SCHEMA_VERSION = 1;

/** The application version from package.json. */
export const APP_VERSION = "0.1.0";

export type NoNotesExport = {
  /** Export schema version for import compatibility. */
  schemaVersion: number;
  /** Application version at time of export. */
  appVersion: string;
  /** ISO timestamp of when the export was created. */
  exportedAt: string;
  /** All courses. */
  courses: Course[];
  /** All topics. */
  topics: Topic[];
  /** All decks. */
  decks: Deck[];
  /** All flashcards with full FSRS state. */
  flashcards: Flashcard[];
  /** All review logs. */
  reviewLogs: ReviewLog[];
  /** All ingested sources. */
  sources: Source[];
  /** All content chunks. */
  chunks: Chunk[];
  /** All Feynman attempts. */
  feynmanAttempts: FeynmanAttempt[];
};

/**
 * Export all user data as a portable JSON object.
 *
 * API keys are NEVER exported — they belong to the user's browser, not
 * the data file. This is intentional: the export should be safe to share
 * or back up without leaking secrets.
 */
export async function exportAllData(): Promise<NoNotesExport> {
  const [courses, topics, decks, flashcards, reviewLogs, sources, chunks, feynmanAttempts] =
    await Promise.all([
      db.courses.toArray(),
      db.topics.toArray(),
      db.decks.toArray(),
      db.flashcards.toArray(),
      db.reviewLogs.toArray(),
      db.sources.toArray(),
      db.chunks.toArray(),
      db.feynmanAttempts.toArray(),
    ]);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    courses,
    topics,
    decks,
    flashcards,
    reviewLogs,
    sources,
    chunks,
    feynmanAttempts,
  };
}

/**
 * Trigger a browser download of the exported JSON file.
 * Safe to call from any client component.
 */
export function downloadExport(data: NoNotesExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `nonotes-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
