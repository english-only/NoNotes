import { GoogleGenAI } from "@google/genai";

import {
  FeynmanEvaluationInputSchema,
  FeynmanEvaluationOutputSchema,
  FlashcardGenerationInputSchema,
  FlashcardGenerationOutputSchema,
  type AIProvider,
  type FeynmanEvaluationInput,
  type FeynmanEvaluationOutput,
  type FlashcardGenerationInput,
  type FlashcardGenerationOutput,
} from "./provider";

const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * Build the prompt that instructs Gemini to generate flashcards grounded
 * in the supplied source chunks. The prompt is versionable and isolated
 * from UI (per spec §43).
 */
function buildPrompt(input: FlashcardGenerationInput): string {
  const chunkText = input.chunks
    .map((c) => `[Chunk ${c.ordinal}]\n${c.content}`)
    .join("\n\n");

  return `You are a study material generator for a student studying "${input.courseTitle}".

Generate exactly ${input.cardCount} flashcards for the deck "${input.deckTitle}" based on the following source material.

SOURCE MATERIAL:
${chunkText}

RULES:
- Each flashcard must be grounded in the source material above.
- Do NOT invent facts not present in the source chunks.
- Questions should test understanding, not just recall.
- Answers should be concise but complete.
- Use clear, direct language.

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "flashcards": [
    { "prompt": "Question text", "answer": "Answer text" },
    ...
  ]
}`;
}

/**
 * Gemini AI provider. Uses the @google/genai SDK to generate
 * flashcards from source material with structured output validation.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateFlashcards(
    input: FlashcardGenerationInput
  ): Promise<FlashcardGenerationOutput> {
    // Validate input
    const validatedInput = FlashcardGenerationInputSchema.parse(input);

    const prompt = buildPrompt(validatedInput);

    const response = await this.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    // Strip markdown fences if present
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Gemini returned invalid JSON: ${cleaned.substring(0, 200)}`
      );
    }

    // Validate output against schema
    const result = FlashcardGenerationOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Gemini output validation failed: ${result.error.message}`
      );
    }

    return result.data;
  }

  /**
   * Build the Feynman evaluation prompt (versionable, isolated from UI per §43).
   */
  private buildEvaluationPrompt(input: FeynmanEvaluationInput): string {
    const chunkText = input.chunks
      .map((c) => `[Chunk ${c.ordinal}]\n${c.content}`)
      .join("\n\n");

    return `You are an expert tutor evaluating a student's understanding of a concept.

COURSE: ${input.courseTitle}
CONCEPT: ${input.concept}

SOURCE MATERIAL:
${chunkText}

STUDENT'S EXPLANATION:
${input.explanation}

Evaluate the student's explanation. Be specific and grounded in the source material.
Prioritize genuine understanding over superficial keyword matching.

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "correctness": <0.0 to 1.0>,
  "completeness": <0.0 to 1.0>,
  "clarity": <0.0 to 1.0>,
  "misconceptions": [<list of identified misconceptions>],
  "missingConcepts": [<concepts from source material not mentioned>],
  "corrections": [<specific corrections to inaccurate statements>],
  "summary": "<1-2 sentence overall assessment>",
  "improvement": "<specific actionable suggestion>",
  "followUp": "<a follow-up question to deepen understanding>"
}`;
  }

  async evaluateExplanation(
    input: FeynmanEvaluationInput
  ): Promise<FeynmanEvaluationOutput> {
    const validatedInput = FeynmanEvaluationInputSchema.parse(input);

    const prompt = this.buildEvaluationPrompt(validatedInput);

    const response = await this.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Gemini returned invalid JSON: ${cleaned.substring(0, 200)}`
      );
    }

    const result = FeynmanEvaluationOutputSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Gemini evaluation output validation failed: ${result.error.message}`
      );
    }

    return result.data;
  }
}
