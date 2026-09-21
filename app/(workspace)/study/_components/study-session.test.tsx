// @vitest-environment jsdom
/**
 * Component tests for StudySession.
 *
 * Covers the three render states the study flow depends on: loading, error
 * (with retry), and the deck-with-no-cards empty state, plus a ready session
 * rendering the card and rating controls. Repository layer is mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StudySession } from "./study-session";

const { getDeckMock, getCourseMock, listAllMock, listDueMock, recordReviewMock } =
  vi.hoisted(() => ({
    getDeckMock: vi.fn(),
    getCourseMock: vi.fn(),
    listAllMock: vi.fn(),
    listDueMock: vi.fn(),
    recordReviewMock: vi.fn(),
  }));

vi.mock("@/lib/db/repositories/course-repository", () => ({
  getCourse: getCourseMock,
}));

vi.mock("@/lib/db/repositories/deck-repository", () => ({
  getDeck: getDeckMock,
}));

vi.mock("@/lib/db/repositories/flashcard-repository", () => ({
  listFlashcardsByDeck: listAllMock,
}));

vi.mock("@/lib/db/repositories/review-repository", () => ({
  listDueFlashcardsByDeck: listDueMock,
  recordReview: recordReviewMock,
}));

const DECK = { id: "deck-1", courseId: "course-1", name: "Biology 101" };
const COURSE = { id: "course-1", name: "Biology" };
const CARD = {
  id: "card-1",
  deckId: "deck-1",
  prompt: "What is osmosis?",
  answer: "Diffusion of water across a membrane.",
};

beforeEach(() => {
  // framer-motion wiring (lib/motion.ts) reads prefers-reduced-motion; jsdom
  // does not implement matchMedia.
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  getDeckMock.mockReset();
  getCourseMock.mockReset();
  listAllMock.mockReset();
  listDueMock.mockReset();
  recordReviewMock.mockReset().mockResolvedValue(undefined);

  getDeckMock.mockResolvedValue(DECK);
  getCourseMock.mockResolvedValue(COURSE);
  listAllMock.mockResolvedValue([]);
  listDueMock.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("StudySession", () => {
  it("shows the empty state when the deck has no cards", async () => {
    render(<StudySession deckId="deck-1" />);

    await waitFor(() => {
      expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/at least one card/i)).toBeInTheDocument();
  });

  it("shows the error state with retry when loading fails", async () => {
    getDeckMock.mockRejectedValue(new Error("db unavailable"));

    render(<StudySession deckId="deck-1" />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load this session/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/db unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders a ready session with the card, reveal, and rating controls", async () => {
    listAllMock.mockResolvedValue([CARD]);
    listDueMock.mockResolvedValue([CARD]);

    render(<StudySession deckId="deck-1" />);

    await waitFor(() => {
      expect(screen.getByText(/what is osmosis\?/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
    // Rating buttons appear after reveal; before it they are not present.
    expect(screen.queryByRole("button", { name: /^good$/i })).not.toBeInTheDocument();
  });

  it("reveals the answer on click and exposes the four ratings", async () => {
    const user = userEvent.setup();
    listAllMock.mockResolvedValue([CARD]);
    listDueMock.mockResolvedValue([CARD]);

    render(<StudySession deckId="deck-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /show answer/i }));

    await waitFor(() => {
      expect(screen.getByText(/diffusion of water across a membrane/i)).toBeInTheDocument();
    });
    for (const label of [/again/i, /hard/i, /good/i, /easy/i]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("records a review when a rating is chosen", async () => {
    const user = userEvent.setup();
    listAllMock.mockResolvedValue([CARD]);
    listDueMock.mockResolvedValue([CARD]);
    recordReviewMock.mockResolvedValue(undefined);

    render(<StudySession deckId="deck-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /show answer/i }));
    // The Good button's accessible name includes its hint text
    // ("Good Remembered"); match the leading label within the name.
    const goodButton = await screen.findAllByRole("button");
    const target = goodButton.find((b) => /^good/i.test(b.textContent ?? ""));
    expect(target).toBeDefined();
    await user.click(target!);

    await waitFor(() => {
      expect(recordReviewMock).toHaveBeenCalled();
    });
  });
});
