import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createInitialState } from "@/lib/fsrs/scheduler";
import { createCourse } from "./course-repository";
import { createTopic } from "./topic-repository";
import {
  createDeck,
  deleteDeck,
  getDeck,
  listAllDecks,
  listDecksByCourse,
  listDecksByTopic,
  updateDeck,
} from "./deck-repository";

// Small delay so consecutive writes land in distinct milliseconds and
// createdAt-ordering assertions are deterministic.
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

describe("deck repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
    await db.decks.clear();
    await db.flashcards.clear();
  });

  describe("createDeck", () => {
    it("persists a course-level deck with a generated id, timestamps, and trimmed title", async () => {
      const course = await createCourse({ title: "Biology" });
      const before = Date.now();
      const deck = await createDeck({ courseId: course.id, title: "  Cells  " });
      const after = Date.now();

      expect(deck.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(deck.courseId).toBe(course.id);
      expect(deck.topicId).toBeUndefined();
      expect(deck.title).toBe("Cells");
      expect(deck.createdAt).toBeGreaterThanOrEqual(before);
      expect(deck.createdAt).toBeLessThanOrEqual(after);
      expect(deck.updatedAt).toBe(deck.createdAt);

      const stored = await db.decks.get(deck.id);
      expect(stored).toEqual(deck);
    });

    it("persists a topic-associated deck", async () => {
      const course = await createCourse({ title: "Biology" });
      const topic = await createTopic({ courseId: course.id, title: "Cells" });

      const deck = await createDeck({
        courseId: course.id,
        topicId: topic.id,
        title: "Cell organelles",
      });

      expect(deck.topicId).toBe(topic.id);
      const stored = await db.decks.get(deck.id);
      expect(stored?.topicId).toBe(topic.id);
    });

    it("rejects an empty or whitespace-only title", async () => {
      const course = await createCourse({ title: "Biology" });

      await expect(
        createDeck({ courseId: course.id, title: "   " })
      ).rejects.toThrow(/title/i);
      await expect(
        createDeck({ courseId: course.id, title: "" })
      ).rejects.toThrow(/title/i);
    });

    it("throws when the parent course does not exist", async () => {
      await expect(
        createDeck({ courseId: "missing-course", title: "Orphan deck" })
      ).rejects.toThrow(/course/i);
    });

    it("throws when the topic does not exist", async () => {
      const course = await createCourse({ title: "Biology" });

      await expect(
        createDeck({
          courseId: course.id,
          topicId: "missing-topic",
          title: "Bad deck",
        })
      ).rejects.toThrow(/topic/i);
    });

    it("rejects a topic that belongs to another course", async () => {
      const biology = await createCourse({ title: "Biology" });
      const history = await createCourse({ title: "History" });
      const historyTopic = await createTopic({
        courseId: history.id,
        title: "Roman Empire",
      });

      await expect(
        createDeck({
          courseId: biology.id,
          topicId: historyTopic.id,
          title: "Cross-course deck",
        })
      ).rejects.toThrow(/course/i);
    });
  });

  describe("listDecksByCourse", () => {
    it("returns an empty array when the course has no decks", async () => {
      const course = await createCourse({ title: "Physics" });

      await expect(listDecksByCourse(course.id)).resolves.toEqual([]);
    });

    it("returns decks in creation order", async () => {
      const course = await createCourse({ title: "Physics" });
      const first = await createDeck({ courseId: course.id, title: "Kinematics" });
      await tick();
      const second = await createDeck({ courseId: course.id, title: "Dynamics" });
      await tick();
      const third = await createDeck({ courseId: course.id, title: "Waves" });

      const decks = await listDecksByCourse(course.id);
      expect(decks.map((deck) => deck.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it("returns only decks belonging to the requested course", async () => {
      const chemistry = await createCourse({ title: "Chemistry" });
      const history = await createCourse({ title: "History" });
      const chemDeck = await createDeck({
        courseId: chemistry.id,
        title: "Bonding",
      });
      await createDeck({ courseId: history.id, title: "Roman Emperors" });

      const decks = await listDecksByCourse(chemistry.id);
      expect(decks.map((deck) => deck.id)).toEqual([chemDeck.id]);
    });
  });

  describe("listDecksByTopic", () => {
    it("returns an empty array when the topic has no decks", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const topic = await createTopic({ courseId: course.id, title: "Skeleton" });

      await expect(listDecksByTopic(topic.id)).resolves.toEqual([]);
    });

    it("returns only decks belonging to the requested topic, in creation order", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const skeleton = await createTopic({ courseId: course.id, title: "Skeleton" });
      const muscles = await createTopic({ courseId: course.id, title: "Muscles" });

      const first = await createDeck({
        courseId: course.id,
        topicId: skeleton.id,
        title: "Bones A",
      });
      await tick();
      const second = await createDeck({
        courseId: course.id,
        topicId: skeleton.id,
        title: "Bones B",
      });
      await createDeck({
        courseId: course.id,
        topicId: muscles.id,
        title: "Flexors",
      });

      const decks = await listDecksByTopic(skeleton.id);
      expect(decks.map((deck) => deck.id)).toEqual([first.id, second.id]);
    });
  });

  describe("listAllDecks", () => {
    it("returns an empty array when there are no decks", async () => {
      await expect(listAllDecks()).resolves.toEqual([]);
    });

    it("returns all decks across courses in creation order", async () => {
      const biology = await createCourse({ title: "Biology" });
      const history = await createCourse({ title: "History" });
      const first = await createDeck({ courseId: biology.id, title: "Cells" });
      await tick();
      const second = await createDeck({ courseId: history.id, title: "Rome" });
      await tick();
      const third = await createDeck({ courseId: biology.id, title: "Genetics" });

      const decks = await listAllDecks();
      expect(decks.map((deck) => deck.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });
  });

  describe("getDeck", () => {
    it("returns the deck for a known id", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createDeck({ courseId: course.id, title: "Skeleton" });

      await expect(getDeck(created.id)).resolves.toEqual(created);
    });

    it("returns undefined for an unknown id", async () => {
      await expect(getDeck("missing-id")).resolves.toBeUndefined();
    });
  });

  describe("updateDeck", () => {
    it("updates the title, bumps updatedAt, and preserves id, courseId, and createdAt", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createDeck({ courseId: course.id, title: "Skeleton" });
      await tick();

      const updated = await updateDeck(created.id, { title: "  Bones  " });

      expect(updated.id).toBe(created.id);
      expect(updated.courseId).toBe(course.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.title).toBe("Bones");
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      const stored = await db.decks.get(created.id);
      expect(stored).toEqual(updated);
    });

    it("assigns a topic to a course-level deck", async () => {
      const course = await createCourse({ title: "Biology" });
      const topic = await createTopic({ courseId: course.id, title: "Cells" });
      const created = await createDeck({ courseId: course.id, title: "Organelles" });

      const updated = await updateDeck(created.id, { topicId: topic.id });

      expect(updated.topicId).toBe(topic.id);
    });

    it("moves a deck to a different topic", async () => {
      const course = await createCourse({ title: "Biology" });
      const cells = await createTopic({ courseId: course.id, title: "Cells" });
      const genetics = await createTopic({ courseId: course.id, title: "Genetics" });
      const created = await createDeck({
        courseId: course.id,
        topicId: cells.id,
        title: "Mitosis",
      });

      const updated = await updateDeck(created.id, { topicId: genetics.id });

      expect(updated.topicId).toBe(genetics.id);
    });

    it("removes the topic association when topicId is explicitly cleared", async () => {
      const course = await createCourse({ title: "Biology" });
      const cells = await createTopic({ courseId: course.id, title: "Cells" });
      const created = await createDeck({
        courseId: course.id,
        topicId: cells.id,
        title: "Mitosis",
      });

      const updated = await updateDeck(created.id, { topicId: undefined });

      expect(updated.topicId).toBeUndefined();
      const stored = await db.decks.get(created.id);
      expect(stored?.topicId).toBeUndefined();
    });

    it("rejects an empty or whitespace-only title", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createDeck({ courseId: course.id, title: "Skeleton" });

      await expect(updateDeck(created.id, { title: " " })).rejects.toThrow(
        /title/i
      );
    });

    it("throws when the new topic does not exist", async () => {
      const course = await createCourse({ title: "Biology" });
      const created = await createDeck({ courseId: course.id, title: "Organelles" });

      await expect(
        updateDeck(created.id, { topicId: "missing-topic" })
      ).rejects.toThrow(/topic/i);
    });

    it("rejects a new topic that belongs to another course", async () => {
      const biology = await createCourse({ title: "Biology" });
      const history = await createCourse({ title: "History" });
      const historyTopic = await createTopic({
        courseId: history.id,
        title: "Roman Empire",
      });
      const created = await createDeck({ courseId: biology.id, title: "Cells" });

      await expect(
        updateDeck(created.id, { topicId: historyTopic.id })
      ).rejects.toThrow(/course/i);
    });

    it("throws when the deck does not exist", async () => {
      await expect(
        updateDeck("missing-id", { title: "Nope" })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("deleteDeck", () => {
    it("removes the deck", async () => {
      const course = await createCourse({ title: "Biology" });
      const created = await createDeck({ courseId: course.id, title: "Cells" });

      await deleteDeck(created.id);

      await expect(getDeck(created.id)).resolves.toBeUndefined();
      await expect(listDecksByCourse(course.id)).resolves.toEqual([]);
    });

    it("is a no-op for an unknown id", async () => {
      await expect(deleteDeck("missing-id")).resolves.toBeUndefined();
    });

    it("cascades: deleting a deck also deletes its flashcards", async () => {
      const course = await createCourse({ title: "Biology" });
      const created = await createDeck({ courseId: course.id, title: "To go" });
      const other = await createDeck({ courseId: course.id, title: "Stays" });

      await db.flashcards.bulkAdd([
        { id: "card-1", deckId: created.id, prompt: "P1", answer: "A1", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
        { id: "card-2", deckId: created.id, prompt: "P2", answer: "A2", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
        { id: "card-3", deckId: other.id, prompt: "P3", answer: "A3", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
      ]);

      await deleteDeck(created.id);

      await expect(getDeck(created.id)).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-1")).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-2")).resolves.toBeUndefined();
      // Cards under a different deck are untouched.
      await expect(db.flashcards.get("card-3")).resolves.toBeDefined();
    });
  });
});
