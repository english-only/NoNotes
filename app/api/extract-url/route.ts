import { NextResponse } from "next/server";

/** Maximum response size (2 MB). */
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024;

/** Request timeout (15 seconds). */
const TIMEOUT_MS = 15_000;

/** Allowed content types for extraction. */
const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "text/markdown",
  "application/xhtml+xml",
];

/**
 * Extract readable text from HTML content.
 * Removes scripts, styles, navigation, and other boilerplate.
 */
function extractTextFromHtml(html: string, url: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let title = titleMatch?.[1]?.trim() || "";

  // Remove script and style elements
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  // Remove HTML tags but preserve content
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, "");

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Normalize whitespace
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Use URL hostname as fallback title
  if (!title) {
    try {
      title = new URL(url).hostname;
    } catch {
      title = "Untitled page";
    }
  }

  return { title, text: cleaned };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 },
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format." },
        { status: 400 },
      );
    }

    // Security: block private/internal addresses on the initial URL
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "[::1]"
    ) {
      return NextResponse.json(
        { error: "Cannot fetch private/internal URLs." },
        { status: 403 },
      );
    }

    // Only allow http/https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are supported." },
        { status: 400 },
      );
    }

    /** Check whether a URL points to a private/internal address. */
    function isPrivateUrl(urlString: string): boolean {
      try {
        const h = new URL(urlString).hostname.toLowerCase();
        return (
          h === "localhost" ||
          h === "127.0.0.1" ||
          h === "0.0.0.0" ||
          h.startsWith("192.168.") ||
          h.startsWith("10.") ||
          h.startsWith("172.") ||
          h.endsWith(".local") ||
          h.endsWith(".internal") ||
          h === "[::1]"
        );
      } catch {
        return true; // treat unparseable URLs as unsafe
      }
    }

    // Fetch with timeout. Use redirect:manual so we can validate each
    // redirect target against SSRF rules — redirect:follow would allow
    // a public URL to redirect to http://127.0.0.1 after initial validation.
    const MAX_REDIRECTS = 5;
    let currentUrl = parsedUrl.toString();
    let response: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let fetchResponse: Response;
      try {
        fetchResponse = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NoNotes/1.0 (Study Material Ingestion)",
            Accept: "text/html,text/plain,text/markdown,application/xhtml+xml,*/*",
          },
          redirect: "manual",
        });
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === "AbortError") {
          return NextResponse.json(
            { error: "Request timed out after 15 seconds." },
            { status: 408 },
          );
        }
        return NextResponse.json(
          { error: `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}` },
          { status: 502 },
        );
      }
      clearTimeout(timeout);

      // If not a redirect, we're done
      if (fetchResponse.status < 300 || fetchResponse.status >= 400) {
        response = fetchResponse;
        break;
      }

      // Validate redirect target for SSRF
      const location = fetchResponse.headers.get("location");
      if (!location) {
        return NextResponse.json(
          { error: "Redirect with no Location header." },
          { status: 502 },
        );
      }

      // Resolve relative redirects against the current URL
      let redirectTarget: string;
      try {
        redirectTarget = new URL(location, currentUrl).toString();
      } catch {
        return NextResponse.json(
          { error: "Invalid redirect URL." },
          { status: 502 },
        );
      }

      if (isPrivateUrl(redirectTarget)) {
        return NextResponse.json(
          { error: "Redirect leads to a private/internal address." },
          { status: 403 },
        );
      }

      currentUrl = redirectTarget;
    }

    if (!response) {
      return NextResponse.json(
        { error: "Too many redirects." },
        { status: 502 },
      );
    }

    // Check response status
    if (!response.ok) {
      return NextResponse.json(
        { error: `Server returned ${response.status} ${response.statusText}.` },
        { status: response.status },
      );
    }

    // Check content type
    const contentType = response.headers.get("content-type") ?? "";
    const isAllowed = ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t));
    if (!isAllowed && !contentType.includes("*/*")) {
      return NextResponse.json(
        { error: `Unsupported content type: ${contentType}. Only HTML and text pages are supported.` },
        { status: 415 },
      );
    }

    // Read response with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Could not read response body." },
        { status: 502 },
      );
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        return NextResponse.json(
          { error: "Page is too large (exceeds 2 MB)." },
          { status: 413 },
        );
      }
    }

    const bytes = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    const textContent = new TextDecoder().decode(bytes);

    // Extract text
    let result: { title: string; text: string };
    if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
      result = {
        title: parsedUrl.hostname,
        text: textContent,
      };
    } else {
      result = extractTextFromHtml(textContent, url);
    }

    if (!result.text.trim()) {
      return NextResponse.json(
        { error: "Page contains no readable text content." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      title: result.title,
      text: result.text,
      url: parsedUrl.toString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
