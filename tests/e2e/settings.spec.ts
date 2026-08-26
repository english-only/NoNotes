import { test, expect } from "@playwright/test";
import { gotoAndClear, waitForDB } from "./helpers";

test.describe("Settings", () => {
  test("loads and shows AI provider section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByRole("heading", { name: "AI Provider" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("radio", { name: /Gemini/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /OpenAI-compatible/i })).toBeVisible();
  });

  test("adds and shows a Gemini API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("New Gemini API key").fill("test-api-key-12345");
    await page.getByRole("button", { name: /Add/i }).click();
    await expect(page.getByText("Provider configuration saved")).toBeVisible({ timeout: 3000 });

    // Key now exists, masked (only last 4 chars revealed).
    const keyInput = page.getByLabel("Gemini API key", { exact: true });
    await expect(keyInput).toBeVisible();
    await expect(keyInput).toHaveValue("••••2345");
    await expect(page.getByText("API keys (1)")).toBeVisible();
  });

  test("shows and hides a Gemini API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("New Gemini API key").fill("secret-key-9876");
    await page.getByRole("button", { name: /Add/i }).click();
    const keyInput = page.getByLabel("Gemini API key", { exact: true });
    await expect(keyInput).toHaveValue("••••9876");

    await page.getByRole("button", { name: /Show Gemini API key/i }).click();
    await expect(keyInput).toHaveValue("secret-key-9876");
    await expect(keyInput).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: /Hide Gemini API key/i }).click();
    await expect(keyInput).toHaveValue("••••9876");
  });

  test("removes a Gemini API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("New Gemini API key").fill("remove-me-key");
    await page.getByRole("button", { name: /Add/i }).click();
    await expect(page.getByLabel("Gemini API key", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Remove Gemini API key/i }).click();
    await expect(page.getByLabel("Gemini API key", { exact: true })).not.toBeVisible();
    await expect(page.getByText("API keys (0)")).toBeVisible();
  });

  test("Gemini API key persists across page reload", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("New Gemini API key").fill("persist-test-key");
    await page.getByRole("button", { name: /Add/i }).click();
    await expect(page.getByLabel("Gemini API key", { exact: true })).toBeVisible();

    await page.reload();
    await waitForDB(page);
    const keyInput = page.getByLabel("Gemini API key", { exact: true });
    await expect(keyInput).toBeVisible();
    await expect(keyInput).toHaveValue("••••-key");
  });

  test("shows Google AI Studio link when no keys configured", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByRole("link", { name: "Google AI Studio" })).toBeVisible();
  });

  test("shows data and privacy section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Privacy")).toBeVisible();
    await expect(page.getByText("IndexedDB").first()).toBeVisible();
  });
});
