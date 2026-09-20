import { describe, expect, it } from "vitest";

import { MAX_PROMPT_CHARS, capChunksToBudget } from "./context-budget";

function chunk(ordinal: number, contentLength: number) {
  return {
    ordinal,
    content: "x".repeat(contentLength),
  };
}

describe("capChunksToBudget", () => {
  it("keeps a small source untouched", () => {
    const chunks = [chunk(0, 500), chunk(1, 500), chunk(2, 500)];

    const result = capChunksToBudget(chunks);

    expect(result.chunks).toEqual(chunks);
    expect(result.truncated).toBe(false);
  });

  it("takes the first chunks that fit when the source exceeds the cap", () => {
    // 200 chunks x 10,000 chars = 2,000,000 chars total.
    const chunks = Array.from({ length: 200 }, (_, i) => chunk(i, 10_000));

    const result = capChunksToBudget(chunks);

    expect(result.truncated).toBe(true);
    // At least one chunk fits; the total never exceeds the budget.
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks.length).toBeLessThan(chunks.length);
    const totalChars = result.chunks.reduce((sum, c) => sum + c.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    // Chunks are kept in ordinal order (first N that fit).
    expect(result.chunks[0].ordinal).toBe(0);
    // A chunk is only included whole; the next-in-line chunk must not fit.
    const nextOrdinal = result.chunks.length;
    const usedChars = result.chunks.reduce((s, c) => s + c.content.length, 0);
    expect(usedChars + chunks[nextOrdinal].content.length).toBeGreaterThan(
      MAX_PROMPT_CHARS
    );
  });

  it("is exact at the boundary: chunks summing to exactly the cap are all kept", () => {
    const half = MAX_PROMPT_CHARS / 2;
    const chunks = [chunk(0, half), chunk(1, half)];

    const result = capChunksToBudget(chunks);

    expect(result.chunks).toEqual(chunks);
    expect(result.truncated).toBe(false);
  });

  it("drops a zero-content source to zero chunks and marks it truncated", () => {
    const chunks = [chunk(0, MAX_PROMPT_CHARS + 1)];

    const result = capChunksToBudget(chunks);

    expect(result.chunks).toEqual([]);
    expect(result.truncated).toBe(true);
  });

  it("does not mutate the input array", () => {
    const chunks = [chunk(0, 100), chunk(1, 100)];
    const snapshot = [...chunks];

    capChunksToBudget(chunks);

    expect(chunks).toEqual(snapshot);
  });
});
