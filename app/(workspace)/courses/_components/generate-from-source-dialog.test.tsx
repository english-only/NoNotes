// @vitest-environment jsdom
/**
 * Component tests for GenerateFromSourceDialog.
 *
 * Focus: the select-step empty state, the unconfigured-provider error path,
 * and successful generation reaching the review step. AI + DB are mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GenerateFromSourceDialog } from "./generate-from-source-dialog";

const { listSourcesMock, listChunksMock, generateFromSourceMock, persistMock, configuredMock } =
  vi.hoisted(() => ({
    listSourcesMock: vi.fn(),
    listChunksMock: vi.fn(),
    generateFromSourceMock: vi.fn(),
    persistMock: vi.fn(),
    configuredMock: vi.fn(),
  }));

vi.mock("@/lib/db/repositories/source-repository", () => ({
  listSourcesByCourse: listSourcesMock,
}));

vi.mock("@/lib/db/repositories/chunk-repository", () => ({
  listChunksBySource: listChunksMock,
}));

vi.mock("@/lib/ai/generation", () => ({
  generateFromSource: generateFromSourceMock,
  persistAcceptedCards: persistMock,
}));

vi.mock("@/lib/ai/config", () => ({
  isProviderConfigured: configuredMock,
  getActiveProviderLabel: () => "Gemini",
}));

function renderDialog(open = true) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(
    <GenerateFromSourceDialog
      open={open}
      onOpenChange={onOpenChange}
      courseId="course-1"
      deckId="deck-1"
      onSaved={onSaved}
    />,
  );
  return { onOpenChange, onSaved };
}

beforeEach(() => {
  listSourcesMock.mockReset().mockResolvedValue([]);
  listChunksMock.mockReset().mockResolvedValue([]);
  generateFromSourceMock.mockReset();
  persistMock.mockReset().mockResolvedValue(undefined);
  configuredMock.mockReset().mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

describe("GenerateFromSourceDialog", () => {
  it("shows the empty state when the course has no sources", async () => {
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText(/no sources available/i),
      ).toBeInTheDocument();
    });
  });

  it("blocks generation with a settings pointer when no provider is configured", async () => {
    const user = userEvent.setup();
    listSourcesMock.mockResolvedValue([
      { id: "src-1", title: "Lecture notes", type: "text" },
    ]);
    configuredMock.mockReturnValue(false);

    renderDialog();

    const select = await screen.findByLabelText(/source material/i);
    await user.selectOptions(select, "src-1");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no gemini connection configured/i),
      ).toBeInTheDocument();
    });
    expect(generateFromSourceMock).not.toHaveBeenCalled();
  });

  it("runs generation and reaches the review step with produced cards", async () => {
    const user = userEvent.setup();
    listSourcesMock.mockResolvedValue([
      { id: "src-1", title: "Lecture notes", type: "text" },
    ]);
    listChunksMock.mockResolvedValue([
      { id: "c-1", content: "chunk one" },
      { id: "c-2", content: "chunk two" },
    ]);
    generateFromSourceMock.mockResolvedValue({
      flashcards: [
        { prompt: "What is X?", answer: "X is…", sourceChunkIds: ["c-1"] },
        { prompt: "What is Y?", answer: "Y is…", sourceChunkIds: ["c-2"] },
      ],
      truncated: false,
    });

    renderDialog();

    const select = await screen.findByLabelText(/source material/i);
    await user.selectOptions(select, "src-1");
    await waitFor(() => {
      expect(screen.getByText(/2 chunks/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      // Cards render as text in review mode (inputs appear only when editing)
      expect(screen.getByText("What is X?")).toBeInTheDocument();
      expect(screen.getByText("What is Y?")).toBeInTheDocument();
    });
    expect(generateFromSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: "src-1", deckId: "deck-1" }),
    );
  });

  it("reports a generation failure instead of entering review", async () => {
    const user = userEvent.setup();
    listSourcesMock.mockResolvedValue([
      { id: "src-1", title: "Lecture notes", type: "text" },
    ]);
    generateFromSourceMock.mockRejectedValue(new Error("provider offline"));

    renderDialog();

    const select = await screen.findByLabelText(/source material/i);
    await user.selectOptions(select, "src-1");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/provider offline/i)).toBeInTheDocument();
    });
  });

  it("renders nothing when closed", () => {
    renderDialog(false);
    expect(screen.queryByLabelText(/source material/i)).not.toBeInTheDocument();
  });
});
