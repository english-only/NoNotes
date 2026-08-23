import {
  FeynmanEvaluationOutputSchema,
  type AIProvider,
  type FeynmanEvaluationInput,
  type FeynmanEvaluationOutput,
} from "./provider";

export type EvaluateExplanationInput = {
  provider: AIProvider;
  chunks: { ordinal: number; content: string }[];
  concept: string;
  explanation: string;
  courseTitle: string;
};

/**
 * Evaluate a student's Feynman explanation against source material.
 * The evaluation is source-grounded: the AI receives the relevant chunks
 * and must base its feedback on them rather than general knowledge.
 */
export async function evaluateExplanation(
  input: EvaluateExplanationInput
): Promise<FeynmanEvaluationOutput> {
  if (input.chunks.length === 0) {
    throw new Error("At least one source chunk is required for evaluation");
  }

  const evaluationInput: FeynmanEvaluationInput = {
    chunks: input.chunks,
    concept: input.concept.trim(),
    explanation: input.explanation.trim(),
    courseTitle: input.courseTitle,
  };

  const output = await input.provider.evaluateExplanation(evaluationInput);

  // Defense-in-depth: validate provider output even if the provider already did.
  const validated = FeynmanEvaluationOutputSchema.safeParse(output);
  if (!validated.success) {
    throw new Error(
      `Evaluation output validation failed: ${validated.error.message}`
    );
  }

  return validated.data;
}
