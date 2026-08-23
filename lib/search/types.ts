/** A single search result returned by the search engine. */
export type SearchResult = {
  /** The entity's unique ID. */
  id: string;
  /** The type of entity this result represents. */
  type: "course" | "topic" | "deck" | "flashcard" | "source" | "chunk";
  /** The entity's primary display text (title, prompt, etc.). */
  title: string;
  /** Optional excerpt for additional context (answer text, chunk content, etc.). */
  excerpt?: string;
  /** Relevance score (higher = more relevant). */
  score: number;
  /** The route to navigate to when this result is selected. */
  href: string;
  /** Optional parent context for the result. */
  parent?: {
    type: string;
    title: string;
  };
};

/** Configuration for the search engine. */
export type SearchConfig = {
  /** Maximum number of results to return. Default: 20. */
  maxResults: number;
  /** Minimum score threshold to include a result. Default: 0.01. */
  minScore: number;
};

/** A document in the search index. */
export type SearchDocument = {
  id: string;
  type: SearchResult["type"];
  /** All searchable text fields combined. */
  text: string;
  /** The result this document maps to. */
  result: Omit<SearchResult, "score">;
};

/** The search index state. */
export type SearchIndex = {
  documents: SearchDocument[];
  /** Term frequency: term → document index → count. */
  tf: Map<string, Map<number, number>>;
  /** Document frequency: term → number of documents containing it. */
  df: Map<string, number>;
  /** Total number of documents. */
  totalDocuments: number;
};
