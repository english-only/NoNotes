import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "./course-repository";
import { createDeck } from "./deck-repository";
import {
  createFlashcard,
  deleteFlashcard,
  getFlashcard,
  listFlashcardsByDeck,
  updateFlashcard,
} from "./flashcard-repository";

// Small delay so consecutive writes land in distinct milliseconds and
// createdAt-ordering assertions are deterministic.
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

describe("flashcard repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.decks.clear();
    await db.flashcards.clear();
  });

  describe("createFlashcard", () => {
    it("persists a flashcard with trimmed fields, empty sourceChunkIds, and dueAt = createdAt", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const before = Date.now();
      const card = await createFlashcard({
        deckId: deck.id,
        prompt: "  What is ATP?  ",
        answer: "  Adenosine triphosphate  ",
      });
      const after = Date.now();

      expect(card.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(card.deckId).toBe(deck.id);
      expect(card.prompt).toBe("What is ATP?");
      expect(card.answer).toBe("Adenosine triphosphate");
      expect(card.sourceChunkIds).toEqual([]);
      expect(card.createdAt).toBeGreaterThanOrEqual(before);
      expect(card.createdAt).toBeLessThanOrEqual(after);
      expect(card.dueAt).toBe(card.createdAt);
      expect(card.updatedAt).toBe(card.createdAt);

      const stored = await db.flashcards.get(card.id);
      expect(stored).toEqual(card);
    });

    it("rejects an empty or whitespace-only prompt", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });

      await expect(
        createFlashcard({ deckId: deck.id, prompt: "   ", answer: "ATP" })
      ).rejects.toThrow(/prompt/i);
      await expect(
        createFlashcard({ deckId: deck.id, prompt: "", answer: "ATP" })
      ).rejects.toThrow(/prompt/i);
    });

    it("rejects an empty or whitespace-only answer", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });

      await expect(
        createFlashcard({ deckId: deck.id, prompt: "ATP?", answer: "  " })
      ).rejects.toThrow(/answer/i);
    });

    it("throws when the deck does not exist", async () => {
      await expect(
        createFlashcard({ deckId: "missing-deck", prompt: "ATP?", answer: "ATP" })
      ).rejects.toThrow(/deck/i);
    });
  });

  describe("listFlashcardsByDeck", () => {
    it("returns an empty array when the deck has no flashcards", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });

      await expect(listFlashcardsByDeck(deck.id)).resolves.toEqual([]);
    });

    it("returns flashcards in creation order", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const first = await createFlashcard({
        deckId: deck.id,
        prompt: "What is a cell?",
        answer: "Basic unit of life",
      });
      await tick();
      const second = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });
      await tick();
      const third = await createFlashcard({
        deckId: deck.id,
        prompt: "What is DNA?",
        answer: "Genetic material",
      });

      const cards = await listFlashcardsByDeck(deck.id);
      expect(cards.map((card) => card.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it("returns only flashcards belonging to the requested deck", async () => {
      const course = await createCourse({ title: "Biology" });
      const cells = await createDeck({ courseId: course.id, title: "Cells" });
      const genetics = await createDeck({ courseId: course.id, title: "Genetics" });
      const cellCard = await createFlashcard({
        deckId: cells.id,
        prompt: "What is a cell?",
        answer: "Basic unit of life",
      });
      await createFlashcard({
        deckId: genetics.id,
        prompt: "What is a gene?",
        answer: "A unit of heredity",
      });

      const cards = await listFlashcardsByDeck(cells.id);
      expect(cards.map((card) => card.id)).toEqual([cellCard.id]);
    });
  });

  describe("getFlashcard", () => {
    it("returns the flashcard for a known id", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const created = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });

      await expect(getFlashcard(created.id)).resolves.toEqual(created);
    });

    it("returns undefined for an unknown id", async () => {
      await expect(getFlashcard("missing-id")).resolves.toBeUndefined();
    });
  });

  describe("updateFlashcard", () => {
    it("updates prompt and answer, bumps updatedAt, and preserves id, deckId, createdAt, and dueAt", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const created = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });
      await tick();

      const updated = await updateFlashcard(created.id, {
        prompt: "  What does ATP stand for?  ",
        answer: "  Adenosine triphosphate  ",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.deckId).toBe(deck.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.dueAt).toBe(created.dueAt);
      expect(updated.prompt).toBe("What does ATP stand for?");
      expect(updated.answer).toBe("Adenosine triphosphate");
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      const stored = await db.flashcards.get(created.id);
      expect(stored).toEqual(updated);
    });

    it("rejects an empty or whitespace-only prompt", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const created = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });

      await expect(updateFlashcard(created.id, { prompt: " " })).rejects.toThrow(
        /prompt/i
      );
    });

    it("rejects an empty or whitespace-only answer", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const created = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });

      await expect(updateFlashcard(created.id, { answer: " " })).rejects.toThrow(
        /answer/i
      );
    });

    it("throws when the flashcard does not exist", async () => {
      await expect(
        updateFlashcard("missing-id", { prompt: "Nope" })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("deleteFlashcard", () => {
    it("removes the flashcard", async () => {
      const course = await createCourse({ title: "Biology" });
      const deck = await createDeck({ courseId: course.id, title: "Cells" });
      const created = await createFlashcard({
        deckId: deck.id,
        prompt: "What is ATP?",
        answer: "Energy currency",
      });

      await deleteFlashcard(created.id);

      await expect(getFlashcard(created.id)).resolves.toBeUndefined();
      await expect(listFlashcardsByDeck(deck.id)).resolves.toEqual([]);
    });

    it("is a no-op for an unknown id", async () => {
      await expect(deleteFlashcard("missing-id")).resolves.toBeUndefined();
    });
  });
});
