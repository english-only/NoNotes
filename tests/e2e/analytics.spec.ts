import { test, expect } from "@playwright/test";
import { gotoAndClear } from "./helpers";

test.describe("Analytics", () => {
  test("loads and shows empty state", async ({ page }) => {
    await gotoAndClear(page, "/analytics");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No reviews yet")).toBeVisible({ timeout: 10000 });
  });

  test("shows overview metrics", async ({ page }) => {
    await gotoAndClear(page, "/analytics");
    await expect(page.getByText("Total cards")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total reviews")).toBeVisible();
    await expect(page.getByText("Due now")).toBeVisible();
    await expect(page.getByText("Mastery")).toBeVisible();
  });

  test("shows rating distribution section", async ({ page }) => {
    await gotoAndClear(page, "/analytics");
    await expect(page.getByText("Rating distribution")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Again")).toBeVisible();
    await expect(page.getByText("Hard")).toBeVisible();
    await expect(page.getByText("Good")).toBeVisible();
    await expect(page.getByText("Easy")).toBeVisible();
  });

  test("shows study summary section", async ({ page }) => {
    await gotoAndClear(page, "/analytics");
    await expect(page.getByText("Study summary")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Reviews this week")).toBeVisible();
    await expect(page.getByText("Sources ingested")).toBeVisible();
    await expect(page.getByText("Average stability")).toBeVisible();
  });

  test("no critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await gotoAndClear(page, "/analytics");

    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("React DevTools") &&
        !e.includes("HMR")
    );
    expect(critical).toHaveLength(0);
  });
});
