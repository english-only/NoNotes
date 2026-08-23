import { test, expect } from "@playwright/test";
import { gotoAndClear } from "./helpers";

test.describe("Navigation", () => {
  test("desktop sidebar is visible", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await expect(page.locator("nav[aria-label='Main navigation']")).toBeVisible();
  });

  test("all navigation links are present", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Courses")).toBeVisible();
    await expect(nav.getByText("Study")).toBeVisible();
    await expect(nav.getByText("Feynman")).toBeVisible();
    await expect(nav.getByText("Analytics")).toBeVisible();
    await expect(nav.getByText("Settings")).toBeVisible();
  });

  test("navigation links go to correct routes", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");

    await page.getByRole("link", { name: /Courses/i }).first().click();
    await expect(page).toHaveURL(/courses/);

    await page.getByRole("link", { name: /Study/i }).first().click();
    await expect(page).toHaveURL(/study/);

    await page.getByRole("link", { name: /Feynman/i }).first().click();
    await expect(page).toHaveURL(/feynman/);

    await page.getByRole("link", { name: /Analytics/i }).first().click();
    await expect(page).toHaveURL(/analytics/);

    await page.getByRole("link", { name: /Settings/i }).first().click();
    await expect(page).toHaveURL(/settings/);

    await page.getByRole("link", { name: /Dashboard/i }).first().click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("current page is indicated in navigation", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    const coursesLink = page.locator("nav[aria-label='Main navigation']").getByRole("link", { name: /Courses/i });
    await expect(coursesLink).toHaveAttribute("aria-current", "page");
  });
});
