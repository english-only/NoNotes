import { describe, expect, it } from "vitest";

import { analyticsWindow, computeAnalytics } from "./analytics";
import type { Flashcard, ReviewLog, Deck } from "@/lib/db/schema";

const NOW = 1_000_000_000_000;

function flashcard(
  id: string,
  deckId: string,
  fsrs: { stability?: number; state?: 0 | 1 | 2 | 3 },
  dueAt = NOW - 1000
): Flashcard {
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
      stability: fsrs.stability ?? 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      learning_steps: 0,
      state: fsrs.state ?? 0,
      last_review: null,
    },
  };
}

function log(
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

const deck = (id: string, title: string): Deck => ({
  id,
  title,
  courseId: "c1",
  createdAt: 0,
  updatedAt: 0,
});

describe("computeAnalytics", () => {
  it("returns zeros for empty data", () => {
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: [],
      allLogs: [],
      decks: [],
      sourceCount: 0,
    });
    expect(result.totalCards).toBe(0);
    expect(result.totalReviews).toBe(0);
    expect(result.masteryPercent).toBe(0);
    expect(result.ratingDistribution).toEqual({
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    });
  });

  it("counts totals, due cards, and rating distribution", () => {
    const cards = [
      flashcard("c1", "d1", { stability: 2, state: 2 }, NOW - 1000), // due, mastered
      flashcard("c2", "d1", { stability: 1, state: 1 }, NOW + 10_000), // not due
    ];
    const logs = [
      log("l1", "c1", 1),
      log("l2", "c1", 3),
      log("l3", "c2", 4),
    ];
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: logs,
      decks: [deck("d1", "Bio")],
      sourceCount: 3,
    });

    expect(result.totalCards).toBe(2);
    expect(result.totalReviews).toBe(3);
    expect(result.totalSources).toBe(3);
    expect(result.dueCards).toBe(1);
    expect(result.ratingDistribution).toEqual({ again: 1, hard: 0, good: 1, easy: 1 });
    expect(result.masteryPercent).toBe(50); // 1 of 2 mastered
    expect(result.averageStability).toBe(1.5); // (2 + 1) / 2
    expect(result.recentActivity).toBe(3);
  });

  it("computes average stability only over cards with stability", () => {
    const cards = [
      flashcard("c1", "d1", { stability: 4, state: 2 }, NOW - 1),
      flashcard("c2", "d1", { stability: 0, state: 0 }, NOW + 1), // no stability yet
    ];
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: [],
      decks: [deck("d1", "Bio")],
      sourceCount: 0,
    });
    expect(result.averageStability).toBe(4);
  });

  it("flags weak decks and sorts by again count then due count", () => {
    const cards = [
      flashcard("c1", "d1", { stability: 1, state: 1 }, NOW),
      flashcard("c2", "d1", { stability: 1, state: 1 }, NOW),
      flashcard("c3", "d2", { stability: 3, state: 2 }, NOW - 1),
    ];
    const logs = [
      log("l1", "c1", 1),
      log("l2", "c1", 1),
      log("l3", "c3", 3),
    ];
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: logs,
      decks: [deck("d1", "Weak Deck"), deck("d2", "Healthy Deck")],
      sourceCount: 0,
    });

    expect(result.weakDecks).toHaveLength(2);
    expect(result.weakDecks[0].deckId).toBe("d1"); // 2 agains
    expect(result.weakDecks[0].againCount).toBe(2);
    expect(result.weakDecks[0].dueCards).toBe(2);
    expect(result.weakDecks[1].deckId).toBe("d2");
  });

  it("counts only recent reviews toward activity", () => {
    const cards = [flashcard("c1", "d1", { state: 2 }, NOW)];
    const oldLog = log("old", "c1", 3, NOW - 8 * 24 * 60 * 60 * 1000); // > 1 week
    const newLog = log("new", "c1", 3, NOW - 60_000); // within week
    const result = computeAnalytics({
      now: NOW,
      oneWeekAgo: analyticsWindow(NOW).oneWeekAgo,
      allFlashcards: cards,
      allLogs: [oldLog, newLog],
      decks: [deck("d1", "Bio")],
      sourceCount: 0,
    });
    expect(result.recentActivity).toBe(1);
    expect(result.totalReviews).toBe(2);
  });
});