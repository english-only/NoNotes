import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "@/lib/db/repositories/course-repository";
import { createDeck } from "@/lib/db/repositories/deck-repository";
import { createSource } from "@/lib/db/repositories/source-repository";
import { createChunk } from "@/lib/db/repositories/chunk-repository";
import {
  generateFromSource,
  persistAcceptedCards,
  planGenerationBatches,
} from "./generation";
import type { AIProvider } from "./provider";

// Mock provider for testing
function createMockProvider(
  flashcards: { prompt: string; answer: string }[]
): AIProvider {
  return {
    name: "mock",
    generateFlashcards: vi.fn().mockResolvedValue({ flashcards }),
    evaluateExplanation: vi.fn().mockResolvedValue({
      correctness: 0.8,
      completeness: 0.6,
      clarity: 0.9,
      misconceptions: [],
      missingConcepts: [],
      corrections: [],
      summary: "Good.",
      improvement: "Better.",
      followUp: "Why?",
    }),
  };
}

describe("generation service", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
    await db.decks.clear();
    await db.flashcards.clear();
    await db.reviewLogs.clear();
    await db.sources.clear();
    await db.chunks.clear();
  });

  describe("map-reduce batching for large sources", () => {
    it("plans multiple batches when the source exceeds the prompt budget", () => {
      const chunks = Array.from({ length: 6 }, (_, i) => ({
        id: `c${i}`,
        ordinal: i,
        content: "x".repeat(30_000),
      }));
      // 180,000 chars total → 3 batches at the 60,000-char budget.
      const batches = planGenerationBatches(chunks);
      expect(batches).toHaveLength(3);
      expect(batches[0].map((c) => c.ordinal)).toEqual([0, 1]);
      expect(batches[2].map((c) => c.ordinal)).toEqual([4, 5]);
      // Batches are contiguous and complete: no material dropped.
      expect(batches.flat().map((c) => c.ordinal)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("plans a single batch for a small source", () => {
      const chunks = [{ id: "c0", ordinal: 0, content: "small" }];
      expect(planGenerationBatches(chunks)).toHaveLength(1);
    });

    it("generates cards from every batch, not just the first, for oversized sources", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const deck = await createDeck({ courseId: course.id, title: "Bones" });
      const source = await createSource({
        courseId: course.id,
        title: "Big textbook",
        type: "text",
        rawContent: "",
        processedContent: "",
      });
      // 4 batches' worth of material.
      // 30,000 chars each: exactly 2 fit per 60,000-char batch → 4 batches.
      const bigChunks = Array.from({ length: 8 }, (_, i) => ({
        ordinal: i,
        content: `Region ${i}: `.padEnd(30_000, "d"),
      })) as { ordinal: number; content: string }[];
      for (const c of bigChunks) {
        await createChunk({ sourceId: source.id, ordinal: c.ordinal, content: c.content });
      }

      const seenOrdinals: number[][] = [];
      const provider: AIProvider = {
        name: "spy",
        generateFlashcards: vi.fn(async (input) => {
          seenOrdinals.push(input.chunks.map((c: { ordinal: number }) => c.ordinal));
          return {
            flashcards: [
              {
                prompt: `Card from chunk ${input.chunks[0].ordinal}`,
                answer: "answer",
              },
            ],
          };
        }),
        evaluateExplanation: vi.fn(),
      };

      const result = await generateFromSource({
        provider,
        sourceId: source.id,
        deckId: deck.id,
        cardCount: 1,
      });

      // All 8 chunks were seen across 4 batch calls.
      expect(seenOrdinals).toHaveLength(4);
      expect(seenOrdinals.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      // Nothing truncated.
      expect(result.truncated).toBe(false);
      expect(result.generated).toBe(4);
      expect(result.flashcards).toHaveLength(4);
    });

    it("merges batch results even when an intermediate batch fails", async () => {
      const course = await createCourse({ title: "Physics" });
      const deck = await createDeck({ courseId: course.id, title: "Motion" });
      const source = await createSource({
        courseId: course.id,
        title: "Mechanics",
        type: "text",
        rawContent: "",
        processedContent: "",
      });
      const bigChunks = Array.from({ length: 6 }, (_, i) => ({
        ordinal: i,
        content: "m".repeat(30_000),
      }));
      for (const c of bigChunks) {
        await createChunk({ sourceId: source.id, ordinal: c.ordinal, content: c.content });
      }

      const provider: AIProvider = {
        name: "flaky",
        generateFlashcards: vi.fn(async (input) => {
          if (input.chunks[0].ordinal === 2) {
            throw new Error("batch 2 blew up");
          }
          return {
            flashcards: [{ prompt: `Q${input.chunks[0].ordinal}`, answer: "A" }],
          };
        }),
        evaluateExplanation: vi.fn(),
      };

      const result = await generateFromSource({
        provider,
        sourceId: source.id,
        deckId: deck.id,
        cardCount: 1,
      });

      // Batches [0,1], [2,3], [4,5] run; the one starting at ordinal 2 fails,
      // the other two still produce cards — the failure is isolated.
      expect(result.generated).toBe(2);
      expect(result.flashcards.map((c) => c.prompt)).toEqual(["Q0", "Q4"]);
      // Partial failure is surfaced, not silent — and it no longer means
      // "material was dropped before generation".
      expect(result.truncated).toBe(true);
    });
  });

  async function seedSourceWithChunks() {
    const course = await createCourse({ title: "Biology" });
    const deck = await createDeck({ courseId: course.id, title: "Bio Deck" });
    const source = await createSource({
      courseId: course.id,
      title: "Lecture notes",
      type: "text",
      rawContent: "Photosynthesis converts light into energy.",
      processedContent: "Photosynthesis converts light into energy.",
    });
    await createChunk({
      sourceId: source.id,
      ordinal: 0,
      content: "Photosynthesis converts light into energy.",
    });
    return { course, deck, source };
  }

  it("generates flashcards from source chunks without persisting", async () => {
    const { deck, source } = await seedSourceWithChunks();
    const mockProvider = createMockProvider([
      { prompt: "What is photosynthesis?", answer: "Converting light to energy." },
    ]);

    const result = await generateFromSource({
      provider: mockProvider,
      sourceId: source.id,
      deckId: deck.id,
      cardCount: 3,
    });

    expect(result.generated).toBe(1);
    expect(result.flashcards).toHaveLength(1);
    expect(result.flashcards[0].prompt).toContain("photosynthesis");

    // Verify cards were NOT persisted (generate no longer auto-persists)
    const cards = await db.flashcards
      .where("deckId")
      .equals(deck.id)
      .toArray();
    expect(cards).toHaveLength(0);
  });

  it("persists accepted cards via persistAcceptedCards", async () => {
    const { deck, source } = await seedSourceWithChunks();
    const mockProvider = createMockProvider([
      { prompt: "Q1", answer: "A1" },
      { prompt: "Q2", answer: "A2" },
    ]);

    const result = await generateFromSource({
      provider: mockProvider,
      sourceId: source.id,
      deckId: deck.id,
      cardCount: 5,
    });

    // Accept only the first card
    const accepted = [
      { prompt: result.flashcards[0].prompt, answer: result.flashcards[0].answer, sourceChunkIds: ["chunk-1"] },
    ];
    const persisted = await persistAcceptedCards(deck.id, accepted);

    expect(persisted).toBe(1);
    const cards = await db.flashcards
      .where("deckId")
      .equals(deck.id)
      .toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0].sourceChunkIds).toEqual(["chunk-1"]);
  });

  it("carries sourceChunkIds from generation through to persistence", async () => {
    const { deck, source } = await seedSourceWithChunks();
    const mockProvider = createMockProvider([
      { prompt: "Q1", answer: "A1" },
    ]);

    const result = await generateFromSource({
      provider: mockProvider,
      sourceId: source.id,
      deckId: deck.id,
      cardCount: 3,
    });

    // sourceChunkIds should be present in the generation result
    expect(result.flashcards[0].sourceChunkIds).toBeDefined();
    expect(result.flashcards[0].sourceChunkIds.length).toBeGreaterThan(0);

    // Persist with the sourceChunkIds from generation
    const accepted = [
      { prompt: result.flashcards[0].prompt, answer: result.flashcards[0].answer, sourceChunkIds: result.flashcards[0].sourceChunkIds },
    ];
    await persistAcceptedCards(deck.id, accepted);

    const cards = await db.flashcards
      .where("deckId")
      .equals(deck.id)
      .toArray();
    expect(cards[0].sourceChunkIds).toEqual(result.flashcards[0].sourceChunkIds);
  });

  it("persists zero cards when none accepted", async () => {
    const { deck } = await seedSourceWithChunks();
    const persisted = await persistAcceptedCards(deck.id, []);
    expect(persisted).toBe(0);
  });

  it("throws for nonexistent source", async () => {
    const course = await createCourse({ title: "Math" });
    const deck = await createDeck({ courseId: course.id, title: "Math Deck" });
    const mockProvider = createMockProvider([]);

    await expect(
      generateFromSource({
        provider: mockProvider,
        sourceId: "nonexistent",
        deckId: deck.id,
        cardCount: 3,
      })
    ).rejects.toThrow(/source/i);
  });

  it("throws for nonexistent deck", async () => {
    const course = await createCourse({ title: "Math" });
    const source = await createSource({
      courseId: course.id,
      title: "Notes",
      type: "text",
      rawContent: "content",
      processedContent: "content",
    });
    const mockProvider = createMockProvider([]);

    await expect(
      generateFromSource({
        provider: mockProvider,
        sourceId: source.id,
        deckId: "nonexistent",
        cardCount: 3,
      })
    ).rejects.toThrow(/deck/i);
  });

  it("throws when provider fails", async () => {
    const { deck, source } = await seedSourceWithChunks();
    const mockProvider: AIProvider = {
      name: "failing",
      generateFlashcards: vi.fn().mockRejectedValue(new Error("API down")),
      evaluateExplanation: vi.fn(),
    };

    await expect(
      generateFromSource({
        provider: mockProvider,
        sourceId: source.id,
        deckId: deck.id,
        cardCount: 3,
      })
    ).rejects.toThrow("API down");

    // Verify no cards were persisted on failure
    const cards = await db.flashcards
      .where("deckId")
      .equals(deck.id)
      .toArray();
    expect(cards).toHaveLength(0);
  });

  it("filters out cards with empty prompt or answer", async () => {
    const { deck, source } = await seedSourceWithChunks();
    const mockProvider: AIProvider = {
      name: "partial-fail",
      generateFlashcards: vi.fn().mockResolvedValue({
        flashcards: [
          { prompt: "Q1", answer: "A1" },
          { prompt: "", answer: "A2" }, // invalid
        ],
      }),
      evaluateExplanation: vi.fn(),
    };

    const result = await generateFromSource({
      provider: mockProvider,
      sourceId: source.id,
      deckId: deck.id,
      cardCount: 5,
    });

    // Invalid cards are filtered out, not persisted
    expect(result.flashcards).toHaveLength(1);
    expect(result.flashcards[0].prompt).toBe("Q1");
  });
});
