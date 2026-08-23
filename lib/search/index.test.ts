import { describe, it, expect, beforeEach, vi } from "vitest";
import { rebuildIndex, search, invalidateIndex, getIndex } from "./index";

// Mock the db module
vi.mock("@/lib/db/client", () => ({
  db: {
    courses: { toArray: vi.fn().mockResolvedValue([]) },
    topics: { toArray: vi.fn().mockResolvedValue([]) },
    decks: { toArray: vi.fn().mockResolvedValue([]) },
    flashcards: { toArray: vi.fn().mockResolvedValue([]) },
    sources: { toArray: vi.fn().mockResolvedValue([]) },
    chunks: { toArray: vi.fn().mockResolvedValue([]) },
  },
}));

describe("search index", () => {
  beforeEach(() => {
    invalidateIndex();
  });

  it("builds empty index from empty database", async () => {
    const index = await rebuildIndex();
    expect(index.totalDocuments).toBe(0);
  });

  it("returns empty results for empty index", async () => {
    await rebuildIndex();
    const results = await search("anything");
    expect(results).toEqual([]);
  });

  it("getIndex rebuilds if cache is null", async () => {
    const index = await getIndex();
    expect(index).toBeDefined();
    expect(index.totalDocuments).toBe(0);
  });

  it("getIndex returns cached index on second call", async () => {
    const first = await getIndex();
    const second = await getIndex();
    expect(first).toBe(second);
  });

  it("invalidateIndex clears the cache", async () => {
    await getIndex();
    invalidateIndex();
    // After invalidation, getIndex should rebuild
    const index = await getIndex();
    expect(index).toBeDefined();
  });
});
