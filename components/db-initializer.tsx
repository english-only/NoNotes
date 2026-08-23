"use client";

/**
 * Side-effect component that ensures the Dexie instance is exposed on
 * `window.__nonotes_db__` for Playwright test helpers. Mount once in the
 * workspace shell so every page has it available.
 */
import "@/lib/db/client";

export function DbInitializer() {
  return null;
}
