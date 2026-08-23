"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA offline caching.
 * Only runs in production and in browsers that support service workers.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration failure is non-critical.
      // The app remains fully functional without offline support.
    });
  }, []);

  return null;
}
