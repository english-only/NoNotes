import { db } from "@/lib/db/client";
import type { Deck } from "@/lib/db/schema";

export type DeckInput = {
  courseId: string;
  topicId?: string;
  title: string;
};

export type DeckPatch = Partial<Pick<Deck, "title" | "topicId">>;

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Deck title is required.");
  }
  return trimmed;
}

/**
 * Validates that the parent course exists and, when a topic is supplied,
 * that the topic exists and belongs to that course. Cross-course topic
 * assignment is rejected rather than silently accepted.
 */
async function assertValidParent(courseId: string, topicId?: string): Promise<void> {
  const course = await db.courses.get(courseId);
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  if (topicId === undefined) {
    return;
  }

  const topic = await db.topics.get(topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }
  if (topic.courseId !== courseId) {
    throw new Error(`Topic ${topicId} does not belong to course ${courseId}`);
  }
}

/** All decks for a course, in creation order. */
export async function listDecksByCourse(courseId: string): Promise<Deck[]> {
  return db.decks.where("courseId").equals(courseId).sortBy("createdAt");
}

/** All decks for a topic, in creation order. */
export async function listDecksByTopic(topicId: string): Promise<Deck[]> {
  return db.decks.where("topicId").equals(topicId).sortBy("createdAt");
}

/** All decks across every course, in creation order. */
export async function listAllDecks(): Promise<Deck[]> {
  const decks = await db.decks.toArray();
  return decks.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function createDeck(input: DeckInput): Promise<Deck> {
  await assertValidParent(input.courseId, input.topicId);

  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    courseId: input.courseId,
    topicId: input.topicId,
    title: assertValidTitle(input.title),
    createdAt: now,
    updatedAt: now,
  };

  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(id: string, patch: DeckPatch): Promise<Deck> {
  const existing = await db.decks.get(id);
  if (!existing) {
    throw new Error(`Deck not found: ${id}`);
  }

  // topicId is only re-validated when the patch explicitly supplies it;
  // an explicitly cleared topicId (undefined) keeps the deck course-level.
  if ("topicId" in patch) {
    await assertValidParent(existing.courseId, patch.topicId);
  }

  const updated: Deck = {
    ...existing,
    ...(patch.title !== undefined
      ? { title: assertValidTitle(patch.title) }
      : {}),
    ...("topicId" in patch ? { topicId: patch.topicId } : {}),
    updatedAt: Date.now(),
  };

  await db.decks.put(updated);
  return updated;
}

export async function deleteDeck(id: string): Promise<void> {
  // Deleting a deck cascades to its flashcards, their review logs, and the
  // deck's feynman attempts so orphaned rows never accumulate.
  await db.transaction(
    "rw",
    db.decks,
    db.flashcards,
    db.reviewLogs,
    db.feynmanAttempts,
    async () => {
      const cardIds = await db.flashcards
        .where("deckId")
        .equals(id)
        .primaryKeys();
      if (cardIds.length > 0) {
        await db.reviewLogs.where("flashcardId").anyOf(cardIds).delete();
      }
      await db.flashcards.where("deckId").equals(id).delete();
      await db.feynmanAttempts.where("deckId").equals(id).delete();
      await db.decks.delete(id);
    }
  );
}
