import { beforeEach, describe, expect, it, vi } from "vitest";

// Behaviors keyed by provider id/model so that each fresh instance built by
// `buildProviderInstances()` routes to the behavior the test configured.
const behaviors = vi.hoisted(() => ({
  gem: {} as Record<string, { gen?: Behavior; evalFn?: Behavior }>,
  oac: {
    gen: vi.fn(),
    evalFn: vi.fn(),
  },
}));

type Behavior = ReturnType<typeof vi.fn>;

vi.mock("./gemini", () => ({
  GeminiProvider: class {
    apiKey: string;
    name = "gemini";
    generateFlashcards = vi.fn((input) => {
      const b = behaviors.gem[this.apiKey];
      if (b?.gen) return (b.gen as (i: unknown) => unknown)(input);
      throw new Error("no behavior configured for generateFlashcards");
    });
    evaluateExplanation = vi.fn((input) => {
      const b = behaviors.gem[this.apiKey];
      if (b?.evalFn) return (b.evalFn as (i: unknown) => unknown)(input);
      throw new Error("no behavior configured for evaluateExplanation");
    });
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
  },
}));

vi.mock("./openai-compatible", () => ({
  OpenAICompatibleProvider: class {
    label: string;
    name = "openai-compatible";
    generateFlashcards = vi.fn((input) =>
      (behaviors.oac.gen as (i: unknown) => unknown)(input)
    );
    evaluateExplanation = vi.fn((input) =>
      (behaviors.oac.evalFn as (i: unknown) => unknown)(input)
    );
    constructor(opts: Record<string, string>) {
      this.label = opts.displayName || "OpenAI-compatible";
    }
  },
}));

import { ProviderError } from "./errors";
import { setProviderConfig } from "./config";
import {
  evaluateExplanation,
  generateFlashcards,
  getFallbackPlan,
} from "./registry";

const storage = new Map<string, string>();
function localStorageLike() {
  return {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  };
}

function installWindow() {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: localStorageLike() },
    configurable: true,
    writable: true,
  });
}

describe("provider registry / fallback chain", () => {
  beforeEach(() => {
    storage.clear();
    behaviors.gem = {};
    behaviors.oac.gen.mockReset();
    behaviors.oac.evalFn.mockReset();
    installWindow();
  });

  const baseG = {
    chunks: [{ ordinal: 0, content: "X" }],
    deckTitle: "D",
    courseTitle: "C",
    cardCount: 2,
  };
  const baseE = {
    chunks: [{ ordinal: 0, content: "X" }],
    concept: "c",
    explanation: "e",
    courseTitle: "C",
  };

  it("throws not-configured when nothing is set", async () => {
    await expect(generateFlashcards(baseG)).rejects.toMatchObject({
      type: "not-configured",
    });
  });

  it("uses the first Gemini key when it succeeds", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1", "key-2"], model: "gemini-2.0-flash" },
      openAiCompatible: { displayName: "", baseUrl: "", model: "", apiKey: "" },
    });
    const gen = vi.fn().mockResolvedValue({ flashcards: [{ prompt: "Q", answer: "A" }] });
    behaviors.gem["key-1"] = { gen };
    behaviors.gem["key-2"] = { gen: vi.fn().mockResolvedValue({ flashcards: [] }) };

    const out = await generateFlashcards(baseG);
    expect(out.flashcards).toEqual([{ prompt: "Q", answer: "A" }]);
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it("rotates to the second Gemini key on auth failure", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1", "key-2"], model: "gemini-2.0-flash" },
      openAiCompatible: { displayName: "", baseUrl: "", model: "", apiKey: "" },
    });
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new ProviderError("authentication", "Gemini")),
    };
    const gen2 = vi.fn().mockResolvedValue({ flashcards: [{ prompt: "Q", answer: "A" }] });
    behaviors.gem["key-2"] = { gen: gen2 };

    const out = await generateFlashcards(baseG);
    expect(out.flashcards[0].prompt).toBe("Q");
    expect(gen2).toHaveBeenCalledTimes(1);
  });

  it("falls back to the OpenAI-compatible provider when all Gemini keys fail", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new ProviderError("quota", "Gemini")),
    };
    behaviors.oac.gen.mockResolvedValue({ flashcards: [{ prompt: "Q", answer: "A" }] });

    const out = await generateFlashcards(baseG);
    expect(out.flashcards[0].prompt).toBe("Q");
    expect(behaviors.oac.gen).toHaveBeenCalledTimes(1);

    const plan = getFallbackPlan();
    expect(plan.providers).toHaveLength(2);
  });

  it("tries the OpenAI-compatible provider first when it is the active provider", async () => {
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "BAILU AI",
        baseUrl: "https://bailucode.com/openapi/v1",
        model: "bailu-apex",
        apiKey: "sk-bailu",
      },
    });
    const gemGen = vi.fn();
    behaviors.gem["key-1"] = { gen: gemGen };
    behaviors.oac.gen.mockResolvedValue({
      flashcards: [{ prompt: "Q", answer: "A" }],
    });

    const out = await generateFlashcards(baseG);
    expect(out.flashcards[0].prompt).toBe("Q");
    expect(behaviors.oac.gen).toHaveBeenCalledTimes(1);
    expect(gemGen).not.toHaveBeenCalled();

    const plan = getFallbackPlan();
    expect(plan.providers).toHaveLength(2);
    expect(plan.providers[0].name).toBe("openai-compatible");
  });

  it("falls back to Gemini when the active OpenAI-compatible provider fails", async () => {
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "BAILU AI",
        baseUrl: "https://bailucode.com/openapi/v1",
        model: "bailu-apex",
        apiKey: "sk-bailu",
      },
    });
    behaviors.oac.gen.mockRejectedValue(
      new ProviderError("authentication", "BAILU AI")
    );
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockResolvedValue({
        flashcards: [{ prompt: "Q", answer: "A" }],
      }),
    };

    const out = await generateFlashcards(baseG);
    expect(out.flashcards[0].prompt).toBe("Q");
    expect(behaviors.oac.gen).toHaveBeenCalledTimes(1);
    expect(behaviors.gem["key-1"].gen).toHaveBeenCalledTimes(1);
  });

  it("mirrors active-provider ordering for evaluateExplanation", async () => {
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "BAILU AI",
        baseUrl: "https://bailucode.com/openapi/v1",
        model: "bailu-apex",
        apiKey: "sk-bailu",
      },
    });
    behaviors.oac.evalFn.mockRejectedValue(
      new ProviderError("network", "BAILU AI")
    );
    behaviors.gem["key-1"] = {
      evalFn: vi.fn().mockResolvedValue({ correctness: 0.8 }),
    };

    const result = await evaluateExplanation(baseE);
    expect(result.correctness).toBe(0.8);
    expect(behaviors.oac.evalFn).toHaveBeenCalledTimes(1);
    expect(behaviors.gem["key-1"].evalFn).toHaveBeenCalledTimes(1);
  });

  it("surfaces a classified provider error when every provider fails", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new ProviderError("authentication", "Gemini")),
    };
    behaviors.oac.gen.mockRejectedValue(new ProviderError("timeout", "Ollama"));

    await expect(generateFlashcards(baseG)).rejects.toMatchObject({
      type: "timeout",
    });
  });

  it("does not fall back for malformed output", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1", "key-2"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new ProviderError("malformed", "Gemini")),
    };
    behaviors.gem["key-2"] = { gen: vi.fn() };
    behaviors.oac.gen.mockReset();

    await expect(generateFlashcards(baseG)).rejects.toMatchObject({
      type: "malformed",
    });
    expect(behaviors.gem["key-2"].gen).not.toHaveBeenCalled();
    expect(behaviors.oac.gen).not.toHaveBeenCalled();
  });

  it("classifies raw provider errors so eligible failures rotate", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1", "key-2"], model: "gemini-2.0-flash" },
      openAiCompatible: { displayName: "", baseUrl: "", model: "", apiKey: "" },
    });
    // A plain SDK-style error (not a ProviderError) with quota text must be
    // classified and treated as fallback-eligible.
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new Error("API quota exceeded for today")),
    };
    const gen2 = vi.fn().mockResolvedValue({ flashcards: [{ prompt: "Q", answer: "A" }] });
    behaviors.gem["key-2"] = { gen: gen2 };

    const out = await generateFlashcards(baseG);
    expect(out.flashcards[0].prompt).toBe("Q");
    expect(gen2).toHaveBeenCalledTimes(1);
  });

  it("surfaces classified error message when all providers fail", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });
    behaviors.gem["key-1"] = {
      gen: vi.fn().mockRejectedValue(new Error("quota exceeded")),
    };
    behaviors.oac.gen.mockRejectedValue(new Error("Timeout after 120s"));

    const err = await generateFlashcards(baseG).catch((e) => e);
    expect(err.type).toBe("timeout");
    expect(err.message).toMatch(/took too long/i);
  });

  it("mirrors fallback behavior for evaluateExplanation", async () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-1"], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });
    behaviors.gem["key-1"] = {
      evalFn: vi.fn().mockRejectedValue(new ProviderError("network", "Gemini")),
    };
    behaviors.oac.evalFn.mockResolvedValue({ correctness: 0.8 });

    const result = await evaluateExplanation(baseE);
    expect(result.correctness).toBe(0.8);
  });
});