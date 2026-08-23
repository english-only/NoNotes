import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "./course-repository";
import {
  createTopic,
  deleteTopic,
  getTopic,
  listTopicsByCourse,
  updateTopic,
} from "./topic-repository";

// Small delay so consecutive writes land in distinct milliseconds and
// createdAt-ordering assertions are deterministic.
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

describe("topic repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
  });

  describe("createTopic", () => {
    it("persists a topic with a generated id, timestamps, courseId, and trimmed title", async () => {
      const course = await createCourse({ title: "Biology" });
      const before = Date.now();
      const topic = await createTopic({ courseId: course.id, title: "  Cells  " });
      const after = Date.now();

      expect(topic.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(topic.courseId).toBe(course.id);
      expect(topic.title).toBe("Cells");
      expect(topic.createdAt).toBeGreaterThanOrEqual(before);
      expect(topic.createdAt).toBeLessThanOrEqual(after);
      expect(topic.updatedAt).toBe(topic.createdAt);

      const stored = await db.topics.get(topic.id);
      expect(stored).toEqual(topic);
    });

    it("rejects an empty or whitespace-only title", async () => {
      const course = await createCourse({ title: "Biology" });

      await expect(
        createTopic({ courseId: course.id, title: "   " })
      ).rejects.toThrow(/title/i);
      await expect(
        createTopic({ courseId: course.id, title: "" })
      ).rejects.toThrow(/title/i);
    });

    it("throws when the parent course does not exist", async () => {
      await expect(
        createTopic({ courseId: "missing-course", title: "Orphan topic" })
      ).rejects.toThrow(/course/i);
    });
  });

  describe("listTopicsByCourse", () => {
    it("returns an empty array when the course has no topics", async () => {
      const course = await createCourse({ title: "Physics" });

      await expect(listTopicsByCourse(course.id)).resolves.toEqual([]);
    });

    it("returns topics in creation order", async () => {
      const course = await createCourse({ title: "Physics" });
      const first = await createTopic({ courseId: course.id, title: "Kinematics" });
      await tick();
      const second = await createTopic({ courseId: course.id, title: "Dynamics" });
      await tick();
      const third = await createTopic({ courseId: course.id, title: "Waves" });

      const topics = await listTopicsByCourse(course.id);
      expect(topics.map((topic) => topic.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it("returns only topics belonging to the requested course", async () => {
      const chemistry = await createCourse({ title: "Chemistry" });
      const history = await createCourse({ title: "History" });
      const chemTopic = await createTopic({
        courseId: chemistry.id,
        title: "Bonding",
      });
      await createTopic({ courseId: history.id, title: "Roman Empire" });

      const topics = await listTopicsByCourse(chemistry.id);
      expect(topics.map((topic) => topic.id)).toEqual([chemTopic.id]);
    });
  });

  describe("getTopic", () => {
    it("returns the topic for a known id", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createTopic({ courseId: course.id, title: "Skeleton" });

      await expect(getTopic(created.id)).resolves.toEqual(created);
    });

    it("returns undefined for an unknown id", async () => {
      await expect(getTopic("missing-id")).resolves.toBeUndefined();
    });
  });

  describe("updateTopic", () => {
    it("updates the title, bumps updatedAt, and preserves id, courseId, and createdAt", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createTopic({ courseId: course.id, title: "Skeleton" });
      await tick();

      const updated = await updateTopic(created.id, { title: "  Muscles  " });

      expect(updated.id).toBe(created.id);
      expect(updated.courseId).toBe(course.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.title).toBe("Muscles");
      expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);

      const stored = await db.topics.get(created.id);
      expect(stored).toEqual(updated);
    });

    it("rejects an empty or whitespace-only title", async () => {
      const course = await createCourse({ title: "Anatomy" });
      const created = await createTopic({ courseId: course.id, title: "Skeleton" });

      await expect(updateTopic(created.id, { title: " " })).rejects.toThrow(
        /title/i
      );
    });

    it("throws when the topic does not exist", async () => {
      await expect(
        updateTopic("missing-id", { title: "Nope" })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("deleteTopic", () => {
    it("removes the topic", async () => {
      const course = await createCourse({ title: "Biology" });
      const created = await createTopic({ courseId: course.id, title: "Cells" });

      await deleteTopic(created.id);

      await expect(getTopic(created.id)).resolves.toBeUndefined();
      await expect(listTopicsByCourse(course.id)).resolves.toEqual([]);
    });

    it("is a no-op for an unknown id", async () => {
      await expect(deleteTopic("missing-id")).resolves.toBeUndefined();
    });
  });
});
