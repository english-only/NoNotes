import { getSource, updateSource } from "@/lib/db/repositories/source-repository";
import { createChunks, deleteChunksBySource } from "@/lib/db/repositories/chunk-repository";

export type ProcessResult = {
  sourceId: string;
  chunkCount: number;
  chunks: { ordinal: number; content: string }[];
};

// ── Cleaning ──────────────────────────────────────────────────────────

/** Strip common markdown syntax, returning readable plain text. */
function stripMarkdown(text: string): string {
  return text
    // Headers: ### Title → Title
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/italic: **text**, *text*, __text__, _text_
    .replace(/\*{1,3}(.+?)\*{1,3}/g, "$1")
    .replace(/_{1,3}(.+?)_{1,3}/g, "$1")
    // Strikethrough: ~~text~~
    .replace(/~~(.+?)~~/g, "$1")
    // Inline code: `code`
    .replace(/`(.+?)`/g, "$1")
    // Links: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Blockquotes: > text
    .replace(/^>\s+/gm, "")
    // Horizontal rules: ---, ***, ___
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Unordered list markers: - item, * item, + item
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Ordered list markers: 1. item
    .replace(/^[\s]*\d+\.\s+/gm, "");
}

/** Normalize whitespace: collapse runs, trim lines, collapse blank lines. */
function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Chunking ──────────────────────────────────────────────────────────

const MIN_CHUNK_LENGTH = 20;
const MAX_CHUNK_LENGTH = 2000;

/**
 * Split content into semantically coherent chunks.
 * Strategy: split on double-newlines (paragraph boundaries), then merge
 * short adjacent chunks and split oversized ones.
 */
function chunkContent(text: string): string[] {
  if (!text.trim()) return [];

  // Split on paragraph boundaries (double newline)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  // Merge only very short adjacent fragments (< MIN_CHUNK_LENGTH) to avoid
  // tiny useless chunks, but preserve meaningful paragraph boundaries.
  const merged: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const combined = buffer ? `${buffer}\n\n${para}` : para;
    // Only merge if the current paragraph is tiny (< MIN_CHUNK_LENGTH)
    // and the combined result fits within MAX_CHUNK_LENGTH.
    if (
      para.length < MIN_CHUNK_LENGTH &&
      combined.length <= MAX_CHUNK_LENGTH
    ) {
      buffer = combined;
    } else {
      if (buffer) merged.push(buffer);
      buffer = para;
    }
  }
  if (buffer) merged.push(buffer);

  // Split any oversized chunks at sentence boundaries
  const result: string[] = [];
  for (const chunk of merged) {
    if (chunk.length <= MAX_CHUNK_LENGTH) {
      result.push(chunk);
    } else {
      // Split on sentence boundaries
      const sentences = chunk.match(/[^.!?]+[.!?]+[\s]*/g) || [chunk];
      let current = "";
      for (const sentence of sentences) {
        if (current.length + sentence.length > MAX_CHUNK_LENGTH && current) {
          result.push(current.trim());
          current = "";
        }
        current += sentence;
      }
      if (current.trim()) result.push(current.trim());
    }
  }

  return result.filter((c) => c.length >= MIN_CHUNK_LENGTH || result.length === 1);
}

// ── Main pipeline ─────────────────────────────────────────────────────

/**
 * Process a source: clean its content, split into chunks, and persist
 * both the processed content and the chunks to the database.
 */
export async function processSource(sourceId: string): Promise<ProcessResult> {
  const source = await getSource(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  // Step 1: Clean based on source type
  let cleaned = source.rawContent;
  if (source.type === "markdown") {
    cleaned = stripMarkdown(cleaned);
  } else if (source.type === "pdf" || source.type === "url") {
    // PDF and URL content is already extracted as plain text
    // Just normalize whitespace
  }
  cleaned = normalizeWhitespace(cleaned);

  // Step 2: Update source with processed content
  await updateSource(sourceId, { processedContent: cleaned });

  // Step 3: Chunk
  const rawChunks = chunkContent(cleaned);

  // Step 4: Clear old chunks and persist new ones in a single bulk write
  // (per-chunk transactions are pathologically slow for large sources).
  await deleteChunksBySource(sourceId);

  const chunks = await createChunks(
    rawChunks.map((content, i) => ({
      sourceId,
      ordinal: i,
      content,
    })),
  );

  return {
    sourceId,
    chunkCount: chunks.length,
    chunks: chunks.map((c) => ({ ordinal: c.ordinal, content: c.content })),
  };
}
