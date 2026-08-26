import { z } from "zod";

// ── Schemas ───────────────────────────────────────────────────────────

/** Input to the AI: source chunks + context for grounded generation. */
export const FlashcardGenerationInputSchema = z.object({
  chunks: z
    .array(
      z.object({
        ordinal: z.number(),
        content: z.string(),
      })
    )
    .min(1, "At least one source chunk is required"),
  deckTitle: z.string().min(1, "Deck title is required"),
  courseTitle: z.string().min(1, "Course title is required"),
  cardCount: z.number().int().min(1).max(50),
});

export type FlashcardGenerationInput = z.infer<
  typeof FlashcardGenerationInputSchema
>;/** Structured output from the AI: validated flashcard array. */
export const FlashcardOutputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  answer: z.string().min(1, "Answer is required"),
});

export const FlashcardGenerationOutputSchema = z.object({
  flashcards: z.array(FlashcardOutputSchema).min(1),
});

export type FlashcardGenerationOutput = z.infer<typeof FlashcardGenerationOutputSchema>;

// ── Feynman Evaluation ────────────────────────────────────────────

/** Input for Feynman evaluation: source chunks + concept + student explanation. */
export const FeynmanEvaluationInputSchema = z.object({
  chunks: z
    .array(z.object({ ordinal: z.number(), content: z.string() }))
    .min(1, "At least one source chunk is required for evaluation"),
  concept: z.string().min(1, "Concept is required"),
  explanation: z.string().min(1, "Explanation is required"),
  courseTitle: z.string().min(1, "Course title is required"),
});

export type FeynmanEvaluationInput = z.infer<typeof FeynmanEvaluationInputSchema>;

/** Structured output from AI evaluation of a Feynman explanation. */
export const FeynmanEvaluationOutputSchema = z.object({
  correctness: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  misconceptions: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  corrections: z.array(z.string()),
  summary: z.string().min(1),
  improvement: z.string().min(1),
  followUp: z.string().min(1),
});

export type FeynmanEvaluationOutput = z.infer<typeof FeynmanEvaluationOutputSchema>;

// ── Provider interface ────────────────────────────────────────────────

/**
 * Abstract AI provider. Implementations must:
 * - Accept structured input grounded in source chunks
 * - Return validated structured output (flashcards)
 * - Handle errors gracefully
 * - Never expose API keys in client bundles
 */
export interface AIProvider {
  readonly name: string;

  /**
   * Generate flashcards from source material.
   * Returns validated flashcards or throws on failure.
   */
  generateFlashcards(
    input: FlashcardGenerationInput
  ): Promise<FlashcardGenerationOutput>;

  /**
   * Evaluate a student's Feynman explanation against source material.
   * Returns structured feedback or throws on failure.
   */
  evaluateExplanation(
    input: FeynmanEvaluationInput
  ): Promise<FeynmanEvaluationOutput>;
}

// ── API key management ────────────────────────────────────────────────
// Key/config storage lives in ./config so the provider registry and settings
// UI share one source of truth. These re-exports preserve the established
// consumer API (call sites import getApiKey/setApiKey/etc from here).

export {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
} from "./config";
