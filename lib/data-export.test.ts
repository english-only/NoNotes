import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";

import { db } from "@/lib/db/client";
import { EXPORT_SCHEMA_VERSION, APP_VERSION, exportAllData, type NoNotesExport } from "@/lib/data-export";

describe("data-export", () => {
  beforeEach(async () => {
    // Clear all tables
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

  it("exports empty database with correct schema version", async () => {
    const data = await exportAllData();

    expect(data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(data.appVersion).toBe(APP_VERSION);
    expect(data.exportedAt).toBeTruthy();
    expect(new Date(data.exportedAt).toISOString()).toBe(data.exportedAt);
    expect(data.courses).toEqual([]);
    expect(data.topics).toEqual([]);
    expect(data.decks).toEqual([]);
    expect(data.flashcards).toEqual([]);
    expect(data.reviewLogs).toEqual([]);
    expect(data.sources).toEqual([]);
    expect(data.chunks).toEqual([]);
    expect(data.feynmanAttempts).toEqual([]);
  });

  it("exports all entity types", async () => {
    const now = Date.now();

    // Seed minimal data
    await db.courses.add({
      id: "c1", title: "Math", description: "Algebra", createdAt: now, updatedAt: now,
    });
    await db.topics.add({
      id: "t1", courseId: "c1", title: "Linear Algebra", createdAt: now, updatedAt: now,
    });
    await db.decks.add({
      id: "d1", courseId: "c1", title: "Vectors", createdAt: now, updatedAt: now,
    });
    await db.flashcards.add({
      id: "f1", deckId: "d1", prompt: "What is a vector?",
      answer: "An arrow with magnitude and direction.",
      sourceChunkIds: [], dueAt: now, createdAt: now, updatedAt: now,
      fsrs: {
        version: 1, due: now, stability: 0, difficulty: 0,
        elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0,
        learning_steps: 0, state: 0, last_review: null,
      },
    });
    await db.reviewLogs.add({
      id: "r1", flashcardId: "f1", rating: 3, reviewedAt: now,
      elapsedMs: 5000, state: 0, stability: 1, difficulty: 5,
      due: now, scheduled_days: 1, elapsed_days: 0,
      last_elapsed_days: 0, learning_steps: 0,
    });
    await db.sources.add({
      id: "s1", courseId: "c1", title: "Textbook",
      type: "text", rawContent: "Vector math.", processedContent: "Vector math.",
      createdAt: now, updatedAt: now,
    });
    await db.chunks.add({
      id: "ch1", sourceId: "s1", ordinal: 0, content: "Vector math.", createdAt: now,
    });
    await db.feynmanAttempts.add({
      id: "fa1", courseId: "c1", concept: "Vectors",
      explanation: "Vectors are arrows.",
      feedback: {
        correctness: 80, completeness: 60, clarity: 90,
        misconceptions: [], missingConcepts: ["Magnitude"],
        corrections: [], summary: "Good", improvement: "Add magnitude",
        followUp: "What is a scalar?",
      },
      sourceChunkIds: [], createdAt: now,
    });

    const data = await exportAllData();

    expect(data.courses).toHaveLength(1);
    expect(data.topics).toHaveLength(1);
    expect(data.decks).toHaveLength(1);
    expect(data.flashcards).toHaveLength(1);
    expect(data.reviewLogs).toHaveLength(1);
    expect(data.sources).toHaveLength(1);
    expect(data.chunks).toHaveLength(1);
    expect(data.feynmanAttempts).toHaveLength(1);
  });

  it("does NOT export API keys", async () => {
    const data = await exportAllData() as NoNotesExport & Record<string, unknown>;

    // The export object must not contain any API key field
    expect(data).not.toHaveProperty("apiKey");
    expect(data).not.toHaveProperty("api_key");
    expect(data).not.toHaveProperty("settings");

    // No nested keys either
    const json = JSON.stringify(data);
    expect(json).not.toContain("AIza");
  });

  it("preserves FSRS state in flashcard export", async () => {
    const now = Date.now();
    await db.flashcards.add({
      id: "f1", deckId: "d1", prompt: "Q", answer: "A",
      sourceChunkIds: ["ch1"], dueAt: now + 86400000,
      createdAt: now, updatedAt: now,
      fsrs: {
        version: 1, due: now + 86400000, stability: 3.5, difficulty: 6.2,
        elapsed_days: 1, scheduled_days: 3, reps: 5, lapses: 1,
        learning_steps: 1, state: 2, last_review: now,
      },
    });

    const data = await exportAllData();
    const card = data.flashcards[0];

    expect(card.fsrs.stability).toBe(3.5);
    expect(card.fsrs.difficulty).toBe(6.2);
    expect(card.fsrs.reps).toBe(5);
    expect(card.fsrs.lapses).toBe(1);
    expect(card.fsrs.state).toBe(2);
    expect(card.dueAt).toBe(now + 86400000);
  });

  it("preserves reviewLog fields", async () => {
    const now = Date.now();
    await db.reviewLogs.add({
      id: "r1", flashcardId: "f1", rating: 2, reviewedAt: now,
      elapsedMs: 12345, state: 1, stability: 2.1, difficulty: 5.5,
      due: now - 1000, scheduled_days: 2, elapsed_days: 1,
      last_elapsed_days: 1, learning_steps: 2,
    });

    const data = await exportAllData();
    const log = data.reviewLogs[0];

    expect(log.rating).toBe(2);
    expect(log.elapsedMs).toBe(12345);
    expect(log.state).toBe(1);
    expect(log.stability).toBe(2.1);
  });
});
