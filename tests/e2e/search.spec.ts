import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, seedDeck, seedFlashcard, seedTopic } from "./helpers";

test.describe("Search", () => {
  test("search button is visible in the header", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await expect(page.getByRole("button", { name: "Open search" })).toBeVisible();
  });

  test("clicking search button opens the command palette", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await page.getByRole("button", { name: "Open search" }).click();
    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("textbox")).toBeFocused();
  });

  test("Cmd+K opens the command palette", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  });

  test("Ctrl+K opens the command palette", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  });

  test("Escape closes the command palette and returns focus", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const trigger = page.getByRole("button", { name: "Open search" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Search" })).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("searching finds courses", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await seedCourse(page, "Biology 101", "Introduction to biology");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Biology");
    // Wait for debounced search to show results
    const result = page.getByRole("option", { name: /Biology 101/ });
    await expect(result).toBeVisible({ timeout: 5000 });
    await expect(result).toHaveAttribute("aria-selected", "true");
  });

  test("searching finds flashcards", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Chemistry");
    const deckId = await seedDeck(page, courseId, "Periodic Table");
    await seedFlashcard(page, deckId, "What is H2O?", "Water");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("H2O");
    await expect(page.getByRole("option", { name: /What is H2O/ })).toBeVisible({ timeout: 5000 });
  });

  test("searching finds decks", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Physics");
    await seedDeck(page, courseId, "Quantum Mechanics");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Quantum");
    await expect(page.getByRole("option", { name: /Quantum Mechanics/ })).toBeVisible({ timeout: 5000 });
  });

  test("searching finds topics", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Mathematics");
    await seedTopic(page, courseId, "Calculus Fundamentals");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Calculus");
    await expect(page.getByRole("option", { name: /Calculus Fundamentals/ })).toBeVisible({ timeout: 5000 });
  });

  test("search is case-insensitive", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await seedCourse(page, "Computer Science");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("computer");
    await expect(page.getByText("Computer Science")).toBeVisible({ timeout: 5000 });
  });

  test("no results shows empty state", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("xyznonexistent");
    await expect(page.getByText("No results found")).toBeVisible({ timeout: 5000 });
  });

  test("clicking a result navigates to the correct route", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "History");
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("History");
    await expect(page.getByRole("option", { name: /History/ })).toBeVisible({ timeout: 5000 });
    await page.getByRole("option", { name: /History/ }).first().click();
    // Should navigate to the course page
    await expect(page).toHaveURL(new RegExp(`/courses/${courseId}`));
  });

  test("search updates after creating a new entity", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    // Search before creating - should find nothing
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Zoology");
    await expect(page.getByText("No results found")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Search" })).not.toBeVisible();

    // Create a course by seeding directly
    await page.goto("/courses");
    await page.waitForLoadState("networkidle");
    await seedCourse(page, "Zoology");
    // Reload to pick up the new data
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Search again - should now find it
    await page.getByRole("button", { name: "Open search" }).click();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Zoology");
    await expect(page.getByRole("option", { name: /Zoology/ })).toBeVisible({ timeout: 5000 });
  });

  test("search works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndClear(page, "/dashboard");
    await seedCourse(page, "Mobile Test Course");
    await page.getByRole("button", { name: "Open search" }).click();
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("Mobile");
    await expect(page.getByText("Mobile Test Course")).toBeVisible({ timeout: 5000 });
  });
});
