import * as pdfjsLib from "pdfjs-dist";

// Configure the worker for browser use
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/** Maximum allowed PDF file size (10 MB). */
const MAX_PDF_SIZE = 10 * 1024 * 1024;

/** Result of PDF text extraction. */
export type PdfExtractionResult = {
  text: string;
  pageCount: number;
  title?: string;
};

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
): Promise<PdfExtractionResult> {
  // Validate size
  if (data.byteLength > MAX_PDF_SIZE) {
    throw new Error(
      `PDF file is too large (${Math.round(data.byteLength / 1024 / 1024)} MB). Maximum is 10 MB.`,
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

  // Extract text from each page
  const pageTexts: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
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

    if (pageText.trim()) {
      pageTexts.push(pageText.trim());
    }
  }

  const text = pageTexts.join("\n\n");

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
