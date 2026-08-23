import { db } from "@/lib/db/client";
import type { Course } from "@/lib/db/schema";

export type CourseInput = {
  title: string;
  description?: string;
};

export type CoursePatch = Partial<Pick<Course, "title" | "description">>;

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Course title is required.");
  }
  return trimmed;
}

function normalizeDescription(description?: string): string | undefined {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

/** All courses, most recently updated first. */
export async function listCourses(): Promise<Course[]> {
  return db.courses.orderBy("updatedAt").reverse().toArray();
}

export async function getCourse(id: string): Promise<Course | undefined> {
  return db.courses.get(id);
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const now = Date.now();
  const course: Course = {
    id: crypto.randomUUID(),
    title: assertValidTitle(input.title),
    description: normalizeDescription(input.description),
    createdAt: now,
    updatedAt: now,
  };

  await db.courses.add(course);
  return course;
}

export async function updateCourse(
  id: string,
  patch: CoursePatch
): Promise<Course> {
  const existing = await db.courses.get(id);
  if (!existing) {
    throw new Error(`Course not found: ${id}`);
  }

  const updated: Course = {
    ...existing,
    ...(patch.title !== undefined
      ? { title: assertValidTitle(patch.title) }
      : {}),
    ...(patch.description !== undefined
      ? { description: normalizeDescription(patch.description) }
      : {}),
    updatedAt: Date.now(),
  };

  await db.courses.put(updated);
  return updated;
}

export async function deleteCourse(id: string): Promise<void> {
  // Deleting a course cascades to its topics, decks, and (through the decks)
  // flashcards so orphaned rows never accumulate.
  await db.transaction(
    "rw",
    db.courses,
    db.topics,
    db.decks,
    db.flashcards,
    async () => {
      const deckIds = await db.decks.where("courseId").equals(id).primaryKeys();
      if (deckIds.length > 0) {
        await db.flashcards.where("deckId").anyOf(deckIds).delete();
      }
      await db.decks.where("courseId").equals(id).delete();
      await db.topics.where("courseId").equals(id).delete();
      await db.courses.delete(id);
    }
  );
}
