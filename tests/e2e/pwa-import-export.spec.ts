import { test, expect, type Page } from "@playwright/test";
import {
  gotoAndClear,
  seedCourse,
  seedDeck,
  seedFlashcard,
  waitForDB,
  countRecords,
  clearDatabase,
} from "./helpers";

// ── Helpers ──────────────────────────────────────────────────────────

async function seedFullDataset(page: Page) {
  const courseId = await seedCourse(page, "Biology", "Study of life");
  const deckId = await seedDeck(page, courseId, "Cell Structure");
  await seedFlashcard(page, deckId, "What is a mitochondria?", "The powerhouse of the cell");
  await seedFlashcard(page, deckId, "What is a ribosome?", "Makes proteins");
  return { courseId, deckId };
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe("PWA", () => {
  test("manifest is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const manifest = await response?.json();
    expect(manifest.name).toBe("NoNotes");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("manifest link in page", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDB(page);
    const link = page.locator('link[rel="manifest"]');
    await expect(link).toHaveAttribute("href", "/manifest.json");
  });

  test("favicon is accessible", async ({ page }) => {
    const response = await page.goto("/favicon.svg");
    expect(response?.status()).toBe(200);
  });

  test("service worker file is accessible", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
  });

  test("viewport meta has theme color", async ({ page }) => {
    await page.goto("/dashboard");
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveAttribute("content", "#0d101b");
  });
});

test.describe("Settings — Export", () => {
  test("settings page loads with export section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Export Data")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /export all data/i }),
    ).toBeVisible();
  });

  test("export button triggers download", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // Seed some data first
    await seedFullDataset(page);

    // Start download listener
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/nonotes-export-.*\.json/);

    // Verify downloaded content
    const path = await download.path();
    if (path) {
      const fs = await import("fs");
      const content = JSON.parse(fs.readFileSync(path, "utf-8"));
      expect(content.schemaVersion).toBe(1);
      expect(content.appVersion).toBe("0.1.0");
      expect(content.exportedAt).toBeTruthy();
      expect(content.courses).toBeDefined();
      expect(content.flashcards).toBeDefined();
      // API key must NOT be in export
      expect(content).not.toHaveProperty("apiKey");
    }
  });

  test("export contains actual data", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await seedFullDataset(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;

    const path = await download.path();
    if (path) {
      const fs = await import("fs");
      const content = JSON.parse(fs.readFileSync(path, "utf-8"));
      expect(content.courses.length).toBeGreaterThanOrEqual(1);
      expect(content.decks.length).toBeGreaterThanOrEqual(1);
      expect(content.flashcards.length).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("Settings — Import", () => {
  test("settings page shows import section", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Import Data")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /choose json file/i }),
    ).toBeVisible();
  });

  test("import preview shows entity counts", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // First export to get valid JSON
    await seedFullDataset(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(downloadPath).toBeTruthy();
    if (!downloadPath) return;

    // Now import it back
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /choose json file/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    // Preview should appear
    await expect(page.getByText("Import Preview")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("course(s)")).toBeVisible();
    await expect(page.getByText("deck(s)")).toBeVisible();
    await expect(page.getByText("flashcard(s)")).toBeVisible();
  });

  test("import mode selector is visible", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // Export first
    await seedFullDataset(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    if (!downloadPath) return;

    // Import
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /choose json file/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await expect(page.getByText("Import Preview")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Merge (add new, skip existing)")).toBeVisible();
    await expect(page.getByText("Replace (clear all, then import)")).toBeVisible();
  });

  test("import cancel clears preview", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    await seedFullDataset(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    if (!downloadPath) return;

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /choose json file/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await expect(page.getByText("Import Preview")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Import Preview")).not.toBeVisible();
  });

  test("import replace mode works end-to-end", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // Create initial data
    await seedFullDataset(page);

    // Export
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export all data/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    if (!downloadPath) return;

    // Clear database
    await clearDatabase(page);

    // Import back (replace mode is default for empty DB)
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /choose json file/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await expect(page.getByText("Import Preview")).toBeVisible({ timeout: 10000 });

    // Confirm import
    await page.getByRole("button", { name: /confirm import/i }).click();

    // Should show success and reload
    await page.waitForURL(/\/settings/, { timeout: 10000 });
    await waitForDB(page);
  });
});

test.describe("Settings — Storage", () => {
  test("storage info displays record counts", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByRole("heading", { name: "Storage" })).toBeVisible();

    // With empty DB, should show 0 records
    await expect(page.getByText("Total: 0 records")).toBeVisible();
  });

  test("storage info updates after seeding data", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // Seed data via page context
    await seedFullDataset(page);

    // Navigate to settings to get fresh storage info
    await page.goto("/settings");
    await waitForDB(page);

    // Should show non-zero records
    await expect(page.getByText(/Total: [1-9]/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Settings — Danger Zone", () => {
  test("danger zone is visible", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("Danger Zone")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /delete all data/i }),
    ).toBeVisible();
  });

  test("delete requires confirmation", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await seedFullDataset(page);

    // First click shows confirm
    await page.getByRole("button", { name: /delete all data/i }).click();
    await expect(
      page.getByRole("button", { name: /confirm delete all data/i }),
    ).toBeVisible();

    // Cancel goes back
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("button", { name: /delete all data/i }).first(),
    ).toBeVisible();
  });

  test("delete all data clears the database", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await seedFullDataset(page);

    // Confirm and delete
    await page.getByRole("button", { name: /delete all data/i }).click();
    await page.getByRole("button", { name: /confirm delete all data/i }).click();

    // Should reload — wait for navigation to finish
    await page.waitForURL(/\/settings/, { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");
    await waitForDB(page);
    await page.waitForTimeout(500);

    // Storage should be empty
    const courses = await countRecords(page, "courses");
    expect(courses).toBe(0);
  });
});

test.describe("Settings — API Key", () => {
  test("API key section loads", async ({ page }) => {
    await gotoAndClear(page, "/settings");
    await expect(page.getByText("AI Provider")).toBeVisible();
    await expect(page.getByLabel(/gemini api key/i)).toBeVisible();
  });

  test("save and clear API key", async ({ page }) => {
    await gotoAndClear(page, "/settings");

    // Enter a key
    await page.getByLabel(/gemini api key/i).fill("test-key-12345");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("API key saved.")).toBeVisible();

    // Clear it
    await page.getByRole("button", { name: /clear api key/i }).click();
    await expect(page.getByText("API key cleared.")).toBeVisible();
  });
});

test.describe("Settings — Responsive", () => {
  test("settings page works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndClear(page, "/settings");

    await expect(page.getByText("Workspace controls")).toBeVisible();
    await expect(page.getByText("Export Data")).toBeVisible();
    await expect(page.getByText("Import Data")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Storage" })).toBeVisible();
    await expect(page.getByText("Danger Zone")).toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(390);
  });
});

test.describe("Settings — Console", () => {
  test("no console errors on settings page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await gotoAndClear(page, "/settings");
    await page.waitForTimeout(2000);

    // Filter out expected noise (e.g., favicon 404s)
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
