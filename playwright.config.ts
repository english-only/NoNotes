import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:3800",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npx next dev -p 3800 -H 127.0.0.1",
    url: "http://127.0.0.1:3800",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
