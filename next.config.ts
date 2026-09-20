import type { NextConfig } from "next";

/**
 * Baseline security headers. A strict Content-Security-Policy is deliberately
 * NOT set yet: the app calls user-configured AI provider origins (e.g. a
 * self-hosted OpenAI-compatible endpoint) directly from the browser, so a
 * static CSP would break the core AI features.
 *
 * TODO: add a CSP with per-provider allowlisting driven by lib/ai/config
 * (connect-src must include the user's configured provider base URLs).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework/version in responses.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
