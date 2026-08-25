import { describe, it, expect, vi, beforeEach } from "vitest";

// Track which mock implementation to use
let documentImpl: (() => { promise: Promise<unknown> }) | null = null;

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => {
    if (documentImpl) {
      return documentImpl();
    }
    return {
      promise: Promise.resolve({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () =>
              Promise.resolve({
                items: [
                  { str: "Hello world", transform: [0, 0, 0, 0, 0, 100] },
                  { str: "This is a test", transform: [0, 0, 0, 0, 0, 80] },
                ],
              }),
          }),
        getMetadata: () =>
          Promise.resolve({ info: { Title: "Test Document" } }),
      }),
    };
  },
}));

const { extractPdfText } = await import("./pdf-extractor");

describe("extractPdfText", () => {
  beforeEach(() => {
    documentImpl = null;
  });

  it("extracts text from a valid PDF", async () => {
    const data = new ArrayBuffer(100);
    const result = await extractPdfText(data, "test.pdf");
    expect(result.text).toContain("Hello world");
    expect(result.pageCount).toBe(1);
  });

  it("rejects empty files", async () => {
    const data = new ArrayBuffer(0);
    await expect(extractPdfText(data, "empty.pdf")).rejects.toThrow("empty");
  });

  it("accepts a file exactly at the 70 MB limit", async () => {
    const data = new ArrayBuffer(70 * 1024 * 1024);
    const result = await extractPdfText(data, "limit.pdf");
    expect(result.pageCount).toBe(1);
  });

  it("rejects files above the 70 MB limit", async () => {
    const data = new ArrayBuffer(70 * 1024 * 1024 + 1);
    await expect(extractPdfText(data, "large.pdf")).rejects.toThrow("70 MB");
  });

  it("handles malformed PDF gracefully", async () => {
    documentImpl = () => ({
      promise: Promise.reject(new Error("Invalid PDF")),
    });
    const data = new ArrayBuffer(100);
    await expect(extractPdfText(data, "corrupt.pdf")).rejects.toThrow("corrupted");
  });

  it("handles password-protected PDF", async () => {
    documentImpl = () => ({
      promise: Promise.reject(new Error("password required")),
    });
    const data = new ArrayBuffer(100);
    await expect(extractPdfText(data, "protected.pdf")).rejects.toThrow(
      "password-protected"
    );
  });

  it("handles PDF with no readable text", async () => {
    documentImpl = () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () => Promise.resolve({ items: [] }),
          }),
        getMetadata: () => Promise.resolve({ info: {} }),
      }),
    });
    const data = new ArrayBuffer(100);
    await expect(extractPdfText(data, "image-only.pdf")).rejects.toThrow(
      "no readable text"
    );
  });
});
