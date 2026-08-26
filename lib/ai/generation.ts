import { createInitialState } from "@/lib/fsrs/scheduler";
import { getSource } from "@/lib/db/repositories/source-repository";
import { listChunksBySource } from "@/lib/db/repositories/chunk-repository";
import { getDeck } from "@/lib/db/repositories/deck-repository";
import { getCourse } from "@/lib/db/repositories/course-repository";
import { db } from "@/lib/db/client";
import { generateFlashcards as generateViaRegistry } from "./registry";
import type { AIProvider, FlashcardGenerationOutput } from "./provider";

export type GenerateFromSourceInput = {
  /** Optional explicit provider. When omitted, the configured provider chain is used. */
  provider?: AIProvider;
  sourceId: string;
  deckId: string;
  cardCount: number;
};

export type GenerateResult = {
  generated: number;
  flashcards: { id: string; prompt: string; answer: string; sourceChunkIds: string[] }[];
};

export type GeneratedCard = {
  prompt: string;
  answer: string;
  sourceChunkIds: string[];
};

/**
 * Generate flashcards from a source's chunks WITHOUT persisting.
 * Returns validated cards for user review before acceptance.
 */
export async function generateFromSource(
  input: GenerateFromSourceInput
): Promise<GenerateResult> {
  // Validate source exists
  const source = await getSource(input.sourceId);
  if (!source) {
    throw new Error(`Source not found: ${input.sourceId}`);
  }

  // Validate deck exists
  const deck = await getDeck(input.deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${input.deckId}`);
  }

  // Get course for context
  const course = await getCourse(deck.courseId);

  // Get chunks from the source
  const chunks = await listChunksBySource(input.sourceId);
  if (chunks.length === 0) {
    throw new Error("Source has no chunks to generate from");
  }

  // Call the AI provider (explicit instance, or the configured chain).
  const output: FlashcardGenerationOutput = input.provider
    ? await input.provider.generateFlashcards({
        chunks: chunks.map((c) => ({ ordinal: c.ordinal, content: c.content })),
        deckTitle: deck.title,
        courseTitle: course?.title ?? "Unknown course",
        cardCount: input.cardCount,
      })
    : await generateViaRegistry({
        chunks: chunks.map((c) => ({ ordinal: c.ordinal, content: c.content })),
        deckTitle: deck.title,
        courseTitle: course?.title ?? "Unknown course",
        cardCount: input.cardCount,
      });

  // Validate and trim each card
  const validated = output.flashcards
    .map((card) => ({
      prompt: card.prompt.trim(),
      answer: card.answer.trim(),
      sourceChunkIds: chunks.map((c) => c.id),
    }))
    .filter((card) => card.prompt.length > 0 && card.answer.length > 0);

  return {
    generated: validated.length,
    flashcards: validated.map((c) => ({
      id: crypto.randomUUID(),
      prompt: c.prompt,
      answer: c.answer,
      sourceChunkIds: c.sourceChunkIds,
    })),
  };
}

/**
 * Persist accepted generated cards to the target deck.
 * Only cards in the `accepted` array are written.
 */
export async function persistAcceptedCards(
  deckId: string,
  accepted: GeneratedCard[]
): Promise<number> {
  if (accepted.length === 0) return 0;

  const now = Date.now();
  const flashcardRecords = accepted.map((card) => ({
    id: crypto.randomUUID(),
    deckId,
    prompt: card.prompt,
    answer: card.answer,
    sourceChunkIds: card.sourceChunkIds,
    dueAt: now,
    createdAt: now,
    updatedAt: now,
    fsrs: createInitialState(now),
  }));

  await db.flashcards.bulkAdd(flashcardRecords);
  return flashcardRecords.length;
}
