import { db } from "@/lib/db/client";
import { EXPORT_SCHEMA_VERSION } from "@/lib/data-export";
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

/** All Dexie tables as an array for use with the array-form transaction API. */
const ALL_TABLES = [
  db.courses,
  db.topics,
  db.decks,
  db.flashcards,
  db.reviewLogs,
  db.sources,
  db.chunks,
  db.feynmanAttempts,
] as const;

// ── Types ─────────────────────────────────────────────────────────────

export type ImportMode = "replace" | "merge";

export type ImportValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    courses: number;
    topics: number;
    decks: number;
    flashcards: number;
    reviewLogs: number;
    sources: number;
    chunks: number;
    feynmanAttempts: number;
  };
};

export type ImportResult = {
  success: boolean;
  imported: ImportValidation["summary"];
  errors: string[];
};

// ── Validation ────────────────────────────────────────────────────────

/**
 * Validate an import file without writing anything.
 * Checks schema version, required fields, and referential integrity.
 */
export async function validateImport(
  data: unknown,
): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["File is not a valid JSON object."], warnings: [], summary: { courses: 0, topics: 0, decks: 0, flashcards: 0, reviewLogs: 0, sources: 0, chunks: 0, feynmanAttempts: 0 } };
  }

  const obj = data as Record<string, unknown>;

  // Schema version
  if (typeof obj.schemaVersion !== "number") {
    errors.push("Missing or invalid schemaVersion.");
  } else if (obj.schemaVersion > EXPORT_SCHEMA_VERSION) {
    errors.push(
      `Export schema version (${obj.schemaVersion}) is newer than this app supports (${EXPORT_SCHEMA_VERSION}). Update NoNotes before importing.`,
    );
  } else if (obj.schemaVersion < EXPORT_SCHEMA_VERSION) {
    warnings.push(
      `Export schema version (${obj.schemaVersion}) is older than current (${EXPORT_SCHEMA_VERSION}). Some data may be migrated.`,
    );
  }

  // Required arrays
  const arrayFields = [
    "courses",
    "topics",
    "decks",
    "flashcards",
    "reviewLogs",
    "sources",
    "chunks",
    "feynmanAttempts",
  ] as const;

  const arrays: Record<string, unknown[]> = {};
  for (const field of arrayFields) {
    const val = obj[field];
    if (!Array.isArray(val)) {
      errors.push(`Missing or invalid ${field} array.`);
      arrays[field] = [];
    } else {
      arrays[field] = val;
    }
  }

  // Basic field validation for courses
  for (const c of arrays.courses) {
    if (!c || typeof c !== "object") {
      errors.push("Invalid course entry.");
      continue;
    }
    const course = c as Record<string, unknown>;
    if (typeof course.id !== "string" || !course.id) {
      errors.push("Course missing id.");
    }
    if (typeof course.title !== "string" || !course.title.trim()) {
      errors.push(`Course "${course.id ?? "?"}" missing title.`);
    }
  }

  // Basic field validation for flashcards
  for (const f of arrays.flashcards) {
    if (!f || typeof f !== "object") {
      errors.push("Invalid flashcard entry.");
      continue;
    }
    const card = f as Record<string, unknown>;
    if (typeof card.id !== "string" || !card.id) {
      errors.push("Flashcard missing id.");
    }
    if (typeof card.deckId !== "string" || !card.deckId) {
      errors.push(`Flashcard "${card.id ?? "?"}" missing deckId.`);
    }
  }

  // Basic field validation for reviewLogs
  for (const r of arrays.reviewLogs) {
    if (!r || typeof r !== "object") {
      errors.push("Invalid reviewLog entry.");
      continue;
    }
    const log = r as Record<string, unknown>;
    if (typeof log.flashcardId !== "string") {
      errors.push("ReviewLog missing flashcardId.");
    }
  }

  // Referential integrity: flashcards → decks, topics/sources → courses
  const courseIds = new Set(
    arrays.courses
      .filter((c) => c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string")
      .map((c) => (c as Record<string, unknown>).id as string),
  );
  const deckIds = new Set(
    arrays.decks
      .filter((d) => d && typeof d === "object" && typeof (d as Record<string, unknown>).id === "string")
      .map((d) => (d as Record<string, unknown>).id as string),
  );
  const flashcardIds = new Set(
    arrays.flashcards
      .filter((f) => f && typeof f === "object" && typeof (f as Record<string, unknown>).id === "string")
      .map((f) => (f as Record<string, unknown>).id as string),
  );
  const sourceIds = new Set(
    arrays.sources
      .filter((s) => s && typeof s === "object" && typeof (s as Record<string, unknown>).id === "string")
      .map((s) => (s as Record<string, unknown>).id as string),
  );

  // Topics must reference valid courses
  for (const t of arrays.topics) {
    if (!t || typeof t !== "object") continue;
    const topic = t as Record<string, unknown>;
    if (typeof topic.courseId === "string" && !courseIds.has(topic.courseId)) {
      errors.push(`Topic "${topic.id}" references non-existent course "${topic.courseId}".`);
    }
  }

  // Decks must reference valid courses
  for (const d of arrays.decks) {
    if (!d || typeof d !== "object") continue;
    const deck = d as Record<string, unknown>;
    if (typeof deck.courseId === "string" && !courseIds.has(deck.courseId)) {
      errors.push(`Deck "${deck.id}" references non-existent course "${deck.courseId}".`);
    }
  }

  // Flashcards must reference valid decks
  for (const f of arrays.flashcards) {
    if (!f || typeof f !== "object") continue;
    const card = f as Record<string, unknown>;
    if (typeof card.deckId === "string" && !deckIds.has(card.deckId)) {
      errors.push(`Flashcard "${card.id}" references non-existent deck "${card.deckId}".`);
    }
  }

  // ReviewLogs must reference valid flashcards
  for (const r of arrays.reviewLogs) {
    if (!r || typeof r !== "object") continue;
    const log = r as Record<string, unknown>;
    if (typeof log.flashcardId === "string" && !flashcardIds.has(log.flashcardId)) {
      errors.push(`ReviewLog references non-existent flashcard "${log.flashcardId}".`);
    }
  }

  // Sources must reference valid courses
  for (const s of arrays.sources) {
    if (!s || typeof s !== "object") continue;
    const source = s as Record<string, unknown>;
    if (typeof source.courseId === "string" && !courseIds.has(source.courseId)) {
      errors.push(`Source "${source.id}" references non-existent course "${source.courseId}".`);
    }
  }

  // Chunks must reference valid sources
  for (const c of arrays.chunks) {
    if (!c || typeof c !== "object") continue;
    const chunk = c as Record<string, unknown>;
    if (typeof chunk.sourceId === "string" && !sourceIds.has(chunk.sourceId)) {
      errors.push(`Chunk "${chunk.id}" references non-existent source "${chunk.sourceId}".`);
    }
  }

  const summary = {
    courses: arrays.courses.length,
    topics: arrays.topics.length,
    decks: arrays.decks.length,
    flashcards: arrays.flashcards.length,
    reviewLogs: arrays.reviewLogs.length,
    sources: arrays.sources.length,
    chunks: arrays.chunks.length,
    feynmanAttempts: arrays.feynmanAttempts.length,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

// ── Import ────────────────────────────────────────────────────────────

/**
 * Import data into the database.
 *
 * - "replace": clears all existing data first, then writes the import.
 * - "merge": adds import data alongside existing data (skips duplicates by id).
 *
 * The entire write is wrapped in a Dexie transaction: either everything
 * writes or nothing changes.
 */
export async function importData(
  data: unknown,
  mode: ImportMode,
): Promise<ImportResult> {
  const validation = await validateImport(data);
  if (!validation.valid) {
    return {
      success: false,
      imported: validation.summary,
      errors: validation.errors,
    };
  }

  const obj = data as Record<string, unknown>;
  const courses = obj.courses as Course[];
  const topics = obj.topics as Topic[];
  const decks = obj.decks as Deck[];
  const flashcards = obj.flashcards as Flashcard[];
  const reviewLogs = obj.reviewLogs as ReviewLog[];
  const sources = obj.sources as Source[];
  const chunks = obj.chunks as Chunk[];
  const feynmanAttempts = obj.feynmanAttempts as FeynmanAttempt[];

  try {
    if (mode === "replace") {
      // Clear all tables, then write import data.
      // Use the array-form of Dexie transaction to include all tables.
      await db.transaction("rw", ALL_TABLES, async () => {
        await Promise.all([
          db.courses.clear(),
          db.topics.clear(),
          db.decks.clear(),
          db.flashcards.clear(),
          db.reviewLogs.clear(),
          db.sources.clear(),
          db.chunks.clear(),
          db.feynmanAttempts.clear(),
        ]);
        await Promise.all([
          courses.length && db.courses.bulkAdd(courses),
          topics.length && db.topics.bulkAdd(topics),
          decks.length && db.decks.bulkAdd(decks),
          flashcards.length && db.flashcards.bulkAdd(flashcards),
          reviewLogs.length && db.reviewLogs.bulkAdd(reviewLogs),
          sources.length && db.sources.bulkAdd(sources),
          chunks.length && db.chunks.bulkAdd(chunks),
          feynmanAttempts.length && db.feynmanAttempts.bulkAdd(feynmanAttempts),
        ]);
      });
    } else {
      // Merge: add only new records (skip existing by id)
      await db.transaction("rw", ALL_TABLES, async () => {
          // For each table, filter out records that already exist
          const filterNew = async <T extends { id: string }>(
            table: { toCollection: () => { primaryKeys: () => Promise<unknown[]> } },
            records: T[],
          ): Promise<T[]> => {
            const keys = await table.toCollection().primaryKeys();
            const existing = new Set(keys as string[]);
            return records.filter((r) => !existing.has(r.id));
          };

          const newCourses = await filterNew(db.courses, courses);
          const newTopics = await filterNew(db.topics, topics);
          const newDecks = await filterNew(db.decks, decks);
          const newFlashcards = await filterNew(db.flashcards, flashcards);
          const newReviewLogs = await filterNew(db.reviewLogs, reviewLogs);
          const newSources = await filterNew(db.sources, sources);
          const newChunks = await filterNew(db.chunks, chunks);
          const newFeynmanAttempts = await filterNew(db.feynmanAttempts, feynmanAttempts);

          await Promise.all([
            newCourses.length && db.courses.bulkAdd(newCourses),
            newTopics.length && db.topics.bulkAdd(newTopics),
            newDecks.length && db.decks.bulkAdd(newDecks),
            newFlashcards.length && db.flashcards.bulkAdd(newFlashcards),
            newReviewLogs.length && db.reviewLogs.bulkAdd(newReviewLogs),
            newSources.length && db.sources.bulkAdd(newSources),
            newChunks.length && db.chunks.bulkAdd(newChunks),
            newFeynmanAttempts.length && db.feynmanAttempts.bulkAdd(newFeynmanAttempts),
          ]);
        },
      );
    }

    return {
      success: true,
      imported: validation.summary,
      errors: [],
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during import.";
    return {
      success: false,
      imported: { courses: 0, topics: 0, decks: 0, flashcards: 0, reviewLogs: 0, sources: 0, chunks: 0, feynmanAttempts: 0 },
      errors: [`Import failed: ${message}`],
    };
  }
}

/**
 * Parse a File object into a JS value.
 * Rejects oversized files (> 50 MB) and malformed JSON.
 */
export async function parseImportFile(file: File): Promise<unknown> {
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_SIZE) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`);
  }

  const text = await file.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
}

/**
 * Clear all user data from the database.
 * This is destructive and irreversible.
 */
export async function clearAllData(): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    await Promise.all([
      db.courses.clear(),
      db.topics.clear(),
      db.decks.clear(),
      db.flashcards.clear(),
      db.reviewLogs.clear(),
      db.sources.clear(),
      db.chunks.clear(),
      db.feynmanAttempts.clear(),
    ]);
  });
}

/**
 * Get approximate storage usage information.
 * Returns per-table record counts and total estimated size.
 */
export async function getStorageInfo(): Promise<{
  tables: Record<string, number>;
  totalRecords: number;
}> {
  const tables = {
    courses: await db.courses.count(),
    topics: await db.topics.count(),
    decks: await db.decks.count(),
    flashcards: await db.flashcards.count(),
    reviewLogs: await db.reviewLogs.count(),
    sources: await db.sources.count(),
    chunks: await db.chunks.count(),
    feynmanAttempts: await db.feynmanAttempts.count(),
  };

  const totalRecords = Object.values(tables).reduce((a, b) => a + b, 0);

  return { tables, totalRecords };
}
