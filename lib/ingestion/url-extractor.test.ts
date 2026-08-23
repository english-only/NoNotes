import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractUrlContent } from "./url-extractor";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("extractUrlContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts content from a valid URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Test Page",
        text: "This is the extracted content.",
        url: "https://example.com",
      }),
    });

    const result = await extractUrlContent("https://example.com");
    expect(result.title).toBe("Test Page");
    expect(result.text).toBe("This is the extracted content.");
    expect(result.url).toBe("https://example.com");
  });

  it("rejects empty URL", async () => {
    await expect(extractUrlContent("")).rejects.toThrow("URL is required");
  });

  it("rejects invalid URL format", async () => {
    await expect(extractUrlContent("not-a-url")).rejects.toThrow(
      "Invalid URL format"
    );
  });

  it("handles server errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server returned 404 Not Found." }),
    });

    await expect(extractUrlContent("https://example.com/missing")).rejects.toThrow(
      "404"
    );
  });

  it("handles network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(extractUrlContent("https://example.com")).rejects.toThrow(
      "Network error"
    );
  });

  it("trims whitespace from URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Test",
        text: "content",
        url: "https://example.com",
      }),
    });

    await extractUrlContent("  https://example.com  ");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/extract-url",
      expect.objectContaining({
        body: JSON.stringify({ url: "https://example.com" }),
      })
    );
  });
});
