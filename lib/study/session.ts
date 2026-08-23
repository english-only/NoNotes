/**
 * Pure study-session state machine. This module owns no persistence and no
 * scheduling: ratings are session-local, and a card rated "Again" is simply
 * re-queued at the end of the current session. Writing review logs and
 * computing next review dates belongs to the FSRS phase.
 */

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy (matches ReviewLog.rating). */
export type Rating = 1 | 2 | 3 | 4;

export type SessionPhase = "idle" | "revealed" | "complete";

export type StudySessionState = {
  /** Remaining card ids; the front of the queue is the current card. */
  queue: string[];
  currentId: string | null;
  /** Number of ratings given (including re-queued "Again" ratings). */
  reviewed: number;
  /** Unique card ids that have received at least one rating. */
  reviewedIds: Set<string>;
  phase: SessionPhase;
};

export function startSession(cardIds: string[]): StudySessionState {
  if (cardIds.length === 0) {
    return {
      queue: [],
      currentId: null,
      reviewed: 0,
      reviewedIds: new Set(),
      phase: "complete",
    };
  }
  return {
    queue: [...cardIds],
    currentId: cardIds[0],
    reviewed: 0,
    reviewedIds: new Set(),
    phase: "idle",
  };
}

export function reveal(state: StudySessionState): StudySessionState {
  if (state.phase === "idle") {
    return { ...state, phase: "revealed" };
  }
  return state;
}

export function rate(state: StudySessionState, rating: Rating): StudySessionState {
  if (state.phase === "complete" || state.currentId === null) {
    return state;
  }
  if (![1, 2, 3, 4].includes(rating)) {
    return state;
  }

  const [current, ...rest] = state.queue;
  const queue = rating === 1 ? [...rest, current] : rest;
  const reviewed = state.reviewed + 1;
  const reviewedIds = new Set(state.reviewedIds);
  reviewedIds.add(current);

  if (queue.length === 0) {
    return { queue: [], currentId: null, reviewed, reviewedIds, phase: "complete" };
  }
  return { queue, currentId: queue[0], reviewed, reviewedIds, phase: "idle" };
}
