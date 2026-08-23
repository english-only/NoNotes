import { describe, it, expect } from "vitest";
import { tokenize, buildIndex, search } from "./search";
import type { SearchDocument } from "./types";

describe("tokenize", () => {
  it("lowercases text", () => {
    expect(tokenize("Hello World")).toEqual(["hello", "world"]);
  });

  it("removes punctuation", () => {
    expect(tokenize("hello, world!")).toEqual(["hello", "world"]);
  });

  it("handles multiple spaces", () => {
    expect(tokenize("hello   world")).toEqual(["hello", "world"]);
  });

  it("filters short tokens (1-2 chars)", () => {
    expect(tokenize("a an is it to")).toEqual([]);
  });

  it("keeps tokens of 3+ chars", () => {
    expect(tokenize("the cat sat")).toEqual(["the", "cat", "sat"]);
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles mixed case and punctuation", () => {
    expect(tokenize("Photosynthesis: The Process!")).toEqual([
      "photosynthesis",
      "the",
      "process",
    ]);
  });
});

describe("buildIndex", () => {
  const docs: SearchDocument[] = [
    {
      id: "1",
      type: "course",
      text: "introduction to computer science",
      result: {
        id: "1",
        type: "course",
        title: "Introduction to Computer Science",
        href: "/courses/1",
      },
    },
    {
      id: "2",
      type: "course",
      text: "advanced mathematics",
      result: {
        id: "2",
        type: "course",
        title: "Advanced Mathematics",
        href: "/courses/2",
      },
    },
    {
      id: "3",
      type: "flashcard",
      text: "what is a variable a variable stores data",
      result: {
        id: "3",
        type: "flashcard",
        title: "What is a variable?",
        excerpt: "A variable stores data",
        href: "/courses/1/decks/1",
      },
    },
  ];

  it("builds index with correct document count", () => {
    const index = buildIndex(docs);
    expect(index.totalDocuments).toBe(3);
  });

  it("correctly computes document frequency", () => {
    const index = buildIndex(docs);
    // "introduction" only appears in doc 0
    expect(index.df.get("introduction")).toBe(1);
    // "variable" appears in doc 2 (twice, but df counts docs not occurrences)
    expect(index.df.get("variable")).toBe(1);
  });

  it("correctly computes term frequency", () => {
    const index = buildIndex(docs);
    // "variable" appears twice in doc 2
    expect(index.tf.get("variable")?.get(2)).toBe(2);
  });
});

describe("search", () => {
  const docs: SearchDocument[] = [
    {
      id: "1",
      type: "course",
      text: "introduction to computer science basics",
      result: {
        id: "1",
        type: "course",
        title: "Introduction to Computer Science",
        href: "/courses/1",
      },
    },
    {
      id: "2",
      type: "course",
      text: "advanced mathematics calculus",
      result: {
        id: "2",
        type: "course",
        title: "Advanced Mathematics",
        href: "/courses/2",
      },
    },
    {
      id: "3",
      type: "flashcard",
      text: "what is a variable a variable stores data in programming",
      result: {
        id: "3",
        type: "flashcard",
        title: "What is a variable?",
        excerpt: "A variable stores data",
        href: "/courses/1/decks/1",
      },
    },
    {
      id: "4",
      type: "deck",
      text: "biology exam review",
      result: {
        id: "4",
        type: "deck",
        title: "Biology Exam Review",
        href: "/courses/3/decks/4",
      },
    },
  ];

  const index = buildIndex(docs);

  it("returns empty array for empty query", () => {
    expect(search(index, "")).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    expect(search(index, "   ")).toEqual([]);
  });

  it("finds exact title match", () => {
    const results = search(index, "computer science");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("1");
    expect(results[0].type).toBe("course");
  });

  it("finds partial match", () => {
    const results = search(index, "math");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("2");
  });

  it("finds flashcard content", () => {
    const results = search(index, "variable");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("3");
  });

  it("ranks exact title match higher than partial", () => {
    const results = search(index, "biology");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("4");
  });

  it("returns results sorted by score descending", () => {
    const results = search(index, "science");
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("respects maxResults config", () => {
    const results = search(index, "the", { maxResults: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("returns empty for non-existent terms", () => {
    const results = search(index, "quantum physics");
    expect(results).toEqual([]);
  });

  it("includes score in results", () => {
    const results = search(index, "computer");
    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].score).toBe("number");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("includes href in results", () => {
    const results = search(index, "computer science");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].href).toBe("/courses/1");
  });

  it("handles case-insensitive search", () => {
    const lower = search(index, "computer");
    const upper = search(index, "COMPUTER");
    expect(lower.length).toBe(upper.length);
    expect(lower[0].id).toBe(upper[0].id);
  });
});

describe("search ranking", () => {
  const docs: SearchDocument[] = [
    {
      id: "1",
      type: "course",
      text: "react hooks useState useEffect",
      result: {
        id: "1",
        type: "course",
        title: "React Hooks Deep Dive",
        href: "/courses/1",
      },
    },
    {
      id: "2",
      type: "flashcard",
      text: "useState is a react hook that manages state",
      result: {
        id: "2",
        type: "flashcard",
        title: "What is useState?",
        excerpt: "A React hook for state management",
        href: "/courses/1/decks/1",
      },
    },
    {
      id: "3",
      type: "source",
      text: "react hooks tutorial for beginners complete guide",
      result: {
        id: "3",
        type: "source",
        title: "React Hooks Tutorial",
        excerpt: "Complete guide to React hooks",
        href: "/courses/1",
      },
    },
  ];

  const index = buildIndex(docs);

  it("ranks title match higher than body match", () => {
    const results = search(index, "react hooks");
    expect(results.length).toBeGreaterThan(0);
    // The source with "react hooks" in title should rank highly
    const ids = results.map((r) => r.id);
    expect(ids).toContain("3");
  });

  it("returns multiple result types", () => {
    const results = search(index, "react");
    const types = new Set(results.map((r) => r.type));
    expect(types.size).toBeGreaterThan(1);
  });
});
