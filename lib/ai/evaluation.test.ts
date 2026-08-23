import { describe, it, expect } from "vitest";
import { FeynmanEvaluationInputSchema, FeynmanEvaluationOutputSchema } from "./provider";
import { evaluateExplanation } from "./evaluation";
import type { AIProvider, FeynmanEvaluationOutput } from "./provider";

// ── Schema validation ──────────────────────────────────────────────

describe("FeynmanEvaluationInputSchema", () => {
  it("accepts valid input", () => {
    const result = FeynmanEvaluationInputSchema.safeParse({
      chunks: [{ ordinal: 0, content: "Some content" }],
      concept: "Photosynthesis",
      explanation: "Plants convert sunlight into energy.",
      courseTitle: "Biology",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty chunks", () => {
    const result = FeynmanEvaluationInputSchema.safeParse({
      chunks: [],
      concept: "Photosynthesis",
      explanation: "Some explanation.",
      courseTitle: "Biology",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty concept", () => {
    const result = FeynmanEvaluationInputSchema.safeParse({
      chunks: [{ ordinal: 0, content: "Content" }],
      concept: "",
      explanation: "Some explanation.",
      courseTitle: "Biology",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty explanation", () => {
    const result = FeynmanEvaluationInputSchema.safeParse({
      chunks: [{ ordinal: 0, content: "Content" }],
      concept: "Photosynthesis",
      explanation: "",
      courseTitle: "Biology",
    });
    expect(result.success).toBe(false);
  });
});

describe("FeynmanEvaluationOutputSchema", () => {
  it("accepts valid output", () => {
    const result = FeynmanEvaluationOutputSchema.safeParse({
      correctness: 0.8,
      completeness: 0.6,
      clarity: 0.9,
      misconceptions: [],
      missingConcepts: ["chlorophyll"],
      corrections: [],
      summary: "Good understanding.",
      improvement: "Add more detail.",
      followUp: "What is the Calvin cycle?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores out of range", () => {
    const result = FeynmanEvaluationOutputSchema.safeParse({
      correctness: 1.5,
      completeness: 0.6,
      clarity: 0.9,
      misconceptions: [],
      missingConcepts: [],
      corrections: [],
      summary: "Good.",
      improvement: "Better.",
      followUp: "Why?",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing summary", () => {
    const result = FeynmanEvaluationOutputSchema.safeParse({
      correctness: 0.8,
      completeness: 0.6,
      clarity: 0.9,
      misconceptions: [],
      missingConcepts: [],
      corrections: [],
      summary: "",
      improvement: "Better.",
      followUp: "Why?",
    });
    expect(result.success).toBe(false);
  });
});

// ── Evaluation service ─────────────────────────────────────────────

function createMockProvider(
  output: FeynmanEvaluationOutput
): AIProvider {
  return {
    name: "mock",
    generateFlashcards: async () => ({ flashcards: [] }),
    evaluateExplanation: async () => output,
  };
}

function createFailingProvider(error: string): AIProvider {
  return {
    name: "mock-failing",
    generateFlashcards: async () => ({ flashcards: [] }),
    evaluateExplanation: async () => {
      throw new Error(error);
    },
  };
}

describe("evaluateExplanation", () => {
  const validOutput: FeynmanEvaluationOutput = {
    correctness: 0.8,
    completeness: 0.6,
    clarity: 0.9,
    misconceptions: ["Misconception about X"],
    missingConcepts: ["Chlorophyll"],
    corrections: ["Correction: Y is actually Z"],
    summary: "Good understanding overall.",
    improvement: "Include more detail about the light reactions.",
    followUp: "What role does water play in photosynthesis?",
  };

  it("returns structured feedback from the provider", async () => {
    const result = await evaluateExplanation({
      provider: createMockProvider(validOutput),
      chunks: [{ ordinal: 0, content: "Photosynthesis is the process..." }],
      concept: "Photosynthesis",
      explanation: "Plants use sunlight to make food.",
      courseTitle: "Biology",
    });

    expect(result.correctness).toBe(0.8);
    expect(result.missingConcepts).toContain("Chlorophyll");
    expect(result.summary).toBe("Good understanding overall.");
  });

  it("throws on provider failure", async () => {
    await expect(
      evaluateExplanation({
        provider: createFailingProvider("API error"),
        chunks: [{ ordinal: 0, content: "Content" }],
        concept: "Test",
        explanation: "Test explanation",
        courseTitle: "Course",
      })
    ).rejects.toThrow("API error");
  });

  it("validates output against schema", async () => {
    // Provider returns invalid output (missing required fields)
    const badProvider: AIProvider = {
      name: "bad",
      generateFlashcards: async () => ({ flashcards: [] }),
      evaluateExplanation: async () => {
        return { correctness: 0.5 } as unknown as FeynmanEvaluationOutput;
      },
    };

    await expect(
      evaluateExplanation({
        provider: badProvider,
        chunks: [{ ordinal: 0, content: "Content" }],
        concept: "Test",
        explanation: "Test explanation",
        courseTitle: "Course",
      })
    ).rejects.toThrow();
  });

  it("returns an empty feedback array for empty misconceptions", async () => {
    const result = await evaluateExplanation({
      provider: createMockProvider({
        ...validOutput,
        misconceptions: [],
        missingConcepts: [],
        corrections: [],
      }),
      chunks: [{ ordinal: 0, content: "Content" }],
      concept: "Test",
      explanation: "Test explanation",
      courseTitle: "Course",
    });

    expect(result.misconceptions).toEqual([]);
    expect(result.missingConcepts).toEqual([]);
    expect(result.corrections).toEqual([]);
  });
});
