import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createInitialState } from "@/lib/fsrs/scheduler";
import { createCourse } from "./course-repository";
import { createDeck } from "./deck-repository";
import {
  listDueFlashcardsByDeck,
  listReviewLogs,
  recordReview,
} from "./review-repository";
import type { Flashcard } from "@/lib/db/schema";

// Fixed timestamps keep FSRS scheduling assertions deterministic.
const NOW = 1_700_000_000_000;

function makeCard(id: string, deckId: string, dueAt: number): Flashcard {
  return {
    id,
    deckId,
    prompt: `Prompt-${id}`,
    answer: `Answer-${id}`,
    sourceChunkIds: [],
    dueAt,
    createdAt: 1,
    updatedAt: 1,
    fsrs: createInitialState(dueAt),
  };
}

describe("review repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.decks.clear();
    await db.flashcards.clear();
    await db.reviewLogs.clear();
  });

  async function seedDeck(cardIds: string[]) {
    const course = await createCourse({ title: "Biology" });
    const deck = await createDeck({ courseId: course.id, title: "Review deck" });
    if (cardIds.length > 0) {
      await db.flashcards.bulkAdd(
        cardIds.map((id) => makeCard(id, deck.id, NOW))
      );
    }
    return { course, deck };
  }

  describe("recordReview", () => {
    it("persists a review log and advances the card's scheduling state atomically", async () => {
      await seedDeck(["card-1"]);
      const card = (await db.flashcards.get("card-1")) as Flashcard;

      const { flashcard, log } = await recordReview({
        flashcardId: card.id,
        rating: 3,
        reviewedAt: NOW,
        elapsedMs: 4_200,
      });

      // Review log captures the rating, timing, and reviewedAt.
      expect(log.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(log.flashcardId).toBe(card.id);
      expect(log.rating).toBe(3);
      expect(log.reviewedAt).toBe(NOW);
      expect(log.elapsedMs).toBe(4_200);

      // The card advanced: reps bumped, dueAt moved into the future.
      expect(flashcard.fsrs.reps).toBe(card.fsrs.reps + 1);
      expect(flashcard.dueAt).toBeGreaterThan(NOW);
      expect(flashcard.updatedAt).toBe(NOW);

      // Both writes landed.
      const stored = await db.flashcards.get(card.id);
      expect(stored).toEqual(flashcard);
      await expect(db.reviewLogs.count()).resolves.toBe(1);
    });

    it("captures the FSRS revlog snapshot (pre-review values) on the review log", async () => {
      await seedDeck(["card-1"]);
      await recordReview({ flashcardId: "card-1", rating: 3, reviewedAt: NOW });

      // Second review: the card was in Learning state with real scheduling
      // history, so the revlog snapshot carries meaningful values.
      const { log } = await recordReview({
        flashcardId: "card-1",
        rating: 3,
        reviewedAt: NOW + 600_000,
      });

      expect(log.state).toBe(1); // Learning when reviewed
      expect(log.stability).toBeGreaterThan(0);
      expect(log.difficulty).toBeGreaterThan(0);
      // ts-fsrs revlog `due` is the card's due at the start of its learning
      // cycle, which always predates the review itself.
      expect(log.due).toBeLessThanOrEqual(log.reviewedAt);
      expect(log.reviewedAt).toBe(NOW + 600_000);
      expect(log.scheduled_days).toBeGreaterThanOrEqual(0);
      expect(log.elapsed_days).toBeGreaterThanOrEqual(0);
      expect(log.last_elapsed_days).toBeGreaterThanOrEqual(0);
      expect(log.learning_steps).toBeGreaterThanOrEqual(0);
    });

    it("schedules an Again on a new card into same-day short-term learning", async () => {
      await seedDeck(["card-1"]);

      const { flashcard } = await recordReview({
        flashcardId: "card-1",
        rating: 1,
        reviewedAt: NOW,
      });

      expect(flashcard.fsrs.state).toBe(1); // Learning
      expect(flashcard.fsrs.reps).toBe(1);
      expect(flashcard.dueAt - NOW).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it("persists each rating as its own log entry in review order", async () => {
      await seedDeck(["card-1"]);

      const ratings = [1, 2, 3, 4];
      for (const [index, rating] of ratings.entries()) {
        await recordReview({
          flashcardId: "card-1",
          rating: rating as 1 | 2 | 3 | 4,
          reviewedAt: NOW + index * 1_000,
        });
      }

      const logs = await listReviewLogs("card-1");
      expect(logs.map((log) => log.rating)).toEqual(ratings);
      expect(logs.map((log) => log.reviewedAt)).toEqual([
        NOW,
        NOW + 1_000,
        NOW + 2_000,
        NOW + 3_000,
      ]);
    });

    it("throws for an unknown flashcard and writes nothing", async () => {
      await expect(
        recordReview({ flashcardId: "missing-card", rating: 3, reviewedAt: NOW })
      ).rejects.toThrow(/not found/i);
      await expect(db.reviewLogs.count()).resolves.toBe(0);
    });

    it("maintains the dueAt === fsrs.due invariant across ratings", async () => {
      await seedDeck(["card-1"]);

      for (const rating of [3, 1, 4, 2] as const) {
        const { flashcard } = await recordReview({
          flashcardId: "card-1",
          rating,
          reviewedAt: NOW,
        });
        expect(flashcard.dueAt).toBe(flashcard.fsrs.due);
        // Verify persisted state also holds
        const stored = (await db.flashcards.get("card-1")) as Flashcard;
        expect(stored.dueAt).toBe(stored.fsrs.due);
      }
    });

    it("defaults elapsedMs to 0 and reviewedAt to Date.now when omitted", async () => {
      await seedDeck(["card-1"]);
      const before = Date.now();
      const { log } = await recordReview({ flashcardId: "card-1", rating: 3 });

      expect(log.elapsedMs).toBe(0);
      expect(log.reviewedAt).toBeGreaterThanOrEqual(before);
      expect(log.reviewedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("listDueFlashcardsByDeck", () => {
    it("returns only cards due at or before now, ordered by due date", async () => {
      const { deck } = await seedDeck([]);
      await db.flashcards.bulkAdd([
        makeCard("card-late", deck.id, NOW + 5_000),
        makeCard("card-early", deck.id, NOW - 5_000),
        makeCard("card-now", deck.id, NOW),
      ]);

      const due = await listDueFlashcardsByDeck(deck.id, NOW);

      expect(due.map((card) => card.id)).toEqual([
        "card-early",
        "card-now",
      ]);
    });

    it("excludes cards that belong to other decks", async () => {
      const { deck } = await seedDeck(["card-1"]);
      const other = await createDeck({
        courseId: deck.courseId,
        title: "Other deck",
      });
      await db.flashcards.bulkAdd([
        makeCard("card-other", other.id, NOW - 5_000),
      ]);

      const due = await listDueFlashcardsByDeck(deck.id, NOW);

      expect(due.map((card) => card.id)).toEqual(["card-1"]);
    });

    it("treats never-reviewed cards with a past due date as due", async () => {
      const { deck } = await seedDeck(["card-new"]);

      const due = await listDueFlashcardsByDeck(deck.id, NOW);

      expect(due).toHaveLength(1);
      expect(due[0].id).toBe("card-new");
      expect(due[0].fsrs.state).toBe(0); // New
      expect(due[0].fsrs.reps).toBe(0);
    });

    it("returns an empty array when nothing is due yet", async () => {
      const { deck } = await seedDeck([]);
      await db.flashcards.bulkAdd([
        makeCard("card-future", deck.id, NOW + 60_000),
      ]);

      await expect(listDueFlashcardsByDeck(deck.id, NOW)).resolves.toEqual([]);
    });
  });

  describe("listReviewLogs", () => {
    it("returns an empty array when the card has never been reviewed", async () => {
      await seedDeck(["card-1"]);

      await expect(listReviewLogs("card-1")).resolves.toEqual([]);
    });

    it("returns only the requested card's logs, in review order", async () => {
      await seedDeck(["card-1", "card-2"]);
      await recordReview({ flashcardId: "card-1", rating: 3, reviewedAt: NOW });
      await recordReview({
        flashcardId: "card-2",
        rating: 2,
        reviewedAt: NOW + 100,
      });
      await recordReview({
        flashcardId: "card-1",
        rating: 4,
        reviewedAt: NOW + 200,
      });

      const logs = await listReviewLogs("card-1");

      expect(logs.map((log) => log.id)).toHaveLength(2);
      expect(logs.map((log) => log.rating)).toEqual([3, 4]);
      expect(logs.map((log) => log.flashcardId)).toEqual(["card-1", "card-1"]);
    });
  });
});
