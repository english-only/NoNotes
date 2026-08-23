import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "./course-repository";
import { createTopic } from "./topic-repository";
import {
  createSource,
  deleteSource,
  getSource,
  listSourcesByCourse,
  listSourcesByTopic,
  updateSource,
} from "./source-repository";

const NOW = 1_700_000_000_000;

describe("source repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
    await db.decks.clear();
    await db.flashcards.clear();
    await db.reviewLogs.clear();
    await db.sources.clear();
    await db.chunks.clear();
  });

  describe("createSource", () => {
    it("creates a text source with valid input", async () => {
      const course = await createCourse({ title: "Biology" });

      const source = await createSource({
        courseId: course.id,
        title: "My notes",
        type: "text",
        rawContent: "Photosynthesis is the process...",
        processedContent: "Photosynthesis is the process...",
      });

      expect(source.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(source.title).toBe("My notes");
      expect(source.type).toBe("text");
      expect(source.courseId).toBe(course.id);
      expect(source.rawContent).toBe("Photosynthesis is the process...");
      expect(source.processedContent).toBe("Photosynthesis is the process...");
    });

    it("creates a markdown source", async () => {
      const course = await createCourse({ title: "Chemistry" });

      const source = await createSource({
        courseId: course.id,
        title: "Lecture notes",
        type: "markdown",
        rawContent: "# Title\n\nSome content",
        processedContent: "Title\n\nSome content",
      });

      expect(source.type).toBe("markdown");
    });

    it("creates a source with optional topicId", async () => {
      const course = await createCourse({ title: "Math" });
      const topic = await createTopic({ courseId: course.id, title: "Algebra" });

      const source = await createSource({
        courseId: course.id,
        topicId: topic.id,
        title: "Algebra notes",
        type: "text",
        rawContent: "x + y = z",
        processedContent: "x + y = z",
      });

      expect(source.topicId).toBe(topic.id);
    });

    it("rejects an empty title", async () => {
      const course = await createCourse({ title: "Math" });

      await expect(
        createSource({
          courseId: course.id,
          title: "   ",
          type: "text",
          rawContent: "content",
          processedContent: "content",
        })
      ).rejects.toThrow(/title/i);
    });

    it("rejects a nonexistent course", async () => {
      await expect(
        createSource({
          courseId: "missing",
          title: "Notes",
          type: "text",
          rawContent: "content",
          processedContent: "content",
        })
      ).rejects.toThrow(/course/i);
    });

    it("rejects a topic that belongs to a different course", async () => {
      const course1 = await createCourse({ title: "Biology" });
      const course2 = await createCourse({ title: "Chemistry" });
      const topic = await createTopic({ courseId: course1.id, title: "Cell Bio" });

      await expect(
        createSource({
          courseId: course2.id,
          topicId: topic.id,
          title: "Mismatched",
          type: "text",
          rawContent: "content",
          processedContent: "content",
        })
      ).rejects.toThrow(/does not belong/i);
    });
  });

  describe("listSourcesByCourse", () => {
    it("returns sources for the course in creation order", async () => {
      const course = await createCourse({ title: "Biology" });
      await createSource({
        courseId: course.id,
        title: "Notes A",
        type: "text",
        rawContent: "a",
        processedContent: "a",
      });
      // Ensure different timestamps for deterministic ordering
      await new Promise((r) => setTimeout(r, 2));
      await createSource({
        courseId: course.id,
        title: "Notes B",
        type: "text",
        rawContent: "b",
        processedContent: "b",
      });

      const sources = await listSourcesByCourse(course.id);
      expect(sources).toHaveLength(2);
      expect(sources.map((s) => s.title)).toEqual(["Notes A", "Notes B"]);
    });

    it("excludes sources from other courses", async () => {
      const course1 = await createCourse({ title: "Biology" });
      const course2 = await createCourse({ title: "Chemistry" });
      await createSource({
        courseId: course1.id,
        title: "Bio notes",
        type: "text",
        rawContent: "a",
        processedContent: "a",
      });
      await createSource({
        courseId: course2.id,
        title: "Chem notes",
        type: "text",
        rawContent: "b",
        processedContent: "b",
      });

      const sources = await listSourcesByCourse(course1.id);
      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe("Bio notes");
    });
  });

  describe("listSourcesByTopic", () => {
    it("returns only sources for the given topic", async () => {
      const course = await createCourse({ title: "Biology" });
      const topic = await createTopic({ courseId: course.id, title: "Cells" });
      await createSource({
        courseId: course.id,
        topicId: topic.id,
        title: "Cell notes",
        type: "text",
        rawContent: "a",
        processedContent: "a",
      });
      await createSource({
        courseId: course.id,
        title: "Course notes",
        type: "text",
        rawContent: "b",
        processedContent: "b",
      });

      const sources = await listSourcesByTopic(topic.id);
      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe("Cell notes");
    });
  });

  describe("getSource / updateSource", () => {
    it("retrieves a source by id", async () => {
      const course = await createCourse({ title: "Math" });
      const created = await createSource({
        courseId: course.id,
        title: "Notes",
        type: "text",
        rawContent: "original",
        processedContent: "original",
      });

      const fetched = await getSource(created.id);
      expect(fetched?.id).toBe(created.id);
    });

    it("updates title and content", async () => {
      const course = await createCourse({ title: "Math" });
      const created = await createSource({
        courseId: course.id,
        title: "Old",
        type: "text",
        rawContent: "old",
        processedContent: "old",
      });

      const updated = await updateSource(created.id, {
        title: "New",
        processedContent: "updated",
      });

      expect(updated.title).toBe("New");
      expect(updated.processedContent).toBe("updated");
      expect(updated.rawContent).toBe("old"); // raw content preserved
    });

    it("throws for nonexistent source", async () => {
      await expect(updateSource("missing", { title: "X" })).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe("deleteSource", () => {
    it("deletes a source", async () => {
      const course = await createCourse({ title: "Math" });
      const created = await createSource({
        courseId: course.id,
        title: "Notes",
        type: "text",
        rawContent: "content",
        processedContent: "content",
      });

      await deleteSource(created.id);
      expect(await getSource(created.id)).toBeUndefined();
    });

    it("cascades to chunks", async () => {
      const course = await createCourse({ title: "Math" });
      const created = await createSource({
        courseId: course.id,
        title: "Notes",
        type: "text",
        rawContent: "content",
        processedContent: "content",
      });

      // Manually add a chunk
      await db.chunks.add({
        id: "chunk-1",
        sourceId: created.id,
        ordinal: 0,
        content: "chunk text",
        createdAt: NOW,
      });

      await deleteSource(created.id);
      expect(await db.chunks.where("sourceId").equals(created.id).count()).toBe(
        0
      );
    });
  });
});
