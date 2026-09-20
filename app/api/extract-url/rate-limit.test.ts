import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetRateLimiterForTests,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  checkRateLimit,
} from "./rate-limit";

describe("extract-url rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetRateLimiterForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const result = checkRateLimit("203.0.113.7");
      expect(result.allowed).toBe(true);
    }
  });

  it("returns not-allowed with Retry-After for the N+1th rapid request", () => {
    const ip = "198.51.100.9";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit(ip).allowed).toBe(true);
    }

    const blocked = checkRateLimit(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(
      RATE_LIMIT_WINDOW_MS / 1000
    );
  });

  it("restores access after the window expires", () => {
    const ip = "198.51.100.10";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip).allowed).toBe(false);

    // Advance past the full window: every timestamp falls out of scope.
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    expect(checkRateLimit(ip).allowed).toBe(true);
  });

  it("tracks clients independently", () => {
    const a = "192.0.2.1";
    const b = "192.0.2.2";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(a);
    }
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });

  it("sliding window: partial expiry frees partial capacity", () => {
    const ip = "192.0.2.3";
    // Stagger requests: 15 now, then jump forward half a window, then 15 more.
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS / 2; i++) {
      checkRateLimit(ip);
    }
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS / 2 + 1);
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS / 2; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip).allowed).toBe(false);

    // Half a window passes: the first batch of requests expires.
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS / 2 + 1);

    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
  });
});
