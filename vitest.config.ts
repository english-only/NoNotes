import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // Ratchet: `app/**` is excluded until component tests land (Phase 3+ TODO:
      // re-include "app/**" once RTL/component tests exist — app/ is at 0%).
      // Thresholds sit just below the measured lib/ baseline
      // (lines 71.18, functions 85.71, branches 74.95, statements 72.89)
      // so the gate enforces the ratchet without failing today.
      include: ["lib/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/types.ts",
      ],
      thresholds: {
        lines: 71,
        functions: 85,
        branches: 74,
        statements: 72,
      },
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
