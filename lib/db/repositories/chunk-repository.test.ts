import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "./course-repository";
import { createSource } from "./source-repository";
import {
  createChunk,
  deleteChunksBySource,
  listChunksBySource,
} from "./chunk-repository";

describe("chunk repository", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
    await db.decks.clear();
    await db.flashcards.clear();
    await db.reviewLogs.clear();
    await db.sources.clear();
    await db.chunks.clear();
  });

  async function seedSource() {
    const course = await createCourse({ title: "Biology" });
    return createSource({
      courseId: course.id,
      title: "Notes",
      type: "text",
      rawContent: "raw",
      processedContent: "processed",
    });
  }

  describe("createChunk", () => {
    it("creates a chunk with ordinal", async () => {
      const source = await seedSource();
      const chunk = await createChunk({
        sourceId: source.id,
        ordinal: 0,
        content: "First paragraph.",
      });

      expect(chunk.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(chunk.sourceId).toBe(source.id);
      expect(chunk.ordinal).toBe(0);
      expect(chunk.content).toBe("First paragraph.");
    });

    it("rejects empty content", async () => {
      const source = await seedSource();
      await expect(
        createChunk({ sourceId: source.id, ordinal: 0, content: "   " })
      ).rejects.toThrow(/content/i);
    });

    it("rejects nonexistent source", async () => {
      await expect(
        createChunk({ sourceId: "missing", ordinal: 0, content: "text" })
      ).rejects.toThrow(/source/i);
    });
  });

  describe("listChunksBySource", () => {
    it("returns chunks in ordinal order", async () => {
      const source = await seedSource();
      await createChunk({ sourceId: source.id, ordinal: 1, content: "B" });
      await createChunk({ sourceId: source.id, ordinal: 0, content: "A" });

      const chunks = await listChunksBySource(source.id);
      expect(chunks.map((c) => c.content)).toEqual(["A", "B"]);
    });

    it("excludes chunks from other sources", async () => {
      const source1 = await seedSource();
      const source2 = await seedSource();
      await createChunk({ sourceId: source1.id, ordinal: 0, content: "A" });
      await createChunk({ sourceId: source2.id, ordinal: 0, content: "B" });

      const chunks = await listChunksBySource(source1.id);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe("A");
    });
  });

  describe("deleteChunksBySource", () => {
    it("deletes all chunks for a source", async () => {
      const source = await seedSource();
      await createChunk({ sourceId: source.id, ordinal: 0, content: "A" });
      await createChunk({ sourceId: source.id, ordinal: 1, content: "B" });

      await deleteChunksBySource(source.id);
      expect(await listChunksBySource(source.id)).toHaveLength(0);
    });
  });
});
