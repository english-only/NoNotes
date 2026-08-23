import { describe, expect, it } from "vitest";

import {
  computeNextReview,
  createInitialState,
} from "./scheduler";

const NOW = 1_700_000_000_000; // fixed, deterministic timestamp

function reviewAtDue(state: ReturnType<typeof createInitialState>, rating: 1 | 2 | 3 | 4) {
  return computeNextReview(state, rating, state.due + 1);
}

describe("fsrs scheduler adapter", () => {
  describe("createInitialState", () => {
    it("creates a new card due immediately with a null last review", () => {
      const state = createInitialState(NOW);

      expect(state.version).toBe(1);
      expect(state.due).toBe(NOW);
      expect(state.last_review).toBeNull();
      expect(state.state).toBe(0); // New
      expect(state.reps).toBe(0);
      expect(state.lapses).toBe(0);
      expect(state.learning_steps).toBe(0);
      // A fresh card carries zero stability/difficulty until its first review.
      expect(state.stability).toBe(0);
      expect(state.difficulty).toBe(0);
    });
  });

  describe("computeNextReview", () => {
    it("produces a future due date for every rating, ordered Again <= Hard <= Good < Easy", () => {
      const initial = createInitialState(NOW);
      const again = computeNextReview(initial, 1, NOW);
      const hard = computeNextReview(initial, 2, NOW);
      const good = computeNextReview(initial, 3, NOW);
      const easy = computeNextReview(initial, 4, NOW);

      for (const result of [again, hard, good, easy]) {
        expect(result.dueAt).toBeGreaterThan(NOW);
      }
      expect(again.dueAt).toBeLessThanOrEqual(hard.dueAt);
      expect(hard.dueAt).toBeLessThanOrEqual(good.dueAt);
      expect(good.dueAt).toBeLessThan(easy.dueAt);
    });

    it("schedules an Again on a new card into short-term learning (same day)", () => {
      const result = computeNextReview(createInitialState(NOW), 1, NOW);

      expect(result.nextState.state).toBe(1); // Learning
      expect(result.dueAt - NOW).toBeLessThan(24 * 60 * 60 * 1000);
    });

    it("advances the card state and bumps reps across repeated good reviews", () => {
      let state = createInitialState(NOW);
      let previousInterval = 0;

      // Repeatedly review as soon as each card comes due.
      for (let i = 0; i < 10; i++) {
        const result = reviewAtDue(state, 3);
        const interval = result.dueAt - state.due;
        expect(result.nextState.reps).toBe(state.reps + 1);
        // Once in the review state, intervals grow monotonically.
        if (result.nextState.state === 2) {
          expect(interval).toBeGreaterThan(previousInterval);
        }
        previousInterval = interval;
        state = result.nextState;
      }

      // Enough good reviews graduate the card out of learning.
      expect(state.state).toBe(2); // Review
    });

    it("is deterministic with fuzzing disabled", () => {
      const state = createInitialState(NOW);
      const first = computeNextReview(state, 3, NOW);
      const second = computeNextReview(state, 3, NOW);

      expect(second).toEqual(first);
    });

    it("is a no-op for an invalid rating", () => {
      const state = createInitialState(NOW);

      expect(() => computeNextReview(state, 5 as 1 | 2 | 3 | 4, NOW)).toThrow(
        /rating/i
      );
    });
  });
});
