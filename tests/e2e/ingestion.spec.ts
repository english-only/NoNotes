import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, waitForDB } from "./helpers";

test.describe("Ingestion", () => {
  test("Add Source dialog supports text ingestion", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Text Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    // Open Add Source dialog
    await page.getByRole("button", { name: /Add source/i }).first().click();
    await expect(page.getByText("Add source material")).toBeVisible();

    // Fill in text source
    await page.getByLabel("Title").fill("My Notes");
    await page.getByLabel("Format").selectOption("text");
    await page.getByLabel("Content").fill("This is test content for ingestion.");

    // Submit
    await page.getByRole("button", { name: /Add source/i }).last().click();

    // Source should appear in the list
    await expect(page.getByText("My Notes")).toBeVisible({ timeout: 5000 });
  });

  test("Add Source dialog supports markdown ingestion", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "MD Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Title").fill("Markdown Notes");
    await page.getByLabel("Format").selectOption("markdown");
    await page.getByLabel("Content").fill("# Heading\n\nSome **bold** text.");

    await page.getByRole("button", { name: /Add source/i }).last().click();
    await expect(page.getByText("Markdown Notes")).toBeVisible({ timeout: 5000 });
  });

  test("Add Source dialog shows PDF upload option", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "PDF Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Format").selectOption("pdf");

    // Should show file upload input with size limit info
    await expect(page.getByText("Maximum file size")).toBeVisible({ timeout: 5000 });
  });

  test("Add Source dialog shows URL input option", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "URL Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Format").selectOption("url");

    // Should show URL input
    await expect(page.getByLabel("URL")).toBeVisible();
    await expect(page.getByText("Enter a URL")).toBeVisible();
  });

  test("source can be deleted", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Delete Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    // Create a source
    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Title").fill("Deletable Source");
    await page.getByLabel("Content").fill("Content to be deleted.");
    await page.getByRole("button", { name: /Add source/i }).last().click();
    await expect(page.getByText("Deletable Source")).toBeVisible({ timeout: 5000 });

    // Delete it
    await page.getByRole("button", { name: /Delete.*Deletable Source/i }).click();
    await page.getByRole("button", { name: /Delete/i }).last().click();
    await expect(page.getByText("Deletable Source")).not.toBeVisible({ timeout: 5000 });
  });

  test("URL ingestion handles invalid URL gracefully", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "URL Error Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Title").fill("Bad URL");
    await page.getByLabel("Format").selectOption("url");
    await page.getByLabel("URL").fill("https://this-domain-does-not-exist-12345.com");

    await page.getByRole("button", { name: /Add source/i }).last().click();

    // Should show an error, not crash
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  });

  test("source persists after reload", async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Persist Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await page.getByLabel("Title").fill("Persistent Source");
    await page.getByLabel("Content").fill("This should persist.");
    await page.getByRole("button", { name: /Add source/i }).last().click();
    await expect(page.getByText("Persistent Source")).toBeVisible({ timeout: 5000 });

    // Reload and verify
    await page.reload();
    await waitForDB(page);
    await expect(page.getByText("Persistent Source")).toBeVisible({ timeout: 5000 });
  });

  test("mobile layout works for source creation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndClear(page, "/dashboard");
    const courseId = await seedCourse(page, "Mobile Source Test");
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);

    await page.getByRole("button", { name: /Add source/i }).first().click();
    await expect(page.getByText("Add source material")).toBeVisible();

    await page.getByLabel("Title").fill("Mobile Source");
    await page.getByLabel("Content").fill("Mobile content.");
    await page.getByRole("button", { name: /Add source/i }).last().click();
    await expect(page.getByText("Mobile Source")).toBeVisible({ timeout: 5000 });
  });
});
