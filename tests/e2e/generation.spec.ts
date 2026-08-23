import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, seedDeck, seedSource, waitForDB } from "./helpers";

test.describe("Generation Dialog", () => {
  let courseId: string;
  let deckId: string;

  test.beforeEach(async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    courseId = await seedCourse(page, "Biology");
    deckId = await seedDeck(page, courseId, "Bio Deck");
  });

  test("Generate button opens dialog", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Generate from source")).toBeVisible();
  });

  test("shows no sources available when empty", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page.getByText("No sources available")).toBeVisible({ timeout: 5000 });
  });

  test("shows source in select after adding one", async ({ page }) => {
    await seedSource(page, courseId, "Lecture Notes", "Photosynthesis converts light.");
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    // "No sources available" should NOT appear — instead the select should be visible
    await expect(page.getByText("No sources available")).not.toBeVisible({ timeout: 5000 });
    const select = page.getByLabel("Source material");
    await expect(select).toBeVisible();
    // Verify the option exists by selecting it successfully
    await select.selectOption({ label: "Lecture Notes (text)" });
  });

  test("card count input works", async ({ page }) => {
    await seedSource(page, courseId, "Notes", "Some content.");
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page.getByLabel("Source material")).toBeVisible({ timeout: 5000 });

    const cardCountInput = page.getByLabel(/number of flashcards/i);
    await cardCountInput.fill("10");
    await expect(cardCountInput).toHaveValue("10");
  });

  test("dialog can be closed", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  test("generate without API key shows error", async ({ page }) => {
    await seedSource(page, courseId, "Notes", "Some content.");
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: /Generate/i }).click();
    // Select source
    await page.getByLabel("Source material").selectOption({ label: "Notes (text)" });
    // Click the Generate action button inside the dialog
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^Generate$/i }).click();

    // Should show API key error
    await expect(dialog.getByText(/API key|Settings/i)).toBeVisible({ timeout: 5000 });
  });
});
