import { test, expect } from "@playwright/test";
import { gotoAndClear, waitForDB } from "./helpers";

test.describe("Settings", () => {
  test("loads and shows API key section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("AI Provider")).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Gemini API Key")).toBeVisible();
  });

  test("saves and shows API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("Gemini API Key").fill("test-api-key-12345");
    await page.getByRole("button", { name: /Save/i }).click();
    await expect(page.getByText("API key saved")).toBeVisible({ timeout: 3000 });
  });

  test("clear API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("Gemini API Key").fill("test-key");
    await page.getByRole("button", { name: /Save/i }).click();
    await expect(page.getByText("API key saved")).toBeVisible({ timeout: 3000 });

    // Wait for the clear button to appear (it only shows when a key is saved)
    const clearBtn = page.getByRole("button", { name: /Clear API key/i });
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await clearBtn.click();
    await expect(page.getByText("API key cleared")).toBeVisible({ timeout: 3000 });
    await expect(page.getByLabel("Gemini API Key")).toHaveValue("");
  });

  test("toggle show/hide API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("Gemini API Key").fill("secret-key");
    await expect(page.getByLabel("Gemini API Key")).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: /Show API key/i }).click();
    await expect(page.getByLabel("Gemini API Key")).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: /Hide API key/i }).click();
    await expect(page.getByLabel("Gemini API Key")).toHaveAttribute("type", "password");
  });

  test("API key persists across page reload", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await page.getByLabel("Gemini API Key").fill("persist-test-key");
    await page.getByRole("button", { name: /Save/i }).click();
    await expect(page.getByText("API key saved")).toBeVisible({ timeout: 3000 });

    await page.reload();
    await waitForDB(page);
    await expect(page.getByLabel("Gemini API Key")).toHaveValue("persist-test-key");
  });

  test("shows Google AI Studio link", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Google AI Studio")).toBeVisible();
  });

  test("shows data and privacy section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Privacy")).toBeVisible();
    await expect(page.getByText("IndexedDB").first()).toBeVisible();
  });
});
