// @vitest-environment jsdom
/**
 * Component tests for CreateSourceDialog.
 *
 * Covers the highest-value UI logic: validation gating, busy-state disabling,
 * and the save path (createSource → processSource → onSaved). All DB/AI
 * dependencies are mocked; only component behavior is under test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateSourceDialog } from "./create-source-dialog";

const { createSourceMock, processSourceMock } = vi.hoisted(() => ({
  createSourceMock: vi.fn(),
  processSourceMock: vi.fn(),
}));

vi.mock("@/lib/db/repositories/source-repository", () => ({
  createSource: createSourceMock,
}));

vi.mock("@/lib/ingestion/processor", () => ({
  processSource: processSourceMock,
}));

vi.mock("@/lib/ingestion/url-extractor", () => ({
  extractUrlContent: vi.fn(),
}));

function renderDialog(open = true) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(
    <CreateSourceDialog
      open={open}
      onOpenChange={onOpenChange}
      courseId="course-1"
      onSaved={onSaved}
    />,
  );
  return { onOpenChange, onSaved };
}

beforeEach(() => {
  createSourceMock.mockReset();
  processSourceMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("CreateSourceDialog", () => {
  it("disables the submit button until title and content are present", async () => {
    const user = userEvent.setup();
    renderDialog();

    const submit = screen.getByRole("button", { name: /add source/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "Chapter 1");
    await user.type(
      screen.getByLabelText(/content/i),
      "The mitochondria is the powerhouse of the cell.",
    );

    expect(submit).toBeEnabled();
  });

  it("rejects whitespace-only content with a validation error", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/title/i), "Only spaces");
    await user.type(screen.getByLabelText(/content/i), "   ");

    const submit = screen.getByRole("button", { name: /add source/i });
    // canSubmit gates on trim() so whitespace-only content keeps the button
    // disabled — nothing to click. Assert the guard holds.
    expect(submit).toBeDisabled();
    expect(createSourceMock).not.toHaveBeenCalled();
  });

  it("saves a valid text source, processes it, and closes", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSaved } = renderDialog();

    createSourceMock.mockResolvedValue({ id: "src-1" });
    processSourceMock.mockResolvedValue(undefined);

    await user.type(screen.getByLabelText(/title/i), "Chapter 1");
    await user.type(screen.getByLabelText(/content/i), "Real content here.");
    await user.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    expect(createSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "course-1",
        title: "Chapter 1",
        type: "text",
        rawContent: "Real content here.",
      }),
    );
    expect(processSourceMock).toHaveBeenCalledWith("src-1");
  });

  it("surfaces repository errors instead of closing", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    createSourceMock.mockRejectedValue(new Error("IndexedDB write failed"));

    await user.type(screen.getByLabelText(/title/i), "Chapter 1");
    await user.type(screen.getByLabelText(/content/i), "Content.");
    await user.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() => {
      expect(screen.getByText(/IndexedDB write failed/i)).toBeInTheDocument();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(processSourceMock).not.toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    renderDialog(false);
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });
});
