"use client";

import { useEffect } from "react";

/**
 * Global error boundary: replaces the root layout when the root layout or
 * template itself throws, so it must render its own <html> and <body>.
 *
 * Next 16 App Router convention: client component receiving `error` and
 * `retry`. Global styles are not applied here (the app's global-error renders
 * its own document), so minimal inline-safe Tailwind-independent styling is
 * used via the app's CSS variables through the standard classes.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(0 0% 100%)",
          color: "hsl(240 10% 3.9%)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            padding: "2rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.875rem", margin: 0, opacity: 0.7 }}>
            NoNotes could not start. Reload the page to try again.
          </p>
          <button
            onClick={() => retry()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "hsl(240 5.9% 10%)",
              color: "hsl(0 0% 98%)",
              fontSize: "0.875rem",
              cursor: "pointer",
              alignSelf: "center",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
