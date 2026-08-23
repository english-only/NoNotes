import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "@/lib/db/repositories/course-repository";
import { createDeck } from "@/lib/db/repositories/deck-repository";
import { createSource } from "@/lib/db/repositories/source-repository";
import { createChunk } from "@/lib/db/repositories/chunk-repository";
import { generateFromSource, persistAcceptedCards } from "./generation";
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
