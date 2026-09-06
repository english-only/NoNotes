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

function statusResponse(status: number, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "error",
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => ({}),
  } as unknown as Response;
}

const validFlashcards = {
  flashcards: [
    { prompt: "What is X?", answer: "X is Y." },
    { prompt: "Why Z?", answer: "Because." },
  ],
};

const flashcardInput = {
  chunks: [{ ordinal: 0, content: "X equals Y." }],
  deckTitle: "Deck",
  courseTitle: "Course",
  cardCount: 2,
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

  it("retries transient network failures then throws the classified error", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const promise = makeProvider().generateFlashcards(flashcardInput);
      // Attach the handler before advancing so the rejection is never
      // "unhandled" while the retry sleeps tick by.
      const assertion = expect(promise).rejects.toThrow(ProviderError);
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      // 3 attempts (1 + 2 retries) before giving up.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a 429 after Retry-After elapses and succeeds", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(statusResponse(429, { "retry-after": "1" }))
        .mockResolvedValueOnce(okResponse(JSON.stringify(validFlashcards)));

      const promise = makeProvider().generateFlashcards(flashcardInput);
      await vi.advanceTimersByTimeAsync(2_000);
      await expect(promise).resolves.toEqual(validFlashcards);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a 503 (unavailable) with backoff and succeeds", async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(statusResponse(503))
        .mockResolvedValueOnce(okResponse(JSON.stringify(validFlashcards)));

      const promise = makeProvider().generateFlashcards(flashcardInput);
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(promise).resolves.toEqual(validFlashcards);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry authentication errors", async () => {
    fetchMock.mockResolvedValue(statusResponse(401));
    await expect(makeProvider().generateFlashcards(flashcardInput)).rejects.toThrow(
      ProviderError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries and surfaces the classified error", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(statusResponse(429, { "retry-after": "1" }));
      const promise = makeProvider().generateFlashcards(flashcardInput);
      const assertion = expect(promise).rejects.toMatchObject({ type: "rate-limit" });
      await vi.advanceTimersByTimeAsync(20_000);
      await assertion;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("respects retryAttempts: 1 and does not retry", async () => {
    fetchMock.mockResolvedValue(statusResponse(429));
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      retryAttempts: 1,
    });
    await expect(provider.generateFlashcards(flashcardInput)).rejects.toMatchObject({
      type: "rate-limit",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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