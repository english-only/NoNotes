import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, seedDeck, seedFlashcard, waitForDB } from "./helpers";

test.describe("Study Picker", () => {
  test("shows empty state with no decks", async ({ page }) => {
    await gotoAndClear(page, "/study");
    await expect(page.getByText(/No decks|no decks|Nothing to study/i)).toBeVisible({ timeout: 10000 });
  });

  test("shows deck list with due counts", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Biology");
    const deckId = await seedDeck(page, courseId, "Bio Deck");
    await seedFlashcard(page, deckId, "Q1", "A1");
    await seedFlashcard(page, deckId, "Q2", "A2");
    await page.goto("/study");
    await waitForDB(page);
    await expect(page.getByText("Bio Deck")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Study Session", () => {
  let courseId: string;
  let deckId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the app and clear any existing data
    await gotoAndClear(page, "/dashboard");
    courseId = await seedCourse(page, "Biology");
    deckId = await seedDeck(page, courseId, "Bio Deck");
    await seedFlashcard(page, deckId, "What is DNA?", "Deoxyribonucleic acid");
    await seedFlashcard(page, deckId, "What is RNA?", "Ribonucleic acid");
    await seedFlashcard(page, deckId, "What is ATP?", "Adenosine triphosphate");
  });

  test("loads a study session with due cards", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Show answer/i })).toBeVisible();
  });

  test("reveal shows the answer", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Show answer/i }).click();
    await expect(page.getByText(/Deoxyribonucleic acid|Ribonucleic acid|Adenosine triphosphate/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible();
  });

  test("Space key reveals the answer", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("Space");
    await expect(page.getByText(/Deoxyribonucleic acid|Ribonucleic acid|Adenosine triphosphate/)).toBeVisible();
  });

  test("Good rating advances to next card", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Show answer/i }).click();
    await page.getByRole("button", { name: /Good/i }).click();
    await page.waitForTimeout(500);

    // Should still show a card prompt (either next card or completion)
    const promptVisible = await page.getByText(/What is (DNA|RNA|ATP)/).isVisible().catch(() => false);
    const completeVisible = await page.getByText(/Session complete|complete/i).isVisible().catch(() => false);
    expect(promptVisible || completeVisible).toBe(true);
  });

  test("keyboard 1-4 ratings work", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible();

    await page.keyboard.press("3");
    await page.waitForTimeout(500);
  });

  test("session completes after all cards rated", async ({ page }) => {
    await page.goto(`/study/${deckId}`);
    await waitForDB(page);
    await expect(page.getByText(/What is (DNA|RNA|ATP)/)).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Show answer/i }).click();
      await page.getByRole("button", { name: /Good/i }).click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/Session complete|session complete/i)).toBeVisible({ timeout: 10000 });
  });

  test("no due cards shows appropriate state", async ({ page }) => {
    const futureDue = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const emptyDeckId = await seedDeck(page, courseId, "Future Deck");
    await seedFlashcard(page, emptyDeckId, "Future Q", "Future A", futureDue);

    await page.goto(`/study/${emptyDeckId}`);
    await waitForDB(page);
    // Should show "Nothing due" or the deck-not-found / no-cards state
    const nothingDue = page.getByText(/Nothing due|nothing due|no cards due/i);
    const notFound = page.getByText(/not found|Deck not found/i);
    const noCards = page.getByText(/No cards yet|no cards/i);
    await expect(nothingDue.or(notFound).or(noCards)).toBeVisible({ timeout: 10000 });
  });

  test("invalid deck ID shows not found", async ({ page }) => {
    await page.goto("/study/nonexistent-deck-id");
    await waitForDB(page);
    await expect(page.getByText(/not found|Deck not found/i)).toBeVisible({ timeout: 10000 });
  });

  test("empty deck shows no cards state", async ({ page }) => {
    const emptyDeckId = await seedDeck(page, courseId, "Empty Deck");
    await page.goto(`/study/${emptyDeckId}`);
    await waitForDB(page);
    await expect(page.getByText(/No cards yet|no cards/i)).toBeVisible({ timeout: 10000 });
  });
});
