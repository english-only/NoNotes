import { test, expect } from "@playwright/test";

test("smoke: dashboard loads and shows content", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/dashboard");

  // Wait for the page to render
  await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

  // Should have meaningful heading
  const heading = await page.locator("h1").first().textContent();
  expect(heading).toBeTruthy();

  // Sidebar navigation should exist
  await expect(page.locator("nav[aria-label='Main navigation']")).toBeVisible();

  // No critical console errors (filter out benign framework warnings)
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !e.includes("Download the React DevTools")
  );
  expect(criticalErrors).toHaveLength(0);
});

test("smoke: all main routes return 200", async ({ page }) => {
  const routes = ["/dashboard", "/courses", "/study", "/feynman", "/analytics", "/settings"];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  }
});
