import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, seedDeck, waitForDB } from "./helpers";

test.describe("Deck Detail", () => {
  let courseId: string;
  let deckId: string;

  test.beforeEach(async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    courseId = await seedCourse(page, "Biology");
    deckId = await seedDeck(page, courseId, "Bio Deck");
  });

  test("loads deck workspace", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText("Bio Deck")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Deck workspace")).toBeVisible();
  });

  test("shows empty state for cards", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText("No cards yet")).toBeVisible({ timeout: 10000 });
  });

  test("create manual flashcard", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add card" }).click();
    await page.getByRole("textbox", { name: /Prompt/i }).fill("What is DNA?");
    await page.getByRole("textbox", { name: /Answer/i }).fill("Deoxyribonucleic acid");
    await page.getByRole("button", { name: "Create card" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("What is DNA?")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Deoxyribonucleic acid")).toBeVisible();
  });

  test("edit flashcard", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    // Create card first
    await page.getByRole("button", { name: "Add card" }).click();
    await page.getByRole("textbox", { name: /Prompt/i }).fill("Original prompt");
    await page.getByRole("textbox", { name: /Answer/i }).fill("Original answer");
    await page.getByRole("button", { name: "Create card" }).last().click();
    await expect(page.getByText("Original prompt")).toBeVisible({ timeout: 5000 });

    // Edit card
    await page.getByRole("button", { name: /Edit Original prompt/i }).click();
    await page.getByRole("textbox", { name: /Prompt/i }).fill("Updated prompt");
    await page.getByRole("textbox", { name: /Answer/i }).fill("Updated answer");
    await page.getByRole("button", { name: "Save changes" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Updated prompt")).toBeVisible({ timeout: 5000 });
  });

  test("delete flashcard", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add card" }).click();
    await page.getByRole("textbox", { name: /Prompt/i }).fill("Delete me");
    await page.getByRole("textbox", { name: /Answer/i }).fill("Answer");
    await page.getByRole("button", { name: "Create card" }).last().click();
    await expect(page.getByText("Delete me")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Delete Delete me/i }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("Delete me")).not.toBeVisible({ timeout: 5000 });
  });

  test("shows Generate button", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await expect(page.getByRole("button", { name: /Generate/i })).toBeVisible({ timeout: 10000 });
  });

  test("card count updates", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText("0 cards")).toBeVisible({ timeout: 10000 });

    // Create a card
    await page.getByRole("button", { name: "Add card" }).click();
    await page.getByRole("textbox", { name: /Prompt/i }).fill("Q1");
    await page.getByRole("textbox", { name: /Answer/i }).fill("A1");
    await page.getByRole("button", { name: "Create card" }).last().click();
    await expect(page.getByText("1 card")).toBeVisible({ timeout: 5000 });
  });

  test("invalid deck shows not found", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/nonexistent`);
    await waitForDB(page);
    await expect(page.getByText(/not found|Deck not found/i)).toBeVisible({ timeout: 10000 });
  });

  test("navigation back to course", async ({ page }) => {
    await page.goto(`/courses/${courseId}/decks/${deckId}`);
    await waitForDB(page);
    await page.getByRole("link", { name: /Biology/i }).click();
    await expect(page).toHaveURL(new RegExp(`/courses/${courseId}$`));
  });
});
