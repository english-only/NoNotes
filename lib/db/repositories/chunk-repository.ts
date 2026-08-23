import { db } from "@/lib/db/client";
import type { Chunk } from "@/lib/db/schema";

export type ChunkInput = {
  sourceId: string;
  ordinal: number;
  content: string;
};

function assertNonEmptyContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Chunk content is required.");
  }
  return trimmed;
}

async function assertSourceExists(sourceId: string): Promise<void> {
  const source = await db.sources.get(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }
}

export async function createChunk(input: ChunkInput): Promise<Chunk> {
  await assertSourceExists(input.sourceId);

  const chunk: Chunk = {
    id: crypto.randomUUID(),
    sourceId: input.sourceId,
    ordinal: input.ordinal,
    content: assertNonEmptyContent(input.content),
    createdAt: Date.now(),
  };

  await db.chunks.add(chunk);
  return chunk;
}

/** All chunks for a source, in ordinal order. */
export async function listChunksBySource(sourceId: string): Promise<Chunk[]> {
  return db.chunks
    .where("[sourceId+ordinal]")
    .between([sourceId, 0], [sourceId, Number.POSITIVE_INFINITY])
    .toArray();
}

export async function deleteChunksBySource(sourceId: string): Promise<void> {
  await db.chunks.where("sourceId").equals(sourceId).delete();
}
