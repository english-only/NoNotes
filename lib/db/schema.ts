export type Timestamp = number;

/**
 * Complete FSRS-5 card state — the ts-fsrs `Card` with Date fields flattened
 * to ms timestamps. `version` tracks the representation so the scheduler
 * adapter can evolve it without losing portability of stored data.
 * `state`: New=0, Learning=1, Review=2, Relearning=3.
 */
export type FsrsState = {
  version: 1;
  due: Timestamp;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: 0 | 1 | 2 | 3;
  last_review: Timestamp | null;
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Topic = {
  id: string;
  courseId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Deck = {
  id: string;
  courseId: string;
  topicId?: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Flashcard = {
  id: string;
  deckId: string;
  prompt: string;
  answer: string;
  sourceChunkIds: string[];
  /** When this card enters the review queue (ms). Kept in sync with fsrs.due. */
  dueAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Complete scheduler state; absent only on pre-migration v1 records. */
  fsrs: FsrsState;
};

export type ReviewLog = {
  id: string;
  flashcardId: string;
  rating: 1 | 2 | 3 | 4;
  reviewedAt: Timestamp;
  /** Time from answer reveal to rating, when known. */
  elapsedMs: number;
  /**
   * FSRS revlog snapshot: the card's scheduling state *at review time*
   * (pre-review values, as produced by the ts-fsrs scheduler log).
   */
  state: 0 | 1 | 2 | 3;
  stability: number;
  difficulty: number;
  /** The card's due date at the time of this review (ms). */
  due: Timestamp;
  scheduled_days: number;
  elapsed_days: number;
  last_elapsed_days: number;
  learning_steps: number;
};

/** Source material ingested into the system (text, markdown, etc.). */
export type Source = {
  id: string;
  courseId: string;
  topicId?: string;
  title: string;
  /** Source content type. */
  type: "text" | "markdown" | "pdf" | "url";
  /** Original raw content provided by the user. */
  rawContent: string;
  /** Processed/cleaned text after extraction. */
  processedContent: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** A semantically coherent chunk extracted from a Source. */
export type Chunk = {
  id: string;
  sourceId: string;
  /** Position of this chunk within the source (0-based). */
  ordinal: number;
  /** The chunk text content. */
  content: string;
  createdAt: Timestamp;
};

/** Structured feedback from a Feynman evaluation. */
export type FeynmanFeedback = {
  correctness: number;
  completeness: number;
  clarity: number;
  misconceptions: string[];
  missingConcepts: string[];
  corrections: string[];
  summary: string;
  improvement: string;
  followUp: string;
};

/** A student's Feynman attempt: explain a concept, receive AI evaluation. */
export type FeynmanAttempt = {
  id: string;
  courseId: string;
  deckId?: string;
  concept: string;
  explanation: string;
  feedback: FeynmanFeedback;
  /** Source chunk IDs used as evaluation context. */
  sourceChunkIds: string[];
  createdAt: Timestamp;
};
