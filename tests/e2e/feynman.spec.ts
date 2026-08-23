import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, waitForDB } from "./helpers";

test.describe("Feynman", () => {
  test("loads and shows content", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    await expect(page.getByText("Explain it simply")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Course")).toBeVisible();
    await expect(page.getByLabel("Concept to explain")).toBeVisible();
    await expect(page.getByLabel("Your explanation")).toBeVisible();
  });

  test("shows course selector after creating course", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    await seedCourse(page, "Biology");
    await page.goto("/feynman");
    await waitForDB(page);
    await expect(page.getByLabel("Course")).toBeVisible({ timeout: 10000 });
  });

  test("submit button is disabled without required fields", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    const submitBtn = page.getByRole("button", { name: /Evaluate/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeDisabled();
  });

  test("shows empty state when no courses", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    await expect(page.getByText("No courses yet")).toBeVisible({ timeout: 10000 });
  });

  test("enables submit when fields are filled", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    await seedCourse(page, "Biology");
    await page.goto("/feynman");
    await waitForDB(page);
    await page.waitForTimeout(500);

    // Fill concept and explanation
    await page.getByLabel("Concept to explain").fill("Photosynthesis");
    await page.getByLabel("Your explanation").fill("Plants use sunlight to convert carbon dioxide and water into glucose and oxygen.");

    // Submit button should be enabled (no API key = shows error, not disabled)
    await page.getByRole("button", { name: /Evaluate/i }).click();

    // Should show API key missing error — scope to main content to avoid nav ambiguity
    await expect(page.getByRole("main").getByText(/API key|Settings/i)).toBeVisible({ timeout: 5000 });
  });

  test("word count updates", async ({ page }) => {
    await gotoAndClear(page, "/feynman");
    await expect(page.getByText("Write as much or as little as you want.")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Your explanation").fill("One two three four five");
    await expect(page.getByText("5 words")).toBeVisible();
  });

  test("no critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await gotoAndClear(page, "/feynman");

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
