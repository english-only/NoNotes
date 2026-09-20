import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { __resetRateLimiterForTests } from "./rate-limit";

// Mock fetch for the API route tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/extract-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTests();
  });

  it("extracts text from a valid HTML page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                "<html><head><title>Test Page</title></head><body><p>Hello world</p></body></html>"
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const response = await POST(createRequest({ url: "https://example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Test Page");
    expect(data.text).toContain("Hello world");
  });

  it("rejects missing URL", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("URL is required");
  });

  it("rejects invalid URL format", async () => {
    const response = await POST(createRequest({ url: "not-a-url" }));
    expect(response.status).toBe(400);
  });

  it("blocks localhost", async () => {
    const response = await POST(createRequest({ url: "http://localhost:3000" }));
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("private");
  });

  it("blocks 127.0.0.1", async () => {
    const response = await POST(createRequest({ url: "http://127.0.0.1/admin" }));
    expect(response.status).toBe(403);
  });

  it("blocks private IP ranges", async () => {
    const response = await POST(createRequest({ url: "http://192.168.1.1/" }));
    expect(response.status).toBe(403);
  });

  it("blocks IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)", async () => {
    const response = await POST(
      createRequest({ url: "http://[::ffff:127.0.0.1]/admin" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks IPv4-mapped IPv6 loopback in hex form (::ffff:7f00:1)", async () => {
    const response = await POST(
      createRequest({ url: "http://[0:0:0:0:0:ffff:7f00:1]/admin" })
    );
    expect(response.status).toBe(403);
  });

  it("blocks IPv6 loopback [::1]", async () => {
    const response = await POST(createRequest({ url: "http://[::1]/" }));
    expect(response.status).toBe(403);
  });

  it("blocks IPv6 unique-local (ULA) addresses", async () => {
    const response = await POST(createRequest({ url: "http://[fc00::1]/" }));
    expect(response.status).toBe(403);
  });

  it("blocks IPv6 link-local addresses", async () => {
    const response = await POST(createRequest({ url: "http://[fe80::1]/" }));
    expect(response.status).toBe(403);
  });

  it("blocks redirect to IPv4-mapped IPv6 loopback (SSRF via redirect)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers({ location: "http://[::ffff:127.0.0.1]:5432/admin" }),
    });

    const response = await POST(createRequest({ url: "https://evil.com/redirect" }));
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Redirect leads to a private");
  });

  it("allows public IPv6 destinations", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                "<html><body>Public IPv6 content</body></html>"
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const response = await POST(
      createRequest({ url: "http://[2606:4700:4700::1111]/" })
    );
    expect(response.status).toBe(200);
  });

  it("blocks non-http protocols", async () => {
    const response = await POST(createRequest({ url: "ftp://example.com" }));
    expect(response.status).toBe(400);
  });

  it("handles 404 responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
    });

    const response = await POST(
      createRequest({ url: "https://example.com/missing" })
    );
    expect(response.status).toBe(404);
  });

  it("handles timeout", async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));

    const response = await POST(createRequest({ url: "https://slow-example.com" }));
    expect(response.status).toBe(408);
  });

  it("rejects unsupported content types", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/pdf" }),
    });

    const response = await POST(
      createRequest({ url: "https://example.com/file.pdf" })
    );
    expect(response.status).toBe(415);
  });

  it("extracts plain text content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/plain" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode("Simple plain text content."),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const response = await POST(
      createRequest({ url: "https://example.com/readme.txt" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toContain("Simple plain text content");
  });

  it("blocks redirect to private IP (SSRF via redirect)", async () => {
    // First fetch returns a 302 redirect to localhost
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers({ location: "http://127.0.0.1:5432/admin" }),
    });

    const response = await POST(
      createRequest({ url: "https://evil.com/redirect" }));
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Redirect leads to a private");
  });

  it("follows safe redirects to public hosts", async () => {
    // First: 302 to another public host
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers({ location: "https://other-public.com/page" }),
    });
    // Second: final page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode("<html><body>Redirected content</body></html>"),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const response = await POST(
      createRequest({ url: "https://example.com/redirect" })
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.text).toContain("Redirected content");
  });

  it("blocks redirect to 192.168.x.x (SSRF)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 301,
      statusText: "Moved",
      headers: new Headers({ location: "http://192.168.1.100/secret" }),
    });

    const response = await POST(
      createRequest({ url: "https://example.com/go" }));
    expect(response.status).toBe(403);
  });

  it("rejects responses larger than 2 MB with 413", async () => {
    // Stream a body that exceeds MAX_RESPONSE_SIZE in two chunks.
    const chunkSize = 1.5 * 1024 * 1024;
    const bigChunk = new Uint8Array(chunkSize); // zero-filled is fine
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({ done: false, value: bigChunk })
            .mockResolvedValueOnce({ done: false, value: bigChunk })
            .mockResolvedValue({ done: true }),
          cancel: vi.fn(),
        }),
      },
    });

    const response = await POST(createRequest({ url: "https://example.com/huge" }));
    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data.error).toContain("too large");
  });

  it("rejects more than 5 redirects with 'Too many redirects'", async () => {
    // Six consecutive 302s: the loop allows MAX_REDIRECTS=5 hops, so the
    // sixth redirect must surface the limit error.
    for (let i = 0; i < 6; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 302,
        statusText: "Found",
        headers: new Headers({ location: `https://hop-${i + 1}.example.com/` }),
      });
    }

    const response = await POST(createRequest({ url: "https://example.com/loop" }));
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("Too many redirects");
  });

  it("returns 502 for a redirect with a missing Location header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers(),
    });

    const response = await POST(createRequest({ url: "https://example.com/odd" }));
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("no Location");
  });

  it("resolves relative Location headers and re-validates SSRF on the resolved URL", async () => {
    // A relative redirect to /private stays on the (public) host: allowed.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers({ location: "/landing" }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                "<html><body>Relative redirect content</body></html>"
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const response = await POST(
      createRequest({ url: "https://example.com/relative-redirect" })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.text).toContain("Relative redirect content");
    // The second fetch must have followed the resolved absolute URL.
    expect(mockFetch).toHaveBeenLastCalledWith(
      "https://example.com/landing",
      expect.any(Object)
    );
  });

  it("blocks a relative redirect that resolves to a private address", async () => {
    // Same-host relative path whose host is private once resolved via a
    // public-to-private open redirector: the resolved target must be
    // re-validated. Here the redirect target resolves to a private IP
    // through protocol-relative form.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 302,
      statusText: "Found",
      headers: new Headers({ location: "//192.168.0.10/admin" }),
    });

    const response = await POST(
      createRequest({ url: "https://example.com/relative-private" })
    );
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Redirect leads to a private");
  });
});
