import { describe, expect, it } from "vitest";

import { analyticsWindow, computeAnalytics } from "./analytics";
import type { Deck, Flashcard, ReviewLog } from "@/lib/db/schema";

const NOW = 1_000_000_000_000;

function makeCard(id: string, deckId: string, dueAt = NOW - 1000): Flashcard {
  return {
    id,
    deckId,
    prompt: `P ${id}`,
    answer: `A ${id}`,
    sourceChunkIds: [],
    dueAt,
    createdAt: 0,
    updatedAt: 0,
    fsrs: {
      version: 1,
      due: dueAt,
      stability: 1.5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 3,
      lapses: 0,
      learning_steps: 0,
      state: 2,
      last_review: null,
    },
  };
}

function makeLog(
  id: string,
  flashcardId: string,
  rating: 1 | 2 | 3 | 4,
  reviewedAt = NOW
): ReviewLog {
  return {
    id,
    flashcardId,
    rating,
    reviewedAt,
    elapsedMs: 0,
    due: reviewedAt,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    state: 0,
    last_elapsed_days: 0,
    learning_steps: 0,
  };
}

describe("computeAnalytics scale", () => {
  it("handles 1,000 cards x 10,000 logs x 50 decks in under 500ms", () => {
    const deckCount = 50;
    const cardCount = 1_000;
    const logCount = 10_000;

    const decks: Deck[] = Array.from({ length: deckCount }, (_, i) => ({
      id: `deck-${i}`,
      title: `Deck ${i}`,
      courseId: "c1",
      createdAt: 0,
      updatedAt: 0,
    }));
    const cards: Flashcard[] = Array.from({ length: cardCount }, (_, i) =>
      makeCard(`card-${i}`, `deck-${i % deckCount}`)
    );
    const logs: ReviewLog[] = Array.from({ length: logCount }, (_, i) =>
      makeLog(
        `log-${i}`,
        `card-${i % cardCount}`,
        ((i % 4) + 1) as 1 | 2 | 3 | 4
      )
    );

    const start = performance.now();
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: logs,
      decks,
      sourceCount: 7,
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);

    // Sanity: aggregation remains correct at scale.
    expect(result.totalCards).toBe(cardCount);
    expect(result.totalReviews).toBe(logCount);
    expect(result.weakDecks).toHaveLength(5);
    // Ratings cycle 1..4 evenly => 2,500 of each rating.
    expect(result.ratingDistribution).toEqual({
      again: 2_500,
      hard: 2_500,
      good: 2_500,
      easy: 2_500,
    });
  });

  it("attributes logs to decks via the card's deckId (dangling logs ignored)", () => {
    const cards = [makeCard("card-1", "deck-1")];
    const logs = [
      makeLog("log-1", "card-1", 1),
      makeLog("log-2", "ghost-card", 3), // card no longer exists
    ];
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: logs,
      decks: [{ id: "deck-1", title: "D1", courseId: "c1", createdAt: 0, updatedAt: 0 }],
      sourceCount: 0,
    });

    const d1 = result.weakDecks.find((d) => d.deckId === "deck-1");
    expect(d1?.againCount).toBe(1);
    expect(d1?.goodCount).toBe(0);
  });
});
