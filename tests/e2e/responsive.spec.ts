import { test, expect } from "@playwright/test";
import { gotoAndClear } from "./helpers";

test.describe("Responsive Layout", () => {
  test.describe("Mobile (390×844)", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("dashboard has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/dashboard");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("courses page has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/courses");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("study page has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/study");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("analytics page has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/analytics");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("settings page has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/settings");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("feynman page has no horizontal overflow", async ({ page }) => {
      await gotoAndClear(page, "/feynman");
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(390);
    });

    test("navigation is accessible on mobile", async ({ page }) => {
      await gotoAndClear(page, "/dashboard");
      // Mobile nav button should be present (hamburger/toggle)
      await expect(page.getByRole("button", { name: /Open navigation/i })).toBeVisible();
    });
  });

  test.describe("Desktop (1280×720)", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test("sidebar is visible on desktop", async ({ page }) => {
      await gotoAndClear(page, "/dashboard");
      await expect(page.locator("nav[aria-label='Main navigation']")).toBeVisible();
    });

    test("dashboard content fits desktop", async ({ page }) => {
      await gotoAndClear(page, "/dashboard");
      await expect(page.getByText("Active courses")).toBeVisible({ timeout: 10000 });
    });

    test("courses grid layout on desktop", async ({ page }) => {
      await gotoAndClear(page, "/courses");
      // Should show the course list without overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1280);
    });
  });
});
