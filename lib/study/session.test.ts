import { describe, expect, it } from "vitest";

import {
  rate,
  reveal,
  startSession,
  type Rating,
} from "./session";

const ids = ["card-1", "card-2", "card-3"];

describe("study session state machine", () => {
  describe("reviewedIds", () => {
    it("starts empty", () => {
      const session = startSession(ids);
      expect(session.reviewedIds.size).toBe(0);
    });

    it("tracks unique cards across ratings, including Again re-queues", () => {
      let session = startSession(ids);
      // card-1 rated Again → requeued at end → queue is [card-2, card-3, card-1]
      session = rate(reveal(session), 1);
      expect(session.reviewedIds).toEqual(new Set(["card-1"]));
      // card-2 rated Good → queue is [card-3, card-1]
      session = rate(reveal(session), 3);
      expect(session.reviewedIds).toEqual(new Set(["card-1", "card-2"]));
      // card-3 rated Good → queue is [card-1] — card-3 now tracked
      session = rate(reveal(session), 3);
      expect(session.reviewedIds).toEqual(new Set(["card-1", "card-2", "card-3"]));
      expect(session.reviewedIds.size).toBe(3);
      // card-1 re-rated Good (second time) — still 3 unique cards
      session = rate(reveal(session), 3);
      expect(session.reviewedIds.size).toBe(3);
    });

    it("reaches all cards reviewed when every card has been rated at least once", () => {
      let session = startSession(ids);
      session = rate(reveal(session), 1); // card-1 Again
      session = rate(reveal(session), 3); // card-2 Good
      session = rate(reveal(session), 4); // card-3 Easy
      // card-1 re-queued; rate it too
      session = rate(reveal(session), 3);
      expect(session.reviewedIds.size).toBe(3);
      expect(session.phase).toBe("complete");
    });

    it("is empty on a no-card session", () => {
      const session = startSession([]);
      expect(session.reviewedIds.size).toBe(0);
    });
  });
  describe("startSession", () => {
    it("starts idle on the first card with the queue in given order", () => {
      const session = startSession(ids);

      expect(session.phase).toBe("idle");
      expect(session.currentId).toBe("card-1");
      expect(session.queue).toEqual(ids);
      expect(session.reviewed).toBe(0);
    });

    it("starts complete when there are no cards", () => {
      const session = startSession([]);

      expect(session.phase).toBe("complete");
      expect(session.currentId).toBeNull();
      expect(session.queue).toEqual([]);
      expect(session.reviewed).toBe(0);
    });
  });

  describe("reveal", () => {
    it("moves from idle to revealed without changing the queue", () => {
      const next = reveal(startSession(ids));

      expect(next.phase).toBe("revealed");
      expect(next.currentId).toBe("card-1");
      expect(next.queue).toEqual(ids);
      expect(next.reviewed).toBe(0);
    });

    it("is a no-op when already revealed", () => {
      const revealed = reveal(startSession(ids));
      const next = reveal(revealed);

      expect(next).toEqual(revealed);
    });

    it("is a no-op when the session is complete", () => {
      const complete = rate(reveal(startSession([ids[0]])), 3);
      const next = reveal(complete);

      expect(next).toEqual(complete);
    });
  });

  describe("rate", () => {
    it("advances to the next card and counts the review", () => {
      const session = rate(reveal(startSession(ids)), 3);

      expect(session.phase).toBe("idle");
      expect(session.currentId).toBe("card-2");
      expect(session.reviewed).toBe(1);
      expect(session.queue).toEqual(["card-2", "card-3"]);
    });

    it("is identical for hard and easy ratings", () => {
      const hard = rate(reveal(startSession(ids)), 2);
      const easy = rate(reveal(startSession(ids)), 4);

      expect(hard.queue).toEqual(easy.queue);
      expect(hard.reviewed).toBe(easy.reviewed);
    });

    it("re-queues the current card at the end when rated Again", () => {
      const session = rate(reveal(startSession(ids)), 1);

      expect(session.phase).toBe("idle");
      expect(session.currentId).toBe("card-2");
      expect(session.reviewed).toBe(1);
      expect(session.queue).toEqual(["card-2", "card-3", "card-1"]);
    });

    it("reaches a complete session only after every rating has been consumed", () => {
      let session = startSession(ids);
      // card-1 rated Again -> re-queued; card-2 and card-3 rated Good.
      session = rate(reveal(session), 1);
      session = rate(reveal(session), 3);
      session = rate(reveal(session), 3);
      // card-1 is back at the front.
      expect(session.currentId).toBe("card-1");
      expect(session.queue).toEqual(["card-1"]);

      session = rate(reveal(session), 3);

      expect(session.phase).toBe("complete");
      expect(session.currentId).toBeNull();
      expect(session.queue).toEqual([]);
      expect(session.reviewed).toBe(4);
    });

    it("is a no-op when the session is already complete", () => {
      const complete = rate(reveal(startSession([ids[0]])), 3);
      const next = rate(complete, 3);

      expect(next).toEqual(complete);
    });

    it("advances even if the current card was never revealed", () => {
      const session = rate(startSession(ids), 3);

      expect(session.phase).toBe("idle");
      expect(session.currentId).toBe("card-2");
      expect(session.reviewed).toBe(1);
    });

    it("never rates a rating outside 1-4 as a valid advance", () => {
      // The Rating type constrains callers; at runtime an out-of-range value
      // must not silently consume the queue.
      const session = rate(reveal(startSession(ids)), 5 as Rating);

      expect(session).toEqual(reveal(startSession(ids)));
    });
  });
});
