import { test, expect } from "@playwright/test";
import { gotoAndClear, seedCourse, waitForDB } from "./helpers";

test.describe("Course Workspace", () => {
  let courseId: string;

  test.beforeEach(async ({ page }) => {
    await gotoAndClear(page, "/dashboard");
    courseId = await seedCourse(page, "Biology 101");
  });

  test("loads course workspace", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await expect(page.getByText("Biology 101")).toBeVisible({ timeout: 10000 });
  });

  test("shows empty states for topics, decks, sources", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await expect(page.getByText("No topics yet")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No decks yet")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No sources yet")).toBeVisible({ timeout: 10000 });
  });

  test("create topic", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add topic" }).click();
    await page.getByLabel(/title/i).fill("Cell Biology");
    await page.getByRole("button", { name: "Create topic" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Cell Biology")).toBeVisible({ timeout: 5000 });
  });

  test("edit topic", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add topic" }).click();
    await page.getByLabel(/title/i).fill("Genetics");
    await page.getByRole("button", { name: "Create topic" }).last().click();
    await expect(page.getByText("Genetics")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Edit Genetics/i }).click();
    await page.getByLabel(/title/i).fill("Molecular Genetics");
    await page.getByRole("button", { name: "Save changes" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Molecular Genetics")).toBeVisible({ timeout: 5000 });
  });

  test("delete topic with confirmation", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add topic" }).click();
    await page.getByLabel(/title/i).fill("To Delete");
    await page.getByRole("button", { name: "Create topic" }).last().click();
    await expect(page.getByText("To Delete")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Delete To Delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("To Delete")).not.toBeVisible({ timeout: 5000 });
  });

  test("create course-level deck", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add deck" }).click();
    await page.getByLabel(/title/i).fill("Bio Review");
    await page.getByRole("button", { name: "Create deck" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bio Review")).toBeVisible({ timeout: 5000 });
  });

  test("create deck with topic association", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add topic" }).click();
    await page.getByLabel(/title/i).fill("Ecology");
    await page.getByRole("button", { name: "Create topic" }).last().click();
    await expect(page.getByText("Ecology")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Add deck" }).click();
    await page.getByLabel(/title/i).fill("Ecology Deck");
    await page.getByLabel(/topic/i).selectOption({ label: "Ecology" });
    await page.getByRole("button", { name: "Create deck" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Ecology Deck")).toBeVisible({ timeout: 5000 });
  });

  test("delete deck", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add deck" }).click();
    await page.getByLabel(/title/i).fill("Temp Deck");
    await page.getByRole("button", { name: "Create deck" }).last().click();
    await expect(page.getByText("Temp Deck")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Delete Temp Deck/i }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("Temp Deck")).not.toBeVisible({ timeout: 5000 });
  });

  test("create source", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add source" }).click();
    await page.getByLabel(/title/i).fill("Lecture Notes");
    await page.getByLabel("Format").selectOption("text");
    await page.getByRole("textbox", { name: "Content" }).fill("Photosynthesis is the process by which plants convert light energy into chemical energy.");
    await page.getByRole("button", { name: "Add source" }).last().click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Lecture Notes")).toBeVisible({ timeout: 5000 });
  });

  test("delete source", async ({ page }) => {
    await page.goto(`/courses/${courseId}`);
    await waitForDB(page);
    await page.getByRole("button", { name: "Add source" }).click();
    await page.getByLabel(/title/i).fill("Temp Source");
    await page.getByLabel("Format").selectOption("text");
    await page.getByRole("textbox", { name: "Content" }).fill("Some content.");
    await page.getByRole("button", { name: "Add source" }).last().click();
    await expect(page.getByText("Temp Source")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Delete Temp Source/i }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("Temp Source")).not.toBeVisible({ timeout: 5000 });
  });

  test("invalid course ID shows not found", async ({ page }) => {
    await page.goto("/courses/nonexistent-id");
    await waitForDB(page);
    await expect(page.getByText(/not found|Course not found/i)).toBeVisible({ timeout: 10000 });
  });
});
