import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the @google/genai module BEFORE importing the provider
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: mockGenerateContent };
    },
  };
});

import { GeminiProvider } from "./gemini";

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiProvider("test-api-key");
  });

  it("has the correct name", () => {
    expect(provider.name).toBe("gemini");
  });

  it("generates flashcards from source chunks", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        flashcards: [
          {
            prompt: "What is photosynthesis?",
            answer:
              "The process by which plants convert light energy into chemical energy stored in glucose.",
          },
          {
            prompt: "What role does chlorophyll play?",
            answer:
              "Chlorophyll absorbs light energy, primarily in the red and blue wavelengths.",
          },
        ],
      }),
    });

    const result = await provider.generateFlashcards({
      chunks: [
        { ordinal: 0, content: "Photosynthesis converts light energy into chemical energy." },
        { ordinal: 1, content: "Chlorophyll absorbs light in the red and blue wavelengths." },
      ],
      deckTitle: "Biology 101",
      courseTitle: "General Biology",
      cardCount: 5,
    });

    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0].prompt).toContain("photosynthesis");
    expect(result.flashcards[0].answer).toContain("light energy");
  });

  it("throws on invalid AI output (validation fails)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ flashcards: [] }),
    });

    await expect(
      provider.generateFlashcards({
        chunks: [{ ordinal: 0, content: "Some content." }],
        deckTitle: "Test",
        courseTitle: "Course",
        cardCount: 3,
      })
    ).rejects.toThrow();
  });

  it("throws on malformed JSON from AI", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not valid JSON at all.",
    });

    await expect(
      provider.generateFlashcards({
        chunks: [{ ordinal: 0, content: "Some content." }],
        deckTitle: "Test",
        courseTitle: "Course",
        cardCount: 3,
      })
    ).rejects.toThrow();
  });

  it("throws on API error", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API quota exceeded"));

    await expect(
      provider.generateFlashcards({
        chunks: [{ ordinal: 0, content: "Some content." }],
        deckTitle: "Test",
        courseTitle: "Course",
        cardCount: 3,
      })
    ).rejects.toThrow("API quota exceeded");
  });

  it("evaluates a Feynman explanation", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        correctness: 0.8,
        completeness: 0.6,
        clarity: 0.9,
        misconceptions: [],
        missingConcepts: ["chlorophyll"],
        corrections: [],
        summary: "Good understanding but missing detail.",
        improvement: "Include chlorophyll role.",
        followUp: "What is the Calvin cycle?",
      }),
    });

    const result = await provider.evaluateExplanation({
      chunks: [{ ordinal: 0, content: "Photosynthesis converts light energy." }],
      concept: "Photosynthesis",
      explanation: "Plants use sunlight to make food.",
      courseTitle: "Biology",
    });

    expect(result.correctness).toBe(0.8);
    expect(result.missingConcepts).toContain("chlorophyll");
    expect(result.followUp).toContain("Calvin cycle");
  });

  it("throws on invalid evaluation output", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ correctness: 0.5 }),
    });

    await expect(
      provider.evaluateExplanation({
        chunks: [{ ordinal: 0, content: "Content" }],
        concept: "Test",
        explanation: "Test",
        courseTitle: "Course",
      })
    ).rejects.toThrow();
  });
});
