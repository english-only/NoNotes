/**
 * In-memory sliding-window rate limiter for the extract-url proxy.
 *
 * NoNotes is local-first with no server state, so an in-memory window is the
 * right scope: it protects the single Node process from request-flood abuse
 * without adding Redis or any external dependency.
 */

/** Window length in milliseconds. */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Maximum requests per IP per window. */
export const RATE_LIMIT_MAX_REQUESTS = 30;

/**
 * Client IP → timestamps of requests inside the current window.
 * Entries are pruned lazily on access so the map cannot grow unboundedly.
 */
const requestLog = new Map<string, number[]>();

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the oldest in-window request exits the window (429 Retry-After). */
  retryAfterSeconds: number;
};

/**
 * Record a request for `ip` and decide whether it is within the limit.
 * Sliding window: a request is counted when it happens, and old timestamps
 * expire continuously rather than in fixed buckets.
 */
export function checkRateLimit(
  ip: string,
  now: number = Date.now()
): RateLimitResult {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(ip) ?? []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    // Oldest still-in-window request determines when capacity frees up.
    const oldest = timestamps[0];
    requestLog.set(ip, timestamps);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000)
      ),
    };
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);

  // Opportunistic global prune so abandoned IPs do not leak memory forever.
  if (requestLog.size > 1000) {
    for (const [key, stamps] of requestLog) {
      if (stamps.every((t) => t <= windowStart)) {
        requestLog.delete(key);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test-only: clear all client state. */
export function __resetRateLimiterForTests(): void {
  requestLog.clear();
}
