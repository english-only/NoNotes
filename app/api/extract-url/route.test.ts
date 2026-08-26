import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

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
});
