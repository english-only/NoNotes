import { db } from "@/lib/db/client";
import type { SearchDocument, SearchIndex } from "./types";
import { buildIndex, search as searchEngine } from "./search";
import type { SearchResult } from "./types";

/** The cached search index. Rebuilt on demand. */
let cachedIndex: SearchIndex | null = null;

/** Debounce timer for index rebuilds. */
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

/** Event listeners for index changes. */
type IndexChangeListener = () => void;
const listeners: Set<IndexChangeListener> = new Set();

/**
 * Subscribe to index changes.
 * Returns an unsubscribe function.
 */
export function onIndexChange(listener: IndexChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Schedule a debounced index rebuild. */
export function scheduleRebuild(): void {
  if (rebuildTimer !== null) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    void rebuildIndex();
  }, 300);
}

/**
 * Build the search index from all Dexie data.
 * This is the main indexing function that pulls from all entity tables.
 */
export async function rebuildIndex(): Promise<SearchIndex> {
  const [
    courses,
    topics,
    decks,
    flashcards,
    sources,
    chunks,
  ] = await Promise.all([
    db.courses.toArray(),
    db.topics.toArray(),
    db.decks.toArray(),
    db.flashcards.toArray(),
    db.sources.toArray(),
    db.chunks.toArray(),
  ]);

  // Build lookup maps for parent context
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  // Map deck → course for flashcard navigation
  const deckCourseMap = new Map(decks.map((d) => [d.id, d.courseId]));

  const documents: SearchDocument[] = [];

  // Index courses
  for (const course of courses) {
    documents.push({
      id: course.id,
      type: "course",
      text: `${course.title} ${course.description ?? ""}`,
      result: {
        id: course.id,
        type: "course",
        title: course.title,
        excerpt: course.description,
        href: `/courses/${course.id}`,
      },
    });
  }

  // Index topics
  for (const topic of topics) {
    const courseTitle = courseMap.get(topic.courseId);
    documents.push({
      id: topic.id,
      type: "topic",
      text: topic.title,
      result: {
        id: topic.id,
        type: "topic",
        title: topic.title,
        href: `/courses/${topic.courseId}`,
        parent: courseTitle ? { type: "course", title: courseTitle } : undefined,
      },
    });
  }

  // Index decks
  for (const deck of decks) {
    const courseTitle = courseMap.get(deck.courseId);
    documents.push({
      id: deck.id,
      type: "deck",
      text: deck.title,
      result: {
        id: deck.id,
        type: "deck",
        title: deck.title,
        href: `/courses/${deck.courseId}/decks/${deck.id}`,
        parent: courseTitle ? { type: "course", title: courseTitle } : undefined,
      },
    });
  }

  // Index flashcards
  for (const card of flashcards) {
    const courseId = deckCourseMap.get(card.deckId);
    documents.push({
      id: card.id,
      type: "flashcard",
      text: `${card.prompt} ${card.answer}`,
      result: {
        id: card.id,
        type: "flashcard",
        title: card.prompt,
        excerpt: card.answer,
        href: courseId
          ? `/courses/${courseId}/decks/${card.deckId}`
          : `/study/${card.deckId}`,
      },
    });
  }

  // Index sources
  for (const source of sources) {
    documents.push({
      id: source.id,
      type: "source",
      text: `${source.title} ${source.rawContent}`,
      result: {
        id: source.id,
        type: "source",
        title: source.title,
        excerpt: source.rawContent.slice(0, 200),
        href: `/courses/${source.courseId}`,
      },
    });
  }

  // Index chunks
  for (const chunk of chunks) {
    // Find the source for this chunk to get course context
    const source = sources.find((s) => s.id === chunk.sourceId);
    documents.push({
      id: chunk.id,
      type: "chunk",
      text: chunk.content,
      result: {
        id: chunk.id,
        type: "chunk",
        title: chunk.content.slice(0, 80),
        excerpt: chunk.content,
        href: source ? `/courses/${source.courseId}` : "/courses",
        parent: source
          ? { type: "source", title: source.title }
          : undefined,
      },
    });
  }

  cachedIndex = buildIndex(documents);
  notifyListeners();
  return cachedIndex;
}

/**
 * Get the current search index, rebuilding if necessary.
 */
export async function getIndex(): Promise<SearchIndex> {
  if (!cachedIndex) {
    return rebuildIndex();
  }
  return cachedIndex;
}

/**
 * Search across all indexed entities.
 * Returns ranked results sorted by relevance.
 */
export async function search(query: string): Promise<SearchResult[]> {
  const index = await getIndex();
  return searchEngine(index, query);
}

/**
 * Invalidate the search index.
 * Call after any CRUD operation that changes searchable data.
 */
export function invalidateIndex(): void {
  cachedIndex = null;
  scheduleRebuild();
}
