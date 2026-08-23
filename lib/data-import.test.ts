import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";

import { db } from "@/lib/db/client";
import { EXPORT_SCHEMA_VERSION } from "@/lib/data-export";
import type { NoNotesExport } from "@/lib/data-export";
import {
  validateImport,
  importData,
  clearAllData,
  getStorageInfo,
} from "@/lib/data-import";

function makeExport(overrides: Partial<NoNotesExport> = {}): NoNotesExport {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: new Date().toISOString(),
    courses: [],
    topics: [],
    decks: [],
    flashcards: [],
    reviewLogs: [],
    sources: [],
    chunks: [],
    feynmanAttempts: [],
    ...overrides,
  };
}

describe("data-import", () => {
  beforeEach(async () => {
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

  // ── Validation ─────────────────────────────────────────────────────

  describe("validateImport", () => {
    it("rejects non-object input", async () => {
      const result = await validateImport(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not a valid JSON object");
    });

    it("rejects missing schemaVersion", async () => {
      const result = await validateImport({ courses: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
    });

    it("rejects newer schema version", async () => {
      const data = makeExport({ schemaVersion: 999 });
      const result = await validateImport(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("newer"))).toBe(true);
    });

    it("warns on older schema version but remains valid", async () => {
      const data = makeExport({ schemaVersion: 0 });
      const result = await validateImport(data);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("older"))).toBe(true);
    });

    it("validates correct export", async () => {
      const result = await validateImport(makeExport());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates entity counts in summary", async () => {
      const now = Date.now();
      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
        flashcards: [{
          id: "f1", deckId: "d1", prompt: "Q", answer: "A",
          sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
          fsrs: {
            version: 1, due: now, stability: 0, difficulty: 0,
            elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
            learning_steps: 0, state: 0, last_review: null,
          },
        }],
      });

      const result = await validateImport(data);
      expect(result.summary.courses).toBe(1);
      expect(result.summary.flashcards).toBe(1);
    });

    it("catches flashcard referencing non-existent deck", async () => {
      const data = makeExport({
        flashcards: [{
          id: "f1", deckId: "nonexistent", prompt: "Q", answer: "A",
          sourceChunkIds: [], dueAt: Date.now(), createdAt: Date.now(),
          updatedAt: Date.now(),
          fsrs: {
            version: 1, due: Date.now(), stability: 0, difficulty: 0,
            elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
            learning_steps: 0, state: 0, last_review: null,
          },
        }],
      });

      const result = await validateImport(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("non-existent deck"))).toBe(true);
    });

    it("catches topic referencing non-existent course", async () => {
      const data = makeExport({
        topics: [{
          id: "t1", courseId: "nonexistent", title: "Topic",
          createdAt: Date.now(), updatedAt: Date.now(),
        }],
      });

      const result = await validateImport(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("non-existent course"))).toBe(true);
    });

    it("catches reviewLog referencing non-existent flashcard", async () => {
      const data = makeExport({
        reviewLogs: [{
          id: "r1", flashcardId: "nonexistent", rating: 3,
          reviewedAt: Date.now(), elapsedMs: 0, state: 0,
          stability: 0, difficulty: 0, due: 0, scheduled_days: 0,
          elapsed_days: 0, last_elapsed_days: 0, learning_steps: 0,
        }],
      });

      const result = await validateImport(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("non-existent flashcard"))).toBe(true);
    });

    it("catches chunk referencing non-existent source", async () => {
      const data = makeExport({
        chunks: [{
          id: "ch1", sourceId: "nonexistent", ordinal: 0,
          content: "text", createdAt: Date.now(),
        }],
      });

      const result = await validateImport(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("non-existent source"))).toBe(true);
    });

    it("validates correct referential integrity", async () => {
      const now = Date.now();
      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
        topics: [{ id: "t1", courseId: "c1", title: "Algebra", createdAt: now, updatedAt: now }],
        decks: [{ id: "d1", courseId: "c1", title: "Cards", createdAt: now, updatedAt: now }],
        flashcards: [{
          id: "f1", deckId: "d1", prompt: "Q", answer: "A",
          sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
          fsrs: {
            version: 1, due: now, stability: 0, difficulty: 0,
            elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
            learning_steps: 0, state: 0, last_review: null,
          },
        }],
        reviewLogs: [{
          id: "r1", flashcardId: "f1", rating: 3, reviewedAt: now,
          elapsedMs: 0, state: 0, stability: 0, difficulty: 0,
          due: now, scheduled_days: 0, elapsed_days: 0,
          last_elapsed_days: 0, learning_steps: 0,
        }],
        sources: [{ id: "s1", courseId: "c1", title: "Text", type: "text" as const, rawContent: "hi", processedContent: "hi", createdAt: now, updatedAt: now }],
        chunks: [{ id: "ch1", sourceId: "s1", ordinal: 0, content: "hi", createdAt: now }],
      });

      const result = await validateImport(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Import (replace mode) ──────────────────────────────────────────

  describe("importData - replace mode", () => {
    it("imports data into empty database", async () => {
      const now = Date.now();
      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
      });

      const result = await importData(data, "replace");
      expect(result.success).toBe(true);

      const courses = await db.courses.toArray();
      expect(courses).toHaveLength(1);
      expect(courses[0].title).toBe("Math");
    });

    it("replaces existing data completely", async () => {
      const now = Date.now();
      // Pre-populate with old data
      await db.courses.add({
        id: "old", title: "Old Course", createdAt: now, updatedAt: now,
      });

      const data = makeExport({
        courses: [{ id: "new", title: "New Course", createdAt: now, updatedAt: now }],
      });

      const result = await importData(data, "replace");
      expect(result.success).toBe(true);

      const courses = await db.courses.toArray();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe("new");
      expect(courses[0].title).toBe("New Course");
    });

    it("rolls back on error (atomic)", async () => {
      const now = Date.now();
      // Pre-populate
      await db.courses.add({
        id: "existing", title: "Existing", createdAt: now, updatedAt: now,
      });

      // Import with invalid data (flashcard references nonexistent deck)
      const data = makeExport({
        courses: [{ id: "new", title: "New", createdAt: now, updatedAt: now }],
        flashcards: [{
          id: "f1", deckId: "nonexistent", prompt: "Q", answer: "A",
          sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
          fsrs: {
            version: 1, due: now, stability: 0, difficulty: 0,
            elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
            learning_steps: 0, state: 0, last_review: null,
          },
        }],
      });

      const result = await importData(data, "replace");
      expect(result.success).toBe(false);

      // Existing data should still be there (validation prevented write)
      const courses = await db.courses.toArray();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe("existing");
    });

    it("preserves flashcard FSRS state", async () => {
      const now = Date.now();
      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
        decks: [{ id: "d1", courseId: "c1", title: "Deck", createdAt: now, updatedAt: now }],
        flashcards: [{
          id: "f1", deckId: "d1", prompt: "Q", answer: "A",
          sourceChunkIds: ["ch1"], dueAt: now + 86400000,
          createdAt: now, updatedAt: now,
          fsrs: {
            version: 1, due: now + 86400000, stability: 3.5, difficulty: 6.2,
            elapsed_days: 1, scheduled_days: 3, reps: 5, lapses: 1,
            learning_steps: 1, state: 2, last_review: now,
          },
        }],
      });

      const result = await importData(data, "replace");
      expect(result.success).toBe(true);

      const cards = await db.flashcards.toArray();
      expect(cards[0].fsrs.stability).toBe(3.5);
      expect(cards[0].fsrs.reps).toBe(5);
      expect(cards[0].fsrs.state).toBe(2);
      expect(cards[0].dueAt).toBe(now + 86400000);
    });
  });

  // ── Import (merge mode) ────────────────────────────────────────────

  describe("importData - merge mode", () => {
    it("adds new records alongside existing", async () => {
      const now = Date.now();
      await db.courses.add({
        id: "existing", title: "Existing", createdAt: now, updatedAt: now,
      });

      const data = makeExport({
        courses: [{
          id: "new", title: "New", createdAt: now, updatedAt: now,
        }],
      });

      const result = await importData(data, "merge");
      expect(result.success).toBe(true);

      const courses = await db.courses.toArray();
      expect(courses).toHaveLength(2);
    });

    it("skips records that already exist (by id)", async () => {
      const now = Date.now();
      await db.courses.add({
        id: "c1", title: "Original", createdAt: now, updatedAt: now,
      });

      const data = makeExport({
        courses: [{
          id: "c1", title: "Updated", createdAt: now, updatedAt: now,
        }],
      });

      const result = await importData(data, "merge");
      expect(result.success).toBe(true);

      // Should still have only 1 course, unchanged
      const courses = await db.courses.toArray();
      expect(courses).toHaveLength(1);
      expect(courses[0].title).toBe("Original"); // Not overwritten
    });

    it("merges flashcards without duplicating", async () => {
      const now = Date.now();
      await db.flashcards.add({
        id: "existing", deckId: "d1", prompt: "Old", answer: "Old",
        sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
        fsrs: {
          version: 1, due: now, stability: 0, difficulty: 0,
          elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
          learning_steps: 0, state: 0, last_review: null,
        },
      });

      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
        decks: [{ id: "d1", courseId: "c1", title: "Deck", createdAt: now, updatedAt: now }],
        flashcards: [{
          id: "new", deckId: "d1", prompt: "New", answer: "New",
          sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
          fsrs: {
            version: 1, due: now, stability: 0, difficulty: 0,
            elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
            learning_steps: 0, state: 0, last_review: null,
          },
        }],
      });

      const result = await importData(data, "merge");
      expect(result.success).toBe(true);

      const cards = await db.flashcards.toArray();
      expect(cards).toHaveLength(2);
    });
  });

  // ── clearAllData ───────────────────────────────────────────────────

  describe("clearAllData", () => {
    it("removes all records from all tables", async () => {
      const now = Date.now();
      await db.courses.add({
        id: "c1", title: "Math", createdAt: now, updatedAt: now,
      });
      await db.flashcards.add({
        id: "f1", deckId: "d1", prompt: "Q", answer: "A",
        sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
        fsrs: {
          version: 1, due: now, stability: 0, difficulty: 0,
          elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
          learning_steps: 0, state: 0, last_review: null,
        },
      });

      await clearAllData();

      const info = await getStorageInfo();
      expect(info.totalRecords).toBe(0);
    });
  });

  // ── getStorageInfo ─────────────────────────────────────────────────

  describe("getStorageInfo", () => {
    it("returns zero counts for empty database", async () => {
      const info = await getStorageInfo();
      expect(info.totalRecords).toBe(0);
      expect(info.tables.courses).toBe(0);
    });

    it("returns correct counts", async () => {
      const now = Date.now();
      await db.courses.add({
        id: "c1", title: "Math", createdAt: now, updatedAt: now,
      });
      await db.courses.add({
        id: "c2", title: "Physics", createdAt: now, updatedAt: now,
      });

      const info = await getStorageInfo();
      expect(info.tables.courses).toBe(2);
      expect(info.totalRecords).toBe(2);
    });
  });

  // ── Large import handling ──────────────────────────────────────────

  describe("importData - edge cases", () => {
    it("handles empty import gracefully", async () => {
      const result = await importData(makeExport(), "replace");
      expect(result.success).toBe(true);
    });

    it("handles import with only sources (no decks/flashcards)", async () => {
      const now = Date.now();
      const data = makeExport({
        courses: [{ id: "c1", title: "Math", createdAt: now, updatedAt: now }],
        sources: [{
          id: "s1", courseId: "c1", title: "Book",
          type: "pdf" as const, rawContent: "text", processedContent: "text",
          createdAt: now, updatedAt: now,
        }],
        chunks: [{
          id: "ch1", sourceId: "s1", ordinal: 0, content: "text", createdAt: now,
        }],
      });

      const result = await importData(data, "replace");
      expect(result.success).toBe(true);

      const sources = await db.sources.toArray();
      expect(sources).toHaveLength(1);
      const chunks = await db.chunks.toArray();
      expect(chunks).toHaveLength(1);
    });
  });
});
