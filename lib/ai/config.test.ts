import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearApiKey,
  getActiveProviderLabel,
  getApiKey,
  getProviderConfig,
  hasApiKey,
  isProviderConfigured,
  setApiKey,
  setProviderConfig,
} from "./config";

const storage = new Map<string, string>();

function make_localStorageLike() {
  return {
    getItem: vi.fn((k: string) => storage.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      storage.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      storage.delete(k);
    }),
  };
}

describe("provider config persistence", () => {
  beforeEach(() => {
    storage.clear();
    // Simulate a browser environment with a functioning localStorage.
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: make_localStorageLike() },
      configurable: true,
      writable: true,
    });
  });

  it("returns defaults when nothing is stored", () => {
    const config = getProviderConfig();
    expect(config.activeProviderId).toBe("gemini");
    expect(config.gemini.apiKeys).toEqual([]);
    expect(config.gemini.model).toBe("gemini-2.0-flash");
  });

  it("round-trips Gemini config with multiple keys", () => {
    setProviderConfig({
      activeProviderId: "gemini",
      gemini: { apiKeys: ["key-a", "key-b"], model: "gemini-2.5-flash" },
      openAiCompatible: {
        displayName: "",
        baseUrl: "",
        model: "",
        apiKey: "",
      },
    });

    const config = getProviderConfig();
    expect(config.gemini.apiKeys).toEqual(["key-a", "key-b"]);
    expect(config.gemini.model).toBe("gemini-2.5-flash");
  });

  it("round-trips OpenAI-compatible config", () => {
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: [], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Ollama",
        baseUrl: "http://localhost:11434/v1",
        model: "llama3.2",
        apiKey: "ollama",
      },
    });

    const config = getProviderConfig();
    expect(config.activeProviderId).toBe("openai-compatible");
    expect(config.openAiCompatible.baseUrl).toBe("http://localhost:11434/v1");
    expect(config.openAiCompatible.model).toBe("llama3.2");
  });

  it("sanitizes malformed stored JSON back to defaults", () => {
    storage.set("nonotes:ai-provider-config", "{not json");
    const config = getProviderConfig();
    expect(config.gemini.apiKeys).toEqual([]);
    expect(config.activeProviderId).toBe("gemini");
  });

  it("legacy setApiKey stores the first Gemini key", () => {
    setApiKey("legacy-key");
    expect(getApiKey()).toBe("legacy-key");
    expect(hasApiKey()).toBe(true);
    const config = getProviderConfig();
    expect(config.gemini.apiKeys).toEqual(["legacy-key"]);
  });

  it("legacy clearApiKey removes all Gemini keys", () => {
    setApiKey("legacy-key");
    clearApiKey();
    expect(getApiKey()).toBeNull();
    expect(hasApiKey()).toBe(false);
  });

  it("reports configured only when the active provider has credentials", () => {
    expect(isProviderConfigured()).toBe(false);

    // Gemini with a key → configured.
    setApiKey("k");
    expect(isProviderConfigured()).toBe(true);

    // OpenAI-compatible active but incomplete → not configured.
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: ["k"], model: "gemini-2.0-flash" },
      openAiCompatible: { displayName: "", baseUrl: "", model: "", apiKey: "" },
    });
    expect(isProviderConfigured()).toBe(false);

    // Fully configured OAC → configured.
    setProviderConfig({
      activeProviderId: "openai-compatible",
      gemini: { apiKeys: [], model: "gemini-2.0-flash" },
      openAiCompatible: {
        displayName: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        model: "llama-3.3-70b",
        apiKey: "gsk-...",
      },
    });
    expect(isProviderConfigured()).toBe(true);
    expect(getActiveProviderLabel()).toBe("Groq");
  });
});