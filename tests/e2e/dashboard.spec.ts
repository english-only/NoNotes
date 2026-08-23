import { test, expect } from "@playwright/test";
import { gotoAndClear, countRecords, seedCourse, waitForDB } from "./helpers";

test.describe("Dashboard", () => {
  test("loads and shows content", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Active courses")).toBeVisible();
    await expect(page.getByText("Your study loop")).toBeVisible();
  });

  test("sidebar shows all navigation items", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav).toBeVisible();
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Courses")).toBeVisible();
    await expect(nav.getByText("Study")).toBeVisible();
    await expect(nav.getByText("Feynman")).toBeVisible();
    await expect(nav.getByText("Analytics")).toBeVisible();
  });

  test("no critical console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await gotoAndClear(page, "/dashboard");

    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("React DevTools") &&
        !e.includes("HMR")
    );
    expect(critical).toHaveLength(0);
  });

  test("data persists after reload", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await seedCourse(page, "Math");
    await page.reload();
    await waitForDB(page);
    const count = await countRecords(page, "courses");
    expect(count).toBe(1);
  });

  test("explore courses link works", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await page.getByRole("link", { name: /Explore courses/i }).click();
    await expect(page).toHaveURL(/courses/);
  });
});
