/**
 * Pure FSRS-5 scheduling adapter. This module owns the scheduler math (delegated
 * to ts-fsrs) and the mapping between our versioned `FsrsState` and the
 * library's `Card`. It has no UI or persistence coupling. Fuzzing is disabled
 * so scheduling is deterministic for tests and analytics.
 */
import { Rating, createEmptyCard, fsrs } from "ts-fsrs";
import type { Card, Grade } from "ts-fsrs";

import type { FsrsState } from "@/lib/db/schema";

const SCHEDULER = fsrs({ enable_fuzz: false });

const GRADE_BY_RATING: Record<number, Grade | undefined> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

function toTsCard(state: FsrsState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    learning_steps: state.learning_steps,
    state: state.state,
    last_review:
      state.last_review === null ? undefined : new Date(state.last_review),
  };
}

function toFsrsState(card: Card): FsrsState {
  return {
    version: 1,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state as 0 | 1 | 2 | 3,
    last_review: card.last_review ? card.last_review.getTime() : null,
  };
}

/**
 * The scheduler-produced portion of a review that gets recorded in ReviewLog.
 * These are the card's pre-review values (FSRS revlog semantics).
 */
export type SchedulingSnapshot = {
  state: FsrsState["state"];
  stability: number;
  difficulty: number;
  /** The card's due date at the time of this review (ms). */
  due: number;
  scheduled_days: number;
  elapsed_days: number;
  last_elapsed_days: number;
  learning_steps: number;
};

export type NextReview = {
  nextState: FsrsState;
  dueAt: number;
  log: SchedulingSnapshot;
};

/** A brand-new, never-reviewed card due at `now`. */
export function createInitialState(now: number): FsrsState {
  return toFsrsState(createEmptyCard(new Date(now)));
}

/**
 * Compute the next card state for a review of `state` with `rating`
 * (1 = Again, 2 = Hard, 3 = Good, 4 = Easy) at time `now`.
 */
export function computeNextReview(
  state: FsrsState,
  rating: 1 | 2 | 3 | 4,
  now: number
): NextReview {
  const grade = GRADE_BY_RATING[rating];
  if (grade === undefined) {
    throw new Error(`Invalid rating: ${rating}`);
  }

  const { card, log } = SCHEDULER.next(toTsCard(state), new Date(now), grade);

  return {
    nextState: toFsrsState(card),
    dueAt: card.due.getTime(),
    log: {
      state: log.state as 0 | 1 | 2 | 3,
      stability: log.stability,
      difficulty: log.difficulty,
      due: log.due.getTime(),
      scheduled_days: log.scheduled_days,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      learning_steps: log.learning_steps,
    },
  };
}
