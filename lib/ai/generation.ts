import { createInitialState } from "@/lib/fsrs/scheduler";
import { getSource } from "@/lib/db/repositories/source-repository";
import { listChunksBySource } from "@/lib/db/repositories/chunk-repository";
import { getDeck } from "@/lib/db/repositories/deck-repository";
import { getCourse } from "@/lib/db/repositories/course-repository";
import { db } from "@/lib/db/client";
import { MAX_PROMPT_CHARS } from "./context-budget";
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
  /**
   * True when some parts of the source could not be used because their
   * generation batch failed. With map-reduce batching the whole source is
   * always attempted, so this no longer means "material was dropped".
   */
  truncated: boolean;
  flashcards: { id: string; prompt: string; answer: string; sourceChunkIds: string[] }[];
};

export type GeneratedCard = {
  prompt: string;
  answer: string;
  sourceChunkIds: string[];
};

/**
 * Split chunks into contiguous prompt-budget batches (map-reduce "map" phase).
 * Every chunk is sent to the provider exactly once — nothing is dropped, so
 * large sources no longer get truncated to their first few chunks.
 * Pure: returns new arrays, never mutates the input.
 */
export function planGenerationBatches(
  chunks: { ordinal: number; content: string }[],
  maxChars: number = MAX_PROMPT_CHARS
): { ordinal: number; content: string }[][] {
  const batches: { ordinal: number; content: string }[][] = [];
  let current: { ordinal: number; content: string }[] = [];
  let total = 0;

  for (const chunk of chunks) {
    if (current.length > 0 && total + chunk.content.length > maxChars) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(chunk);
    total += chunk.content.length;
  }
  if (current.length > 0) batches.push(current);

  return batches;
}

/**
 * Generate flashcards from a source's chunks WITHOUT persisting.
 * Returns validated cards for user review before acceptance.
 *
 * Large sources are processed map-reduce style: the source is split into
 * prompt-budget batches and each batch produces its own cards, so the whole
 * document is used instead of only the beginning.
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
  const allChunks = await listChunksBySource(input.sourceId);
  if (allChunks.length === 0) {
    throw new Error("Source has no chunks to generate from");
  }

  // Map phase: split ALL chunks into contiguous prompt-budget batches.
  const batches = planGenerationBatches(
    allChunks.map((c) => ({ ordinal: c.ordinal, content: c.content }))
  );

  // Run batches with bounded concurrency. Each batch calls the provider
  // independently; a failed batch is isolated and logged rather than sinking
  // the whole generation — partial cards beat no cards.
  const BATCH_CONCURRENCY = 2;
  const results: {
    prompt: string;
    answer: string;
    sourceChunkIds: string[];
    firstOrdinal: number;
  }[] = [];
  const queue = batches.map((batch) => ({ batch }));
  const batchFailures: { firstOrdinal: number; error: unknown }[] = [];

  const runWorker = async (): Promise<void> => {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      try {
        const output: FlashcardGenerationOutput = await (
          input.provider
            ? input.provider.generateFlashcards({
                chunks: job.batch.map((c) => ({
                  ordinal: c.ordinal,
                  content: c.content,
                })),
                deckTitle: deck.title,
                courseTitle: course?.title ?? "Unknown course",
                cardCount: input.cardCount,
              })
            : (async () => {
                // The registry is imported dynamically so @google/genai + zod
                // stay out of the eager bundle of every module that imports
                // generation.ts (persisting cards must not pull the AI SDK).
                const { generateFlashcards: generateViaRegistry } = await import(
                  "./registry"
                );
                return generateViaRegistry({
                  chunks: job.batch.map((c) => ({
                    ordinal: c.ordinal,
                    content: c.content,
                  })),
                  deckTitle: deck.title,
                  courseTitle: course?.title ?? "Unknown course",
                  cardCount: input.cardCount,
                });
              })()
        );

        const batchChunkIds = allChunks
          .filter((c) => job.batch.some((b) => b.ordinal === c.ordinal))
          .map((c) => c.id);
        const firstOrdinal = job.batch[0]?.ordinal ?? 0;

        for (const card of output.flashcards) {
          const prompt = card.prompt.trim();
          const answer = card.answer.trim();
          if (prompt.length > 0 && answer.length > 0) {
            results.push({ prompt, answer, sourceChunkIds: batchChunkIds, firstOrdinal });
          }
        }
      } catch (err) {
        batchFailures.push({
          firstOrdinal: job.batch[0]?.ordinal ?? 0,
          error: err,
        });
        console.error(
          `[generation] batch starting at chunk ${job.batch[0]?.ordinal} failed; skipping it`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(BATCH_CONCURRENCY, batches.length) },
      runWorker,
    ),
  );

  if (results.length === 0 && batches.length > 0) {
    // Every batch failed — rethrow the first provider error so callers and
    // the UI see the real cause instead of a vague aggregate message.
    const first = batchFailures[0]?.error;
    if (first instanceof Error) throw first;
    throw new Error(
      "Card generation failed for all parts of the source. Check your AI provider settings and try again."
    );
  }

  // Reduce phase: merge batch results ordered by position in the source,
  // so cards read in the same order as the material they came from.
  const ordered = [...results].sort((a, b) => a.firstOrdinal - b.firstOrdinal);

  return {
    generated: ordered.length,
    // With map-reduce, the whole source is always attempted; `truncated`
    // now means "some batches failed", not "material was dropped up front".
    truncated: batchFailures.length > 0,
    flashcards: ordered.map((c) => ({
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
