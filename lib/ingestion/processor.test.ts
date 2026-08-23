import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { createCourse } from "@/lib/db/repositories/course-repository";
import { createSource } from "@/lib/db/repositories/source-repository";
import { processSource } from "./processor";

describe("source processor", () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.topics.clear();
    await db.decks.clear();
    await db.flashcards.clear();
    await db.reviewLogs.clear();
    await db.sources.clear();
    await db.chunks.clear();
  });

  async function seedSource(
    content: string,
    type: "text" | "markdown" = "text"
  ) {
    const course = await createCourse({ title: "Biology" });
    return createSource({
      courseId: course.id,
      title: "Test Source",
      type,
      rawContent: content,
      processedContent: content,
    });
  }

  describe("cleanContent", () => {
    it("normalizes whitespace in plain text", async () => {
      const source = await seedSource("  Hello   world  \n\n  Foo  bar  ");
      const result = await processSource(source.id);

      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      for (const chunk of result.chunks) {
        expect(chunk.content).toBe(chunk.content.trim());
      }
    });

    it("strips markdown formatting to plain text", async () => {
      const source = await seedSource(
        "# Heading about Topic X\n\nSome **bold** text with *italic* here.\n\n- item 1\n- item 2",
        "markdown"
      );
      const result = await processSource(source.id);

      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      const combined = result.chunks.map((c) => c.content).join("\n\n");
      // Markdown symbols should be stripped
      expect(combined).not.toContain("**");
      expect(combined).not.toContain("*italic*");
      expect(combined).not.toContain("# ");
      expect(combined).toContain("Heading about Topic X");
      expect(combined).toContain("bold");
      expect(combined).toContain("item 1");
    });
  });

  describe("chunking", () => {
    it("splits content on double newlines (paragraph boundaries)", async () => {
      const content =
        "First paragraph is about topic A in biology class today.\n\nSecond paragraph is about topic B in chemistry class today.\n\nThird paragraph is about topic C in physics class today.";
      const source = await seedSource(content);
      const result = await processSource(source.id);

      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].content).toContain("topic A");
      expect(result.chunks[1].content).toContain("topic B");
      expect(result.chunks[2].content).toContain("topic C");
    });

    it("splits markdown on headings", async () => {
      const content =
        "# Chapter One Introduction\n\nSome content about chapter one things.\n\n# Chapter Two Introduction\n\nSome content about chapter two things.";
      const source = await seedSource(content, "markdown");
      const result = await processSource(source.id);

      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    });

    it("preserves chunk ordinals", async () => {
      const content = "Paragraph one is here for testing purposes.\n\nParagraph two is here for testing purposes.\n\nParagraph three is here for testing purposes.";
      const source = await seedSource(content);
      const result = await processSource(source.id);

      for (let i = 0; i < result.chunks.length; i++) {
        expect(result.chunks[i].ordinal).toBe(i);
      }
    });

    it("returns a single chunk for short content", async () => {
      const source = await seedSource("Just a single line of text content.");
      const result = await processSource(source.id);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toContain("single line");
    });
  });

  describe("persistence", () => {
    it("stores the source with processed content", async () => {
      const source = await seedSource("Hello world.");
      await processSource(source.id);

      const updated = await db.sources.get(source.id);
      expect(updated).toBeDefined();
      expect(updated?.processedContent).not.toBe("");
    });

    it("stores chunks in the database", async () => {
      const source = await seedSource(
        "First paragraph content is here.\n\nSecond paragraph content is here."
      );
      const result = await processSource(source.id);

      const storedChunks = await db.chunks
        .where("sourceId")
        .equals(source.id)
        .toArray();
      expect(storedChunks).toHaveLength(result.chunks.length);
    });

    it("clears previous chunks before reprocessing", async () => {
      const source = await seedSource("Original content paragraph one.\n\nOriginal content paragraph two.");
      await processSource(source.id);

      // Reprocess with different content
      await db.sources.update(source.id, {
        rawContent: "New content paragraph one.\n\nNew content paragraph two.",
        processedContent: "New content paragraph one.\n\nNew content paragraph two.",
      });
      await processSource(source.id);

      const chunks = await db.chunks
        .where("sourceId")
        .equals(source.id)
        .toArray();
      expect(chunks.every((c) => c.content.includes("New"))).toBe(true);
    });
  });

  describe("error handling", () => {
    it("throws for nonexistent source", async () => {
      await expect(processSource("missing")).rejects.toThrow(/not found/i);
    });

    it("handles empty content gracefully", async () => {
      const source = await seedSource("");
      const result = await processSource(source.id);
      expect(result.chunks).toHaveLength(0);
    });

    it("handles whitespace-only content gracefully", async () => {
      const source = await seedSource("   \n\n  \n  ");
      const result = await processSource(source.id);
      expect(result.chunks).toHaveLength(0);
    });
  });
});
