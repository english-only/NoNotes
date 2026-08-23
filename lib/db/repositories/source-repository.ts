import { db } from "@/lib/db/client";
import type { Source } from "@/lib/db/schema";

export type SourceInput = {
  courseId: string;
  topicId?: string;
  title: string;
  type: "text" | "markdown" | "pdf" | "url";
  rawContent: string;
  processedContent: string;
};

export type SourcePatch = Partial<
  Pick<Source, "title" | "processedContent" | "topicId">
>;

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Source title is required.");
  }
  return trimmed;
}

async function assertValidParent(
  courseId: string,
  topicId?: string
): Promise<void> {
  const course = await db.courses.get(courseId);
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  if (topicId === undefined) return;

  const topic = await db.topics.get(topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }
  if (topic.courseId !== courseId) {
    throw new Error(
      `Topic ${topicId} does not belong to course ${courseId}`
    );
  }
}

/** All sources for a course, in creation order. */
export async function listSourcesByCourse(
  courseId: string
): Promise<Source[]> {
  return db.sources.where("courseId").equals(courseId).sortBy("createdAt");
}

/** All sources for a topic, in creation order. */
export async function listSourcesByTopic(
  topicId: string
): Promise<Source[]> {
  return db.sources.where("topicId").equals(topicId).sortBy("createdAt");
}

export async function getSource(
  id: string
): Promise<Source | undefined> {
  return db.sources.get(id);
}

export async function createSource(
  input: SourceInput
): Promise<Source> {
  await assertValidParent(input.courseId, input.topicId);

  const now = Date.now();
  const source: Source = {
    id: crypto.randomUUID(),
    courseId: input.courseId,
    topicId: input.topicId,
    title: assertValidTitle(input.title),
    type: input.type,
    rawContent: input.rawContent,
    processedContent: input.processedContent,
    createdAt: now,
    updatedAt: now,
  };

  await db.sources.add(source);
  return source;
}

export async function updateSource(
  id: string,
  patch: SourcePatch
): Promise<Source> {
  const existing = await db.sources.get(id);
  if (!existing) {
    throw new Error(`Source not found: ${id}`);
  }

  if ("topicId" in patch) {
    await assertValidParent(existing.courseId, patch.topicId);
  }

  const updated: Source = {
    ...existing,
    ...(patch.title !== undefined
      ? { title: assertValidTitle(patch.title) }
      : {}),
    ...(patch.processedContent !== undefined
      ? { processedContent: patch.processedContent }
      : {}),
    ...("topicId" in patch ? { topicId: patch.topicId } : {}),
    updatedAt: Date.now(),
  };

  await db.sources.put(updated);
  return updated;
}

export async function deleteSource(id: string): Promise<void> {
  await db.transaction("rw", db.sources, db.chunks, async () => {
    await db.chunks.where("sourceId").equals(id).delete();
    await db.sources.delete(id);
  });
}
