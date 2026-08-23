import { db } from "@/lib/db/client";
import type { FeynmanAttempt, FeynmanFeedback } from "@/lib/db/schema";

export type CreateFeynmanAttemptInput = {
  courseId: string;
  deckId?: string;
  concept: string;
  explanation: string;
  feedback: FeynmanFeedback;
  sourceChunkIds?: string[];
};

export async function createFeynmanAttempt(
  input: CreateFeynmanAttemptInput
): Promise<FeynmanAttempt> {
  const now = Date.now();
  const attempt: FeynmanAttempt = {
    id: crypto.randomUUID(),
    courseId: input.courseId,
    deckId: input.deckId,
    concept: input.concept.trim(),
    explanation: input.explanation.trim(),
    feedback: input.feedback,
    sourceChunkIds: input.sourceChunkIds ?? [],
    createdAt: now,
  };

  await db.feynmanAttempts.add(attempt);
  return attempt;
}

export async function getFeynmanAttempt(
  id: string
): Promise<FeynmanAttempt | undefined> {
  return db.feynmanAttempts.get(id);
}

export async function listFeynmanAttemptsByCourse(
  courseId: string
): Promise<FeynmanAttempt[]> {
  return db.feynmanAttempts
    .where("courseId")
    .equals(courseId)
    .sortBy("createdAt");
}

export async function listFeynmanAttemptsByDeck(
  deckId: string
): Promise<FeynmanAttempt[]> {
  return db.feynmanAttempts
    .where("deckId")
    .equals(deckId)
    .sortBy("createdAt");
}

export async function deleteFeynmanAttempt(id: string): Promise<void> {
  await db.feynmanAttempts.delete(id);
}
