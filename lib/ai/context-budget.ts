/**
 * Prompt context budget for AI calls.
 *
 * A 2 MB ingested page produces ~1000 chunks of up to 2000 chars; sending all
 * of it to the provider would be ~500K input tokens per call (cost + context
 * overflow). We cap the grounding context at 60,000 chars (~15K tokens) and
 * surface truncation in the UI.
 */

/** Maximum total characters of source material sent in one prompt. */
export const MAX_PROMPT_CHARS = 60_000;

export type CappedChunks = {
  chunks: { ordinal: number; content: string }[];
  truncated: boolean;
};

/**
 * Take the first chunks (in given order, typically ordinal order) whose
 * cumulative content fits the budget. A chunk is included whole or not at all.
 * Pure: returns new arrays, never mutates the input.
 */
export function capChunksToBudget(
  chunks: { ordinal: number; content: string }[],
  maxChars: number = MAX_PROMPT_CHARS
): CappedChunks {
  const kept: { ordinal: number; content: string }[] = [];
  let total = 0;

  for (const chunk of chunks) {
    if (total + chunk.content.length > maxChars) {
      break;
    }
    kept.push(chunk);
    total += chunk.content.length;
  }

  return {
    chunks: kept,
    truncated: kept.length < chunks.length,
  };
}
