import type { Flashcard, ReviewLog, Deck } from "@/lib/db/schema";

// Pure analytics aggregation. The dashboard fetches rows from Dexie and calls
// computeAnalytics, which is unit-testable with fixed in-memory inputs.

export type DeckStats = {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  dueCards: number;
  againCount: number;
  goodCount: number;
  averageStability: number;
};

export type AnalyticsData = {
  totalCards: number;
  totalReviews: number;
  totalSources: number;
  dueCards: number;
  averageStability: number;
  ratingDistribution: { again: number; hard: number; good: number; easy: number };
  recentActivity: number;
  masteryPercent: number;
  weakDecks: DeckStats[];
  recentReviews: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compute analytics from in-memory rows. `now` and `oneWeekAgo` are injected so
 * tests can assert deterministic outcomes.
 */
export function computeAnalytics(input: {
  now: number;
  oneWeekAgo: number;
  allFlashcards: Flashcard[];
  allLogs: ReviewLog[];
  decks: Deck[];
  sourceCount: number;
}): AnalyticsData {
  const { now, oneWeekAgo, allFlashcards, allLogs, decks, sourceCount } = input;

  const totalCards = allFlashcards.length;
  const totalReviews = allLogs.length;
  const dueCards = allFlashcards.filter((c) => c.dueAt <= now).length;

  // Rating distribution
  const ratingDistribution = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const log of allLogs) {
    if (log.rating === 1) ratingDistribution.again++;
    else if (log.rating === 2) ratingDistribution.hard++;
    else if (log.rating === 3) ratingDistribution.good++;
    else if (log.rating === 4) ratingDistribution.easy++;
  }

  // Average stability across cards that have a stability figure.
  const cardsWithFsrs = allFlashcards.filter(
    (c) => c.fsrs && c.fsrs.stability > 0
  );
  const averageStability =
    cardsWithFsrs.length > 0
      ? cardsWithFsrs.reduce((sum, c) => sum + c.fsrs.stability, 0) /
        cardsWithFsrs.length
      : 0;

  // Mastery: cards in the Review state (state === 2) as a share of all cards.
  const masteredCards = allFlashcards.filter(
    (c) => c.fsrs && c.fsrs.state === 2
  ).length;
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // Per-deck stats, used to flag decks needing attention.
  // Single-pass O(C + L + D): bucket cards by deck once, then attribute logs
  // through a cardId→deckId map instead of a nested find/filter per deck.
  const deckIdSet = new Set(decks.map((d) => d.id));
  const cardsByDeck = new Map<string, Flashcard[]>();
  const stableSumByDeck = new Map<string, { sum: number; count: number }>();
  for (const card of allFlashcards) {
    if (!deckIdSet.has(card.deckId)) continue;
    const bucket = cardsByDeck.get(card.deckId);
    if (bucket) {
      bucket.push(card);
    } else {
      cardsByDeck.set(card.deckId, [card]);
    }
    if (card.fsrs && card.fsrs.stability > 0) {
      const stable = stableSumByDeck.get(card.deckId);
      if (stable) {
        stable.sum += card.fsrs.stability;
        stable.count += 1;
      } else {
        stableSumByDeck.set(card.deckId, { sum: card.fsrs.stability, count: 1 });
      }
    }
  }

  const cardDeck = new Map(allFlashcards.map((c) => [c.id, c.deckId]));
  const countsByDeck = new Map<
    string,
    { again: number; good: number }
  >();
  for (const log of allLogs) {
    const deckId = cardDeck.get(log.flashcardId);
    if (!deckId || !deckIdSet.has(deckId)) continue;
    const entry = countsByDeck.get(deckId);
    if (entry) {
      if (log.rating === 1) entry.again += 1;
      else if (log.rating === 3) entry.good += 1;
    } else {
      countsByDeck.set(deckId, {
        again: log.rating === 1 ? 1 : 0,
        good: log.rating === 3 ? 1 : 0,
      });
    }
  }

  const weakDecks: DeckStats[] = [];
  for (const deck of decks) {
    const deckCards = cardsByDeck.get(deck.id);
    if (!deckCards || deckCards.length === 0) continue;

    const deckDue = deckCards.filter((c) => c.dueAt <= now).length;
    const counts = countsByDeck.get(deck.id) ?? { again: 0, good: 0 };
    const stable = stableSumByDeck.get(deck.id) ?? { sum: 0, count: 0 };
    const avgStability =
      stable.count > 0 ? stable.sum / stable.count : 0;

    weakDecks.push({
      deckId: deck.id,
      deckTitle: deck.title,
      totalCards: deckCards.length,
      dueCards: deckDue,
      againCount: counts.again,
      goodCount: counts.good,
      averageStability: Math.round(avgStability * 100) / 100,
    });
  }

  // Sort weak decks: high again count first, then high due count.
  weakDecks.sort(
    (a, b) => b.againCount - a.againCount || b.dueCards - a.dueCards
  );

  const recentReviews = allLogs.filter((l) => l.reviewedAt >= oneWeekAgo).length;

  return {
    totalCards,
    totalReviews,
    totalSources: sourceCount,
    dueCards,
    averageStability: Math.round(averageStability * 100) / 100,
    ratingDistribution,
    recentActivity: recentReviews,
    masteryPercent,
    weakDecks: weakDecks.slice(0, 5),
    recentReviews,
  };
}

/** Test-friendly default window builder. */
export function analyticsWindow(now = Date.now()) {
  return { now, oneWeekAgo: now - WEEK_MS };
}