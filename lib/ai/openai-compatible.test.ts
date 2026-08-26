import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAICompatibleProvider } from "./openai-compatible";
import { ProviderError } from "./errors";

function okResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  } as unknown as Response;
}

function statusResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "error",
    json: async () => ({}),
  } as unknown as Response;
}

const validFlashcards = {
  flashcards: [
    { prompt: "What is X?", answer: "X is Y." },
    { prompt: "Why Z?", answer: "Because." },
  ],
};

const validEvaluation = {
  correctness: 0.9,
  completeness: 0.7,
  clarity: 0.8,
  misconceptions: [],
  missingConcepts: ["foo"],
  corrections: [],
  summary: "Solid.",
  improvement: "Add foo.",
  followUp: "Why foo?",
};

describe("OpenAICompatibleProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  function makeProvider() {
    return new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      displayName: "Test",
    });
  }

  it("has the correct name and label", () => {
    const provider = makeProvider();
    expect(provider.name).toBe("openai-compatible");
    expect(provider.label).toBe("Test");
  });

  it("generates flashcards from a chat-completions response", async () => {
    fetchMock.mockResolvedValue(okResponse(JSON.stringify(validFlashcards)));

    const result = await makeProvider().generateFlashcards({
      chunks: [{ ordinal: 0, content: "X equals Y." }],
      deckTitle: "Deck",
      courseTitle: "Course",
      cardCount: 2,
    });

    expect(result.flashcards).toHaveLength(2);
    const requestBody = fetchMock.mock.calls[0][1].body as string;
    const parsed = JSON.parse(requestBody);
    expect(parsed.model).toBe("test-model");
    expect(parsed.messages.some((m: { role: string }) => m.role === "system")).toBe(true);
  });

  it("evaluates a Feynman explanation", async () => {
    fetchMock.mockResolvedValue(okResponse(JSON.stringify(validEvaluation)));

    const result = await makeProvider().evaluateExplanation({
      chunks: [{ ordinal: 0, content: "X equals Y." }],
      concept: "X",
      explanation: "X is Y.",
      courseTitle: "Course",
    });

    expect(result.correctness).toBe(0.9);
    expect(result.followUp).toContain("foo");
  });

  it("strips markdown fences before parsing", async () => {
    fetchMock.mockResolvedValue(
      okResponse("```json\n" + JSON.stringify(validFlashcards) + "\n```")
    );
    const result = await makeProvider().generateFlashcards({
      chunks: [{ ordinal: 0, content: "X equals Y." }],
      deckTitle: "Deck",
      courseTitle: "Course",
      cardCount: 2,
    });
    expect(result.flashcards).toHaveLength(2);
  });

  it("throws a classified error on non-200 responses", async () => {
    fetchMock.mockResolvedValue(statusResponse(401));
    await expect(
      makeProvider().generateFlashcards({
        chunks: [{ ordinal: 0, content: "X" }],
        deckTitle: "D",
        courseTitle: "C",
        cardCount: 2,
      })
    ).rejects.toThrow(ProviderError);
  });

  it("throws a classified network error when fetch itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      makeProvider().generateFlashcards({
        chunks: [{ ordinal: 0, content: "X" }],
        deckTitle: "D",
        courseTitle: "C",
        cardCount: 2,
      })
    ).rejects.toThrow(ProviderError);
  });

  it("throws a malformed error for invalid JSON output", async () => {
    fetchMock.mockResolvedValue(okResponse("not valid json"));
    await expect(
      makeProvider().generateFlashcards({
        chunks: [{ ordinal: 0, content: "X" }],
        deckTitle: "D",
        courseTitle: "C",
        cardCount: 2,
      })
    ).rejects.toThrow(/JSON/i);
  });

  it("throws for schema-invalid flashcards", async () => {
    fetchMock.mockResolvedValue(okResponse(JSON.stringify({ flashcards: [] })));
    await expect(
      makeProvider().generateFlashcards({
        chunks: [{ ordinal: 0, content: "X" }],
        deckTitle: "D",
        courseTitle: "C",
        cardCount: 2,
      })
    ).rejects.toThrow(/validation/i);
  });

  it("normalizes a missing scheme on the base URL", async () => {
    fetchMock.mockResolvedValue(okResponse(JSON.stringify(validFlashcards)));
    const provider = new OpenAICompatibleProvider({
      baseUrl: "api.example.com/v1",
      apiKey: "k",
      model: "m",
    });
    await provider.generateFlashcards({
      chunks: [{ ordinal: 0, content: "X" }],
      deckTitle: "D",
      courseTitle: "C",
      cardCount: 2,
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/api\.example\.com\/v1\/chat\/completions$/);
  });
});