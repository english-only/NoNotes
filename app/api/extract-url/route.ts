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

/** True when the four octets describe a private/internal IPv4 address. */
function isPrivateIPv4(octets: number[]): boolean {
  const [a, b] = octets;
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // 10.0.0.0/8
    a === 127 || // 127.0.0.0/8 loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
    a >= 224 // multicast + reserved
  );
}

/** Convert an IPv4-mapped IPv6 tail like `7f00:1` to `127.0.0.1`. */
function ipv6MappedToIPv4(tail: string): string | null {
  const m = tail.toLowerCase().match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!m) return null;
  const num = (parseInt(m[1], 16) << 16) | parseInt(m[2], 16);
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join(".");
}

/**
 * True when a hostname targets a private/internal/loopback/link-local
 * destination. Handles dotted-quad IPv4, IPv6 literals (loopback, ULA,
 * link-local, multicast, unspecified) and IPv4-mapped IPv6 such as
 * `[::ffff:127.0.0.1]` / `[::ffff:7f00:1]`, which normalize to a form the
 * plain hostname checks would miss.
 */
function isPrivateHostname(rawHostname: string): boolean {
  const host = rawHostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return true;

  // Domain-based private/internal names.
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }

  // Dotted-quad IPv4 literal.
  const dotted = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (dotted) {
    const octets = dotted.slice(1).map(Number);
    if (octets.some((o) => o > 255)) return true; // malformed octet: unsafe
    return isPrivateIPv4(octets);
  }

  // IPv6 literal.
  if (host.includes(":")) {
    // IPv4-mapped IPv6 (`::ffff:a.b.c.d` or the canonical hex tail).
    const mapped = host.match(/^::ffff:(.+)$/);
    if (mapped) {
      const tail = mapped[1];
      const quad = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(tail);
      if (quad) {
        const octets = quad.slice(1).map(Number);
        if (octets.some((o) => o > 255)) return true;
        return isPrivateIPv4(octets);
      }
      const ipv4 = ipv6MappedToIPv4(tail);
      if (ipv4) {
        return isPrivateIPv4(ipv4.split(".").map(Number));
      }
      return true; // unparseable mapped tail: unsafe
    }
    // Unspecified and loopback.
    if (host === "::" || host === "::1") return true;
    // Link-local fe80::/10 — first hextet fe80–febf.
    if (/^fe[89ab][0-9a-f]{1,4}:/.test(host)) return true;
    // Unique local fc00::/7 — first hextet fc00–fdff.
    if (/^f[cd][0-9a-f]{1,4}:/.test(host)) return true;
    // Multicast ff00::/8 — first hextet ff00–ffff.
    if (/^ff[0-9a-f]{1,4}:/.test(host)) return true;
    return false;
  }

  return false;
}

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
    if (isPrivateHostname(parsedUrl.hostname)) {
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
        return isPrivateHostname(new URL(urlString).hostname);
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
