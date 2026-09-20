import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createInitialState } from "@/lib/fsrs/scheduler";
import type {
  Chunk,
  FeynmanAttempt,
  Flashcard,
  ReviewLog,
  Source,
} from "@/lib/db/schema";
import { createCourse, deleteCourse } from "./course-repository";
import { createDeck, deleteDeck } from "./deck-repository";
import { deleteFlashcard } from "./flashcard-repository";
import { createTopic, deleteTopic } from "./topic-repository";

async function seedSource(source: Partial<Source> & { id: string; courseId: string }): Promise<Source> {
  const row: Source = {
    topicId: undefined,
    title: `Source ${source.id}`,
    type: "text",
    rawContent: "raw",
    processedContent: "processed",
    createdAt: 1,
    updatedAt: 1,
    ...source,
  };
  await db.sources.add(row);
  return row;
}

async function seedChunk(chunk: Partial<Chunk> & { id: string; sourceId: string }): Promise<Chunk> {
  const row: Chunk = {
    ordinal: 0,
    content: "chunk text",
    createdAt: 1,
    ...chunk,
  };
  await db.chunks.add(row);
  return row;
}

async function seedFlashcard(
  flashcard: Partial<Flashcard> & { id: string; deckId: string }
): Promise<Flashcard> {
  const row: Flashcard = {
    prompt: `P ${flashcard.id}`,
    answer: `A ${flashcard.id}`,
    sourceChunkIds: [],
    dueAt: 1,
    createdAt: 1,
    updatedAt: 1,
    fsrs: createInitialState(1),
    ...flashcard,
  };
  await db.flashcards.add(row);
  return row;
}

async function seedReviewLog(
  log: Partial<ReviewLog> & { id: string; flashcardId: string }
): Promise<ReviewLog> {
  const row: ReviewLog = {
    rating: 3,
    reviewedAt: 1,
    elapsedMs: 0,
    state: 0,
    stability: 0,
    difficulty: 0,
    due: 1,
    scheduled_days: 0,
    elapsed_days: 0,
    last_elapsed_days: 0,
    learning_steps: 0,
    ...log,
  };
  await db.reviewLogs.add(row);
  return row;
}

async function seedAttempt(
  attempt: Partial<FeynmanAttempt> & { id: string; courseId: string }
): Promise<FeynmanAttempt> {
  const row: FeynmanAttempt = {
    deckId: undefined,
    concept: "concept",
    explanation: "explanation",
    feedback: {
      correctness: 1,
      completeness: 1,
      clarity: 1,
      misconceptions: [],
      missingConcepts: [],
      corrections: [],
      summary: "s",
      improvement: "i",
      followUp: "f",
    },
    sourceChunkIds: [],
    createdAt: 1,
    ...attempt,
  };
  await db.feynmanAttempts.add(row);
  return row;
}

describe("delete cascades leave zero orphan rows", () => {
  beforeEach(async () => {
    await Promise.all(
      DexieTables.map((table) => db[table].clear())
    );
  });

  describe("deleteCourse", () => {
    it("deletes its sources, chunks, feynman attempts, and review logs", async () => {
      const course = await createCourse({ title: "Doomed" });
      const other = await createCourse({ title: "Survives" });

      const source = await seedSource({ id: "src-1", courseId: course.id });
      await seedSource({ id: "src-2", courseId: other.id });
      await seedChunk({ id: "chunk-1", sourceId: source.id, ordinal: 0 });
      await seedChunk({ id: "chunk-2", sourceId: "src-2", ordinal: 0 });

      const deck = await createDeck({ courseId: course.id, title: "Deck" });
      const card = await seedFlashcard({ id: "card-1", deckId: deck.id });
      await seedReviewLog({ id: "log-1", flashcardId: card.id });

      const otherDeck = await createDeck({ courseId: other.id, title: "Other deck" });
      const otherCard = await seedFlashcard({ id: "card-2", deckId: otherDeck.id });
      await seedReviewLog({ id: "log-2", flashcardId: otherCard.id });

      await seedAttempt({ id: "attempt-1", courseId: course.id, deckId: deck.id });
      await seedAttempt({ id: "attempt-2", courseId: other.id });

      await deleteCourse(course.id);

      // Everything belonging to the deleted course is gone.
      await expect(db.sources.get("src-1")).resolves.toBeUndefined();
      await expect(db.chunks.get("chunk-1")).resolves.toBeUndefined();
      await expect(db.feynmanAttempts.get("attempt-1")).resolves.toBeUndefined();
      await expect(db.reviewLogs.get("log-1")).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-1")).resolves.toBeUndefined();
      await expect(db.decks.get(deck.id)).resolves.toBeUndefined();

      // Rows belonging to the other course are untouched.
      await expect(db.sources.get("src-2")).resolves.toBeDefined();
      await expect(db.chunks.get("chunk-2")).resolves.toBeDefined();
      await expect(db.feynmanAttempts.get("attempt-2")).resolves.toBeDefined();
      await expect(db.reviewLogs.get("log-2")).resolves.toBeDefined();
    });
  });

  describe("deleteTopic", () => {
    it("detaches decks and sources (nulls topicId) instead of orphaning them", async () => {
      const course = await createCourse({ title: "Course" });
      const topic = await createTopic({ courseId: course.id, title: "Topic" });
      const otherTopic = await createTopic({ courseId: course.id, title: "Kept" });

      const deck = await createDeck({
        courseId: course.id,
        topicId: topic.id,
        title: "Deck",
      });
      const source = await seedSource({
        id: "src-1",
        courseId: course.id,
        topicId: topic.id,
      });

      await deleteTopic(topic.id);

      await expect(db.topics.get(topic.id)).resolves.toBeUndefined();

      // Decks and sources survive with topicId cleared, not dangling.
      const storedDeck = await db.decks.get(deck.id);
      expect(storedDeck).toBeDefined();
      expect(storedDeck?.topicId).toBeUndefined();

      const storedSource = await db.sources.get(source.id);
      expect(storedSource).toBeDefined();
      expect(storedSource?.topicId).toBeUndefined();

      // Unrelated topics are untouched.
      await expect(db.topics.get(otherTopic.id)).resolves.toBeDefined();
    });
  });

  describe("deleteDeck", () => {
    it("deletes the deck's review logs and feynman attempts along with its cards", async () => {
      const course = await createCourse({ title: "Course" });
      const deck = await createDeck({ courseId: course.id, title: "Doomed deck" });
      const otherDeck = await createDeck({ courseId: course.id, title: "Kept deck" });

      const card = await seedFlashcard({ id: "card-1", deckId: deck.id });
      await seedReviewLog({ id: "log-1", flashcardId: card.id });
      const keptCard = await seedFlashcard({ id: "card-2", deckId: otherDeck.id });
      await seedReviewLog({ id: "log-2", flashcardId: keptCard.id });

      await seedAttempt({ id: "attempt-1", courseId: course.id, deckId: deck.id });
      await seedAttempt({
        id: "attempt-2",
        courseId: course.id,
        deckId: otherDeck.id,
      });

      await deleteDeck(deck.id);

      await expect(db.decks.get(deck.id)).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-1")).resolves.toBeUndefined();
      await expect(db.reviewLogs.get("log-1")).resolves.toBeUndefined();
      await expect(db.feynmanAttempts.get("attempt-1")).resolves.toBeUndefined();

      // The other deck's rows survive.
      await expect(db.flashcards.get("card-2")).resolves.toBeDefined();
      await expect(db.reviewLogs.get("log-2")).resolves.toBeDefined();
      await expect(db.feynmanAttempts.get("attempt-2")).resolves.toBeDefined();
    });
  });

  describe("deleteFlashcard", () => {
    it("deletes the card's review logs", async () => {
      const course = await createCourse({ title: "Course" });
      const deck = await createDeck({ courseId: course.id, title: "Deck" });
      const card = await seedFlashcard({ id: "card-1", deckId: deck.id });
      const keptCard = await seedFlashcard({ id: "card-2", deckId: deck.id });
      await seedReviewLog({ id: "log-1", flashcardId: card.id });
      await seedReviewLog({ id: "log-2", flashcardId: keptCard.id });

      await deleteFlashcard(card.id);

      await expect(db.flashcards.get("card-1")).resolves.toBeUndefined();
      await expect(db.reviewLogs.get("log-1")).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-2")).resolves.toBeDefined();
      await expect(db.reviewLogs.get("log-2")).resolves.toBeDefined();
    });
  });
});

const DexieTables = [
  "courses",
  "topics",
  "decks",
  "flashcards",
  "reviewLogs",
  "sources",
  "chunks",
  "feynmanAttempts",
] as const;
