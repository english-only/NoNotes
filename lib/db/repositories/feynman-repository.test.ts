import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/lib/db/client";
import {
  createFeynmanAttempt,
  getFeynmanAttempt,
  listFeynmanAttemptsByCourse,
  listFeynmanAttemptsByDeck,
  deleteFeynmanAttempt,
} from "./feynman-repository";

beforeEach(async () => {
  await db.courses.clear();
  await db.feynmanAttempts.clear();
});

function seedCourse(id = "course-1") {
  return db.courses.add({
    id,
    title: "Test Course",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

function seedAttempt(overrides: Record<string, unknown> = {}) {
  return createFeynmanAttempt({
    courseId: "course-1",
    concept: "Photosynthesis",
    explanation: "Plants convert sunlight into energy.",
    feedback: {
      correctness: 0.8,
      completeness: 0.6,
      clarity: 0.9,
      misconceptions: [],
      missingConcepts: ["chlorophyll"],
      corrections: [],
      summary: "Good understanding but missing detail.",
      improvement: "Include chlorophyll role.",
      followUp: "What is the Calvin cycle?",
    },
    sourceChunkIds: ["chunk-1"],
    ...overrides,
  });
}

describe("FeynmanAttempt repository", () => {
  beforeEach(async () => {
    await seedCourse();
  });

  it("creates and retrieves an attempt", async () => {
    const attempt = await seedAttempt();
    const retrieved = await getFeynmanAttempt(attempt.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.concept).toBe("Photosynthesis");
    expect(retrieved!.feedback.correctness).toBe(0.8);
  });

  it("returns null for non-existent attempt", async () => {
    const retrieved = await getFeynmanAttempt("non-existent");
    expect(retrieved).toBeUndefined();
  });

  it("lists attempts by course", async () => {
    const a = await seedAttempt({ concept: "A" });
    // Ensure different createdAt for sort stability
    await db.feynmanAttempts.update(a.id, { createdAt: a.createdAt + 1 });
    await seedAttempt({ concept: "B" });
    const attempts = await listFeynmanAttemptsByCourse("course-1");
    expect(attempts).toHaveLength(2);
    // Ordered by createdAt ascending
    expect(attempts[0].concept).toBe("A");
    expect(attempts[1].concept).toBe("B");
  });

  it("lists attempts by deck", async () => {
    await seedAttempt({ deckId: "deck-1" });
    await seedAttempt({ deckId: "deck-1" });
    await seedAttempt({ deckId: "deck-2" });
    const attempts = await listFeynmanAttemptsByDeck("deck-1");
    expect(attempts).toHaveLength(2);
  });

  it("lists only course attempts when deckId is undefined", async () => {
    await seedAttempt({ concept: "A" });
    await seedAttempt({ concept: "B", deckId: "deck-1" });
    const attempts = await listFeynmanAttemptsByCourse("course-1");
    // All belong to the same course
    expect(attempts).toHaveLength(2);
  });

  it("deletes an attempt", async () => {
    const attempt = await seedAttempt();
    await deleteFeynmanAttempt(attempt.id);
    const retrieved = await getFeynmanAttempt(attempt.id);
    expect(retrieved).toBeUndefined();
  });

  it("stores sourceChunkIds", async () => {
    const attempt = await seedAttempt({
      sourceChunkIds: ["chunk-1", "chunk-2"],
    });
    const retrieved = await getFeynmanAttempt(attempt.id);
    expect(retrieved!.sourceChunkIds).toEqual(["chunk-1", "chunk-2"]);
  });

  it("defaults sourceChunkIds to empty array", async () => {
    const attempt = await seedAttempt({ sourceChunkIds: undefined });
    const retrieved = await getFeynmanAttempt(attempt.id);
    expect(retrieved!.sourceChunkIds).toEqual([]);
  });

  it("defaults deckId to undefined", async () => {
    const attempt = await seedAttempt({ deckId: undefined });
    const retrieved = await getFeynmanAttempt(attempt.id);
    expect(retrieved!.deckId).toBeUndefined();
  });
});
