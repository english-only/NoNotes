import { describe, expect, it } from "vitest";

import {
  FlashcardGenerationInputSchema,
  FlashcardGenerationOutputSchema,
  type FlashcardGenerationInput,
} from "./provider";

describe("AI provider schemas", () => {
  describe("FlashcardGenerationInputSchema", () => {
    it("accepts valid input with chunks and deck info", () => {
      const input: FlashcardGenerationInput = {
        chunks: [
          { ordinal: 0, content: "Photosynthesis converts light energy into chemical energy." },
          { ordinal: 1, content: "Chlorophyll absorbs light in the red and blue wavelengths." },
        ],
        deckTitle: "Biology 101",
        courseTitle: "General Biology",
        cardCount: 5,
      };

      const result = FlashcardGenerationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty chunks array", () => {
      const result = FlashcardGenerationInputSchema.safeParse({
        chunks: [],
        deckTitle: "Test",
        courseTitle: "Course",
        cardCount: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing deckTitle", () => {
      const result = FlashcardGenerationInputSchema.safeParse({
        chunks: [{ ordinal: 0, content: "Some content" }],
        courseTitle: "Course",
        cardCount: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects cardCount below 1", () => {
      const result = FlashcardGenerationInputSchema.safeParse({
        chunks: [{ ordinal: 0, content: "Some content" }],
        deckTitle: "Test",
        courseTitle: "Course",
        cardCount: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("FlashcardGenerationOutputSchema", () => {
    it("accepts valid flashcard array", () => {
      const output = {
        flashcards: [
          { prompt: "What is photosynthesis?", answer: "The process of converting light energy to chemical energy." },
          { prompt: "What absorbs light in plants?", answer: "Chlorophyll." },
        ],
      };

      const result = FlashcardGenerationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flashcards).toHaveLength(2);
      }
    });

    it("rejects empty flashcards array", () => {
      const result = FlashcardGenerationOutputSchema.safeParse({
        flashcards: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects flashcard with empty prompt", () => {
      const result = FlashcardGenerationOutputSchema.safeParse({
        flashcards: [
          { prompt: "", answer: "Some answer" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects flashcard with empty answer", () => {
      const result = FlashcardGenerationOutputSchema.safeParse({
        flashcards: [
          { prompt: "Some question", answer: "" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects flashcard with missing prompt", () => {
      const result = FlashcardGenerationOutputSchema.safeParse({
        flashcards: [
          { answer: "Some answer" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects flashcard with missing answer", () => {
      const result = FlashcardGenerationOutputSchema.safeParse({
        flashcards: [
          { prompt: "Some question" },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
