import { db } from "@/lib/db/client";
import type { Topic } from "@/lib/db/schema";

export type TopicInput = {
  courseId: string;
  title: string;
};

export type TopicPatch = Partial<Pick<Topic, "title">>;

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Topic title is required.");
  }
  return trimmed;
}

/** All topics for a course, in creation order. */
export async function listTopicsByCourse(courseId: string): Promise<Topic[]> {
  return db.topics.where("courseId").equals(courseId).sortBy("createdAt");
}

export async function getTopic(id: string): Promise<Topic | undefined> {
  return db.topics.get(id);
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const course = await db.courses.get(input.courseId);
  if (!course) {
    throw new Error(`Course not found: ${input.courseId}`);
  }

  const now = Date.now();
  const topic: Topic = {
    id: crypto.randomUUID(),
    courseId: input.courseId,
    title: assertValidTitle(input.title),
    createdAt: now,
    updatedAt: now,
  };

  await db.topics.add(topic);
  return topic;
}

export async function updateTopic(id: string, patch: TopicPatch): Promise<Topic> {
  const existing = await db.topics.get(id);
  if (!existing) {
    throw new Error(`Topic not found: ${id}`);
  }

  const updated: Topic = {
    ...existing,
    ...(patch.title !== undefined
      ? { title: assertValidTitle(patch.title) }
      : {}),
    updatedAt: Date.now(),
  };

  await db.topics.put(updated);
  return updated;
}

export async function deleteTopic(id: string): Promise<void> {
  // Deleting a topic detaches its decks and sources by clearing their
  // topicId (preserving the data) rather than leaving dangling references.
  await db.transaction("rw", db.topics, db.decks, db.sources, async () => {
    const decks = await db.decks.where("topicId").equals(id).toArray();
    for (const deck of decks) {
      await db.decks.put({ ...deck, topicId: undefined, updatedAt: Date.now() });
    }

    const sources = await db.sources.where("topicId").equals(id).toArray();
    for (const source of sources) {
      await db.sources.put({ ...source, topicId: undefined, updatedAt: Date.now() });
    }

    await db.topics.delete(id);
  });
}
