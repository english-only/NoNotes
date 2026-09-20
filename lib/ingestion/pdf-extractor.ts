import * as pdfjsLib from "pdfjs-dist";

// Configure the worker for browser use
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/** Maximum allowed PDF file size (70 MB). */
const MAX_PDF_SIZE = 70 * 1024 * 1024;

/** Result of PDF text extraction. */
export type PdfExtractionResult = {
  text: string;
  pageCount: number;
  title?: string;
};

/** Options for text extraction. */
export type PdfExtractionOptions = {
  /** Called after each page finishes, with (pagesDone, totalPages). */
  onProgress?: (done: number, total: number) => void;
};

/**
 * Maximum number of pages extracted in parallel. pdfjs compresses page data
 * independently per page, so concurrent getPage/textContent calls are safe
 * and dramatically faster on large documents than a sequential loop.
 */
const PAGE_CONCURRENCY = 8;

/**
 * Extract readable text from a PDF file.
 *
 * @param data - The PDF file as an ArrayBuffer or Uint8Array.
 * @param fileName - Original filename for metadata.
 * @returns Extracted text and metadata.
 * @throws If the file is too large, empty, or malformed.
 */
export async function extractPdfText(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  options: PdfExtractionOptions = {},
): Promise<PdfExtractionResult> {
  // Validate size
  if (data.byteLength > MAX_PDF_SIZE) {
    throw new Error(
      `PDF file is too large (${Math.round(data.byteLength / 1024 / 1024)} MB). Maximum is 70 MB.`,
    );
  }

  if (data.byteLength === 0) {
    throw new Error("PDF file is empty.");
  }

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Invalid PDF") || message.includes("password")) {
      throw new Error(
        `Could not read PDF "${fileName}". The file may be corrupted, password-protected, or not a valid PDF.`,
      );
    }
    throw new Error(`Failed to parse PDF "${fileName}": ${message}`);
  }

  const pageCount = doc.numPages;

  if (pageCount === 0) {
    throw new Error("PDF file contains no pages.");
  }

  // Extract text from pages with bounded concurrency, preserving order.
  // Results are written into a preallocated array indexed by page number so
  // output order is deterministic regardless of completion order.
  const pageTexts: string[] = new Array(pageCount);
  let pagesDone = 0;

  const extractPage = async (pageIndex: number): Promise<void> => {
    const pageNumber = pageIndex + 1;
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    // Reconstruct text from items, preserving line structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = content.items as any[];
    const textItems = items.filter(
      (item) => item && typeof item.str === "string" && Array.isArray(item.transform),
    );

    let pageText = "";
    let lastY: number | null = null;

    for (const item of textItems) {
      const y = item.transform[5]; // vertical position
      // If y position changed significantly, insert a newline
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        pageText += "\n";
      } else if (lastY !== null && pageText.length > 0 && !pageText.endsWith("\n")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = y;
    }

    pageTexts[pageIndex] = pageText.trim();
    pagesDone += 1;
    options.onProgress?.(pagesDone, pageCount);
  };

  const queue = Array.from({ length: pageCount }, (_, i) => i);
  const workers = Array.from(
    { length: Math.min(PAGE_CONCURRENCY, pageCount) },
    async () => {
      while (queue.length > 0) {
        const pageIndex = queue.shift();
        if (pageIndex === undefined) break;
        await extractPage(pageIndex);
      }
    },
  );
  await Promise.all(workers);

  const text = pageTexts.filter((t) => t && t.length > 0).join("\n\n");

  if (!text.trim()) {
    throw new Error(
      "PDF file contains no readable text. It may be a scanned/image-only PDF.",
    );
  }

  // Try to get metadata
  let title: string | undefined;
  try {
    const metadata = await doc.getMetadata();
    if (metadata.info && typeof metadata.info === "object" && "Title" in metadata.info) {
      const t = metadata.info.Title;
      if (typeof t === "string" && t.trim()) {
        title = t.trim();
      }
    }
  } catch {
    // Metadata extraction is best-effort
  }

  return { text, pageCount, title };
}
