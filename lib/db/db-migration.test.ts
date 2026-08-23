import Dexie from "dexie";
import { describe, expect, it } from "vitest";

import { NoNotesDatabase } from "./index";

const NOW = 1_700_000_000_000;

// The v1 schema is exactly what shipped before FSRS state existed.
const V1_STORES = {
  courses: "id, updatedAt",
  topics: "id, courseId, updatedAt",
  decks: "id, courseId, topicId, updatedAt",
  flashcards: "id, deckId, dueAt, updatedAt",
  reviewLogs: "id, flashcardId, reviewedAt",
};

async function createV1Database(name: string): Promise<Dexie> {
  const legacy = new Dexie(name);
  legacy.version(1).stores(V1_STORES);
  await legacy.open();
  return legacy;
}

describe("database migration", () => {
  it("upgrades a v1 database to v2, backfilling default FSRS state on existing flashcards", async () => {
    const name = `nonotes-migration-${crypto.randomUUID()}`;

    const legacy = await createV1Database(name);
    await legacy.table("flashcards").add({
      id: "card-legacy",
      deckId: "deck-legacy",
      prompt: "Old prompt",
      answer: "Old answer",
      sourceChunkIds: [],
      dueAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    legacy.close();

    const upgraded = new NoNotesDatabase(name);
    await upgraded.open();
    const card = await upgraded.flashcards.get("card-legacy");

    expect(card?.dueAt).toBe(NOW);
    expect(card?.fsrs).toBeDefined();
    expect(card?.fsrs.version).toBe(1);
    expect(card?.fsrs.due).toBe(NOW); // existing dueAt preserved
    expect(card?.fsrs.state).toBe(0); // New
    expect(card?.fsrs.reps).toBe(0);
    expect(card?.fsrs.last_review).toBeNull();

    await upgraded.delete();
  });

  it("opens a fresh database directly at the latest version", async () => {
    const name = `nonotes-fresh-${crypto.randomUUID()}`;

    const database = new NoNotesDatabase(name);
    await database.open();

    expect(database.verno).toBe(4);

    await database.delete();
  });

  it("does not corrupt state when the migrated database is opened again", async () => {
    const name = `nonotes-reopen-${crypto.randomUUID()}`;

    // Create v1 database with legacy card
    const legacy = await createV1Database(name);
    await legacy.table("flashcards").add({
      id: "card-reopen",
      deckId: "deck-reopen",
      prompt: "Prompt",
      answer: "Answer",
      sourceChunkIds: [],
      dueAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    legacy.close();

    // First open: migration runs
    const db1 = new NoNotesDatabase(name);
    await db1.open();
    const card1 = await db1.flashcards.get("card-reopen");
    expect(card1?.fsrs.due).toBe(NOW);
    expect(card1?.fsrs.state).toBe(0);
    await db1.close();

    // Second open: migration should NOT run again
    const db2 = new NoNotesDatabase(name);
    await db2.open();
    const card2 = await db2.flashcards.get("card-reopen");

    // Exact same FSRS state — no re-backfill
    expect(card2?.fsrs.due).toBe(NOW);
    expect(card2?.fsrs.state).toBe(0);
    expect(card2?.fsrs.reps).toBe(0);
    expect(card2?.fsrs.last_review).toBeNull();
    expect(card2?.dueAt).toBe(NOW);

    await db2.delete();
  });
});
