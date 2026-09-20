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

  it("reports page progress during extraction", async () => {
    const pages = [1, 2, 3].map(() => ({
      numPages: 3,
      getPage: (i: number) =>
        Promise.resolve({
          getTextContent: () =>
            Promise.resolve({
              items: [
                { str: `Page ${i} text`, transform: [0, 0, 0, 0, 0, 100] },
              ],
            }),
        }),
    }));
    documentImpl = () => ({
      promise: Promise.resolve({
        numPages: 3,
        getPage: (i: number) => pages[0].getPage(i),
        getMetadata: () => Promise.resolve({ info: {} }),
      }),
    });

    const progressUpdates: number[] = [];
    const data = new ArrayBuffer(100);
    await extractPdfText(data, "progress.pdf", {
      onProgress: (done, total) => progressUpdates.push(done / total),
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(1);
  });

  it("extracts pages concurrently while preserving page order", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    documentImpl = () => ({
      promise: Promise.resolve({
        numPages: 8,
        getPage: (i: number) => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          return new Promise((resolve) => {
            setTimeout(() => {
              inFlight--;
              resolve({
                getTextContent: () =>
                  Promise.resolve({
                    items: [
                      { str: `Page ${i}`, transform: [0, 0, 0, 0, 0, 100] },
                    ],
                  }),
              });
            }, 10);
          });
        },
        getMetadata: () => Promise.resolve({ info: {} }),
      }),
    });

    const data = new ArrayBuffer(100);
    const result = await extractPdfText(data, "concurrent.pdf");

    // Order preserved despite concurrency.
    const pages = result.text.split("\n\n").map((p) => p.trim());
    expect(pages[0]).toContain("Page 1");
    expect(pages[7]).toContain("Page 8");
    // Concurrency actually happened (more than one page in flight at once).
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
