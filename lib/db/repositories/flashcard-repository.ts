import { db } from "@/lib/db/client";
import { createInitialState } from "@/lib/fsrs/scheduler";
import type { Flashcard } from "@/lib/db/schema";

export type FlashcardInput = {
  deckId: string;
  prompt: string;
  answer: string;
};

export type FlashcardPatch = Partial<Pick<Flashcard, "prompt" | "answer">>;

function assertNonEmpty(value: string, field: "prompt" | "answer"): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Flashcard ${field} is required.`);
  }
  return trimmed;
}

/** All flashcards for a deck, in creation order. */
export async function listFlashcardsByDeck(
  deckId: string
): Promise<Flashcard[]> {
  return db.flashcards.where("deckId").equals(deckId).sortBy("createdAt");
}

export async function getFlashcard(id: string): Promise<Flashcard | undefined> {
  return db.flashcards.get(id);
}

export async function createFlashcard(
  input: FlashcardInput
): Promise<Flashcard> {
  const deck = await db.decks.get(input.deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${input.deckId}`);
  }

  // Manual cards carry no source-chunk provenance and are due immediately so
  // they enter the review queue as soon as study sessions exist. They start
  // from the FSRS new-card state (no scheduling history).
  const now = Date.now();
  const flashcard: Flashcard = {
    id: crypto.randomUUID(),
    deckId: input.deckId,
    prompt: assertNonEmpty(input.prompt, "prompt"),
    answer: assertNonEmpty(input.answer, "answer"),
    sourceChunkIds: [],
    dueAt: now,
    createdAt: now,
    updatedAt: now,
    fsrs: createInitialState(now),
  };

  await db.flashcards.add(flashcard);
  return flashcard;
}

export async function updateFlashcard(
  id: string,
  patch: FlashcardPatch
): Promise<Flashcard> {
  const existing = await db.flashcards.get(id);
  if (!existing) {
    throw new Error(`Flashcard not found: ${id}`);
  }

  // Content edits intentionally leave dueAt untouched; resetting scheduling
  // state belongs to the FSRS phase.
  const updated: Flashcard = {
    ...existing,
    ...(patch.prompt !== undefined
      ? { prompt: assertNonEmpty(patch.prompt, "prompt") }
      : {}),
    ...(patch.answer !== undefined
      ? { answer: assertNonEmpty(patch.answer, "answer") }
      : {}),
    updatedAt: Date.now(),
  };

  await db.flashcards.put(updated);
  return updated;
}

export async function deleteFlashcard(id: string): Promise<void> {
  await db.flashcards.delete(id);
}
