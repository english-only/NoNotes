/** Result of URL content extraction. */
export type UrlExtractionResult = {
  text: string;
  title: string;
  url: string;
};

/**
 * Extract readable text from a URL via the server-side API.
 * This avoids CORS issues by fetching server-side.
 *
 * @param url - The URL to extract content from.
 * @returns Extracted text and metadata.
 * @throws If the URL is invalid, the fetch fails, or the content is unsupported.
 */
export async function extractUrlContent(url: string): Promise<UrlExtractionResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("URL is required.");
  }

  // Validate URL format client-side first
  try {
    new URL(trimmed);
  } catch {
    throw new Error("Invalid URL format. Please enter a valid URL starting with http:// or https://.");
  }

  const response = await fetch("/api/extract-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Failed to extract content (HTTP ${response.status}).`);
  }

  return {
    text: data.text,
    title: data.title,
    url: data.url,
  };
}
