import { db } from "@/lib/db/client";
import { computeNextReview } from "@/lib/fsrs/scheduler";
import { getFlashcard } from "./flashcard-repository";
import type { Flashcard, ReviewLog } from "@/lib/db/schema";

export type ReviewRating = 1 | 2 | 3 | 4;

export type RecordReviewInput = {
  flashcardId: string;
  rating: ReviewRating;
  /** Review timestamp; defaults to now. Injectable for deterministic tests. */
  reviewedAt?: number;
  /** Time from answer reveal to rating, when known. */
  elapsedMs?: number;
};

export type RecordReviewResult = {
  flashcard: Flashcard;
  log: ReviewLog;
};

/**
 * Persist a single review: append the review log and update the card's
 * scheduling state in one transaction. The caller advances the study session
 * only after this resolves, so a failed write never loses a rating.
 */
export async function recordReview(
  input: RecordReviewInput
): Promise<RecordReviewResult> {
  const card = await getFlashcard(input.flashcardId);
  if (!card) {
    throw new Error(`Flashcard not found: ${input.flashcardId}`);
  }

  const reviewedAt = input.reviewedAt ?? Date.now();
  const { nextState, dueAt, log } = computeNextReview(
    card.fsrs,
    input.rating,
    reviewedAt
  );

  const reviewLog: ReviewLog = {
    id: crypto.randomUUID(),
    flashcardId: card.id,
    rating: input.rating,
    reviewedAt,
    elapsedMs: input.elapsedMs ?? 0,
    state: log.state,
    stability: log.stability,
    difficulty: log.difficulty,
    due: log.due,
    scheduled_days: log.scheduled_days,
    elapsed_days: log.elapsed_days,
    last_elapsed_days: log.last_elapsed_days,
    learning_steps: log.learning_steps,
  };

  const updatedCard: Flashcard = {
    ...card,
    fsrs: nextState,
    dueAt,
    updatedAt: reviewedAt,
  };

  await db.transaction("rw", db.flashcards, db.reviewLogs, async () => {
    await db.reviewLogs.add(reviewLog);
    await db.flashcards.put(updatedCard);
  });

  return { flashcard: updatedCard, log: reviewLog };
}

/** Cards in `deckId` whose due date is at or before `now`, in due order. */
export async function listDueFlashcardsByDeck(
  deckId: string,
  now = Date.now()
): Promise<Flashcard[]> {
  // [deckId+dueAt] compound index: sorted by due date within the deck.
  return db.flashcards
    .where("[deckId+dueAt]")
    .between([deckId, Number.NEGATIVE_INFINITY], [deckId, now], true, true)
    .toArray();
}

/** A card's review history, oldest first. */
export async function listReviewLogs(
  flashcardId: string
): Promise<ReviewLog[]> {
  return db.reviewLogs
    .where("flashcardId")
    .equals(flashcardId)
    .sortBy("reviewedAt");
}
