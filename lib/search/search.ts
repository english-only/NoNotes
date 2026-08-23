import type { SearchConfig, SearchDocument, SearchIndex, SearchResult } from "./types";

/** Default search configuration. */
const DEFAULT_CONFIG: SearchConfig = {
  maxResults: 20,
  minScore: 0.01,
};

/**
 * Tokenize text into normalized terms.
 * - Lowercases
 * - Splits on whitespace and punctuation
 * - Filters out very short tokens (1-2 chars)
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Build a search index from a list of documents.
 * Computes term frequency (TF) and document frequency (DF) for BM25 scoring.
 */
export function buildIndex(documents: SearchDocument[]): SearchIndex {
  const tf = new Map<string, Map<number, number>>();
  const df = new Map<string, number>();

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const terms = tokenize(doc.text);
    const termCounts = new Map<string, number>();

    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }

    for (const [term, count] of termCounts) {
      if (!tf.has(term)) tf.set(term, new Map());
      tf.get(term)!.set(i, count);

      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  return { documents, tf, df, totalDocuments: documents.length };
}

/**
 * Check if a document contains a query term (exact or prefix match).
 * Returns the effective term frequency for scoring.
 */
function getTermFrequency(
  queryTerm: string,
  docIndex: number,
  index: SearchIndex,
): { termFreq: number; docFreq: number } {
  // Try exact match first
  const exactTf = index.tf.get(queryTerm)?.get(docIndex) ?? 0;
  const exactDf = index.df.get(queryTerm) ?? 0;
  if (exactTf > 0) return { termFreq: exactTf, docFreq: exactDf };

  // Try prefix/substring match across all indexed terms
  let totalTf = 0;
  let matchingDocCount = 0;
  for (const [term, docMap] of index.tf) {
    if (term.startsWith(queryTerm) || term.includes(queryTerm)) {
      const tf = docMap.get(docIndex) ?? 0;
      if (tf > 0) {
        totalTf += tf;
        matchingDocCount++;
      }
    }
  }

  return { termFreq: totalTf, docFreq: matchingDocCount };
}

/**
 * BM25 scoring function.
 * k1 = 1.5 (term frequency saturation), b = 0.75 (length normalization).
 */
function bm25Score(
  queryTerms: string[],
  docIndex: number,
  index: SearchIndex,
  avgDocLength: number,
): number {
  const k1 = 1.5;
  const b = 0.75;
  let score = 0;

  const doc = index.documents[docIndex];
  const docLength = tokenize(doc.text).length || 1;

  for (const term of queryTerms) {
    const { termFreq, docFreq } = getTermFrequency(term, docIndex, index);

    if (docFreq === 0) continue;

    const idf = Math.log(
      (index.totalDocuments - docFreq + 0.5) / (docFreq + 0.5) + 1,
    );

    const tfNorm =
      (termFreq * (k1 + 1)) /
      (termFreq + k1 * (1 - b + (b * docLength) / avgDocLength));

    score += idf * tfNorm;
  }

  // Boost exact title matches
  const titleLower = index.documents[docIndex].result.title.toLowerCase();
  const queryStr = queryTerms.join(" ");
  if (titleLower.includes(queryStr)) {
    score *= 2.0;
  } else if (queryTerms.some((t) => titleLower.includes(t))) {
    score *= 1.5;
  }

  return score;
}

/**
 * Search the index with a query string.
 * Returns ranked results sorted by relevance score.
 */
export function search(
  index: SearchIndex,
  query: string,
  config: Partial<SearchConfig> = {},
): SearchResult[] {
  const { maxResults, minScore } = { ...DEFAULT_CONFIG, ...config };

  if (!query.trim()) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  // Calculate average document length
  const avgDocLength =
    index.documents.reduce(
      (sum, doc) => sum + (tokenize(doc.text).length || 1),
      0,
    ) / (index.totalDocuments || 1);

  // Score all documents
  const scored: Array<{ index: number; score: number }> = [];
  for (let i = 0; i < index.documents.length; i++) {
    const score = bm25Score(queryTerms, i, index, avgDocLength);
    if (score >= minScore) {
      scored.push({ index: i, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top results
  return scored.slice(0, maxResults).map(({ index: docIndex, score }) => ({
    ...index.documents[docIndex].result,
    score,
  }));
}
