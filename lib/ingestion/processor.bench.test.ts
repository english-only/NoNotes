import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import { db } from "@/lib/db/client";
import { createSource } from "@/lib/db/repositories/source-repository";
import { createChunk } from "@/lib/db/repositories/chunk-repository";

// Deterministic synthetic source: 1,000 chunks x 2,000 chars ≈ the shape of a
// large textbook PDF (~2 MB extracted text) passing through the pipeline.
const CHUNK_COUNT = 1_000;
const CHUNK_SIZE = 2_000;

async function seedSource(): Promise<string> {
  const course = await db.courses.add({
    id: crypto.randomUUID(),
    title: "Bench",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as never);
  const source = await createSource({
    courseId: course as unknown as string,
    title: "Bench source",
    type: "pdf",
    rawContent: "x".repeat(CHUNK_COUNT * CHUNK_SIZE),
    processedContent: "x".repeat(CHUNK_COUNT * CHUNK_SIZE),
  });
  return source.id;
}

describe("chunk persistence performance", () => {
  let sourceId: string;

  beforeEach(async () => {
    await db.courses.clear();
    await db.sources.clear();
    await db.chunks.clear();
    sourceId = await seedSource();
  });

  it("baseline: per-chunk createChunk loop", async () => {
    const start = performance.now();
    const rawChunks = Array.from({ length: CHUNK_COUNT }, (_, i) => ({
      sourceId,
      ordinal: i,
      content: "x".repeat(CHUNK_SIZE),
    }));
    for (const c of rawChunks) {
      await createChunk(c);
    }
    const elapsed = performance.now() - start;
    const count = await db.chunks.where("sourceId").equals(sourceId).count();
    expect(count).toBe(CHUNK_COUNT);
    // Correctness gate: must persist everything; time is recorded, not gated.
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("variant: single bulkAdd", async () => {
    const start = performance.now();
    const rawChunks = Array.from({ length: CHUNK_COUNT }, (_, i) => ({
      id: crypto.randomUUID(),
      sourceId,
      ordinal: i,
      content: "x".repeat(CHUNK_SIZE),
      createdAt: Date.now(),
    }));
    await db.chunks.bulkAdd(rawChunks);
    const elapsed = performance.now() - start;
    const count = await db.chunks.where("sourceId").equals(sourceId).count();
    expect(count).toBe(CHUNK_COUNT);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});
