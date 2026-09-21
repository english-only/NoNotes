import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // Component tests (app/**/*.test.tsx) declare `@vitest-environment jsdom`
    // per file; the file's own docblock handles environment switching and
    // `vitest.dom-setup.ts` (listed below) registers jest-dom matchers.
    // (Vitest 4 removed environmentMatchGlobs; setupFiles run for all envs.)
    setupFiles: ["./vitest.setup.ts", "./vitest.dom-setup.ts"],
    coverage: {
      provider: "v8",
      // Ratchet: lib/** thresholds sit just below the measured baseline
      // (lines 71.18, functions 85.71, branches 74.95, statements 72.89).
      // app/_components is measured for the feature components covered by
      // RTL tests (dialogs + study session); routes/pages join the ratchet
      // as they gain tests. Thresholds sit just below that combined baseline.
      include: ["lib/**", "app/**/_components/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/types.ts",
      ],
      thresholds: {
        // Combined lib/** + app/**/_components ratchet (measured 2026-09-21:
        // lines 55.31, functions 47.73, branches 47.26, statements 54.8).
        // lib/ alone sits at 83/89/81/86; the aggregate is dragged by
        // untested UI feature components — the ratchet forbids regressions
        // and climbs as RTL coverage expands.
        lines: 55,
        functions: 47,
        branches: 47,
        statements: 54,
      },
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
