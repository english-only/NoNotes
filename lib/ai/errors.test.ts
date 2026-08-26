import { describe, expect, it } from "vitest";

import {
  classifyProviderError,
  isFallbackEligible,
  ProviderError,
} from "./errors";

describe("classifyProviderError", () => {
  it("passes through existing ProviderError instances", () => {
    const original = new ProviderError("quota", "Gemini");
    const result = classifyProviderError(original, "Gemini");
    expect(result).toBe(original);
  });

  it("classifies HTTP 401 as authentication", () => {
    const err = classifyProviderError({ status: 401 }, "Gemini");
    expect(err.type).toBe("authentication");
    expect(err.message).toMatch(/API key/i);
  });

  it("classifies HTTP 429 as rate-limit", () => {
    const err = classifyProviderError({ status: 429 }, "Gemini");
    expect(err.type).toBe("rate-limit");
  });

  it("classifies HTTP 408 as timeout", () => {
    const err = classifyProviderError({ status: 408 }, "Gemini");
    expect(err.type).toBe("timeout");
  });

  it("classifies quota text as quota", () => {
    const err = classifyProviderError(new Error("quota exceeded"), "Groq");
    expect(err.type).toBe("quota");
  });

  it("classifies invalid key text as authentication", () => {
    const err = classifyProviderError(new Error("unauthorized api key"), "OpenRouter");
    expect(err.type).toBe("authentication");
  });

  it("classifies fetch network failures as network", () => {
    const err = classifyProviderError(new Error("Failed to fetch: network"), "Ollama");
    expect(err.type).toBe("network");
  });

  it("classifies JSON/parse errors as malformed", () => {
    const err = classifyProviderError(new Error("Unexpected token in JSON"), "Gemini");
    expect(err.type).toBe("malformed");
  });

  it("defaults unknown errors to unknown without leaking details", () => {
    const err = classifyProviderError(new Error("something internal with a secret sk-abc"), "Gemini");
    expect(err.type).toBe("unknown");
  });

  it("never exposes provider internals in classified messages", () => {
    const err = classifyProviderError({ status: 401, statusText: "gibberish sk-abc" }, "Gemini");
    expect(err.message).not.toMatch(/sk-abc/);
  });
});

describe("isFallbackEligible", () => {
  it("allows credential/quota/network/timeout failures to fall back", () => {
    expect(isFallbackEligible("authentication")).toBe(true);
    expect(isFallbackEligible("quota")).toBe(true);
    expect(isFallbackEligible("rate-limit")).toBe(true);
    expect(isFallbackEligible("network")).toBe(true);
    expect(isFallbackEligible("timeout")).toBe(true);
  });

  it("does not fall back for malformed output or not-configured", () => {
    expect(isFallbackEligible("malformed")).toBe(false);
    expect(isFallbackEligible("not-configured")).toBe(false);
    expect(isFallbackEligible("unknown")).toBe(false);
  });
});