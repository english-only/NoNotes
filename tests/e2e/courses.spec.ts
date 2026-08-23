import { test, expect } from "@playwright/test";
import { gotoAndClear } from "./helpers";

test.describe("Courses", () => {
  test("shows empty state", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await expect(page.getByText("No courses yet")).toBeVisible({ timeout: 10000 });
  });

  test("create course via dialog", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("Biology 101");
    await page.getByLabel(/description/i).fill("Introduction to biology");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Biology 101")).toBeVisible({ timeout: 5000 });
  });

  test("dialog opens and closes", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  test("cancel dialog does not create course", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("Should Not Exist");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(page.getByText("Should Not Exist")).not.toBeVisible();
  });

  test("delete course with confirmation", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("To Delete");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("To Delete")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Delete To Delete" }).click();
    // The confirm button says "Delete" in the inline confirmation
    await page.getByRole("button", { name: /^Delete$/i }).click();
    await expect(page.getByText("To Delete")).not.toBeVisible({ timeout: 5000 });
  });

  test("cancel delete keeps course", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("Keep Me");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Keep Me")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Delete/i }).first().click();
    await page.getByRole("button", { name: /Cancel/i }).last().click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Keep Me")).toBeVisible();
  });

  test("multiple courses are isolated", async ({ page }) => {
    await gotoAndClear(page, "/courses");

    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("Course A");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Course A")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Create course" }).first().click();
    await page.getByLabel(/title/i).fill("Course B");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Course B")).toBeVisible({ timeout: 5000 });

    await page.locator("div").filter({ hasText: /^Course A$/ }).first().getByRole("button", { name: /Delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("Course A")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Course B")).toBeVisible();
  });

  test("clicking course navigates to detail", async ({ page }) => {
    await gotoAndClear(page, "/courses");
    await page.getByRole("button", { name: "Create your first course" }).click();
    await page.getByLabel(/title/i).fill("Navigate Me");
    await page.getByRole("button", { name: "Create course" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Navigate Me")).toBeVisible({ timeout: 5000 });

    await page.getByText("Navigate Me").first().click();
    await expect(page).toHaveURL(/courses\/[a-f0-9-]+/);
  });
});
