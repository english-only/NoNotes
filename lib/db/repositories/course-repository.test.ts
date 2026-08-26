import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createInitialState } from "@/lib/fsrs/scheduler";
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
} from "./course-repository";

// Small delay so consecutive writes land in distinct milliseconds and
// updatedAt-ordering assertions are deterministic.
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

describe("course repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
  });

  describe("createCourse", () => {
    it("persists a course with a generated id, timestamps, and trimmed title", async () => {
      const before = Date.now();
      const course = await createCourse({ title: "  Organic Chemistry  " });
      const after = Date.now();

      expect(course.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(course.title).toBe("Organic Chemistry");
      expect(course.description).toBeUndefined();
      expect(course.createdAt).toBeGreaterThanOrEqual(before);
      expect(course.createdAt).toBeLessThanOrEqual(after);
      expect(course.updatedAt).toBe(course.createdAt);

      const stored = await db.courses.get(course.id);
      expect(stored).toEqual(course);
    });

    it("persists an optional description, trimmed", async () => {
      const course = await createCourse({
        title: "Anatomy",
        description: "  Musculoskeletal system  ",
      });

      expect(course.description).toBe("Musculoskeletal system");
      const stored = await db.courses.get(course.id);
      expect(stored?.description).toBe("Musculoskeletal system");
    });

    it("rejects an empty or whitespace-only title", async () => {
      await expect(createCourse({ title: "   " })).rejects.toThrow(/title/i);
      await expect(createCourse({ title: "" })).rejects.toThrow(/title/i);
    });

    it("creates independent records for concurrent calls (UI savingRef prevents duplicates)", async () => {
      const [a, b] = await Promise.all([
        createCourse({ title: "Concurrent A" }),
        createCourse({ title: "Concurrent B" }),
      ]);
      expect(a.id).not.toBe(b.id);
      const courses = await listCourses();
      expect(courses).toHaveLength(2);
    });
  });

  describe("listCourses", () => {
    it("returns an empty array when there are no courses", async () => {
      await expect(listCourses()).resolves.toEqual([]);
    });

    it("returns all courses ordered by most recently updated first", async () => {
      const first = await createCourse({ title: "First" });
      await tick();
      const second = await createCourse({ title: "Second" });
      await tick();
      const third = await createCourse({ title: "Third" });
      await tick();
      // Touching `first` makes it the most recently updated course.
      await updateCourse(first.id, { title: "First (updated)" });

      const courses = await listCourses();
      expect(courses.map((course) => course.id)).toEqual([
        first.id,
        third.id,
        second.id,
      ]);
    });
  });

  describe("getCourse", () => {
    it("returns the course for a known id", async () => {
      const created = await createCourse({ title: "Calculus" });

      await expect(getCourse(created.id)).resolves.toEqual(created);
    });

    it("returns undefined for an unknown id", async () => {
      await expect(getCourse("missing-id")).resolves.toBeUndefined();
    });
  });

  describe("updateCourse", () => {
    it("updates fields, bumps updatedAt, and preserves id and createdAt", async () => {
      const created = await createCourse({
        title: "Physics",
        description: "Mechanics",
      });
      await tick();

      const updated = await updateCourse(created.id, {
        title: "  Physics II  ",
        description: "  Electromagnetism  ",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.title).toBe("Physics II");
      expect(updated.description).toBe("Electromagnetism");
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      const stored = await db.courses.get(created.id);
      expect(stored).toEqual(updated);
    });

    it("clears the description when an empty string is provided", async () => {
      const created = await createCourse({ title: "History", description: "Old" });

      const updated = await updateCourse(created.id, { description: "  " });

      expect(updated.description).toBeUndefined();
    });

    it("throws when the course does not exist", async () => {
      await expect(
        updateCourse("missing-id", { title: "Nope" })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("deleteCourse", () => {
    it("removes the course", async () => {
      const created = await createCourse({ title: "To be deleted" });

      await deleteCourse(created.id);

      await expect(getCourse(created.id)).resolves.toBeUndefined();
      await expect(listCourses()).resolves.toEqual([]);
    });

    it("is a no-op for an unknown id", async () => {
      await expect(deleteCourse("missing-id")).resolves.toBeUndefined();
    });

    it("cascades: deleting a course also deletes its decks", async () => {
      const created = await createCourse({ title: "To be deleted" });
      const other = await createCourse({ title: "Stays behind" });

      await db.topics.bulkAdd([
        { id: "topic-1", courseId: created.id, title: "T1", createdAt: 1, updatedAt: 1 },
      ]);
      await db.decks.bulkAdd([
        { id: "deck-1", courseId: created.id, topicId: "topic-1", title: "D1", createdAt: 1, updatedAt: 1 },
        { id: "deck-2", courseId: created.id, title: "D2", createdAt: 1, updatedAt: 1 },
        { id: "deck-3", courseId: other.id, title: "D3", createdAt: 1, updatedAt: 1 },
      ]);

      await deleteCourse(created.id);

      await expect(getCourse(created.id)).resolves.toBeUndefined();
      await expect(db.topics.get("topic-1")).resolves.toBeUndefined();
      await expect(db.decks.get("deck-1")).resolves.toBeUndefined();
      await expect(db.decks.get("deck-2")).resolves.toBeUndefined();
      // Decks under a different course are untouched.
      await expect(db.decks.get("deck-3")).resolves.toBeDefined();
    });

    it("cascades: deleting a course also deletes its flashcards through its decks", async () => {
      const created = await createCourse({ title: "To be deleted" });
      const other = await createCourse({ title: "Stays behind" });

      await db.decks.bulkAdd([
        { id: "deck-1", courseId: created.id, title: "D1", createdAt: 1, updatedAt: 1 },
        { id: "deck-2", courseId: other.id, title: "D2", createdAt: 1, updatedAt: 1 },
      ]);
      await db.flashcards.bulkAdd([
        { id: "card-1", deckId: "deck-1", prompt: "P1", answer: "A1", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
        { id: "card-2", deckId: "deck-1", prompt: "P2", answer: "A2", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
        { id: "card-3", deckId: "deck-2", prompt: "P3", answer: "A3", sourceChunkIds: [], dueAt: 1, createdAt: 1, updatedAt: 1, fsrs: createInitialState(1) },
      ]);

      await deleteCourse(created.id);

      await expect(getCourse(created.id)).resolves.toBeUndefined();
      await expect(db.decks.get("deck-1")).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-1")).resolves.toBeUndefined();
      await expect(db.flashcards.get("card-2")).resolves.toBeUndefined();
      // Cards under a different course's deck are untouched.
      await expect(db.decks.get("deck-2")).resolves.toBeDefined();
      await expect(db.flashcards.get("card-3")).resolves.toBeDefined();
    });

    it("cascades: deleting a course also deletes its topics", async () => {
      const created = await createCourse({ title: "To be deleted" });
      const other = await createCourse({ title: "Stays behind" });

      await db.topics.bulkAdd([
        { id: "topic-1", courseId: created.id, title: "T1", createdAt: 1, updatedAt: 1 },
        { id: "topic-2", courseId: created.id, title: "T2", createdAt: 1, updatedAt: 1 },
        { id: "topic-3", courseId: other.id, title: "T3", createdAt: 1, updatedAt: 1 },
      ]);

      await deleteCourse(created.id);

      await expect(getCourse(created.id)).resolves.toBeUndefined();
      await expect(db.topics.get("topic-1")).resolves.toBeUndefined();
      await expect(db.topics.get("topic-2")).resolves.toBeUndefined();
      // Topics under a different course are untouched.
      await expect(db.topics.get("topic-3")).resolves.toBeDefined();
    });
  });
});
