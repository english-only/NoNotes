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
  const weakDecks: DeckStats[] = [];
  for (const deck of decks) {
    const deckCards = allFlashcards.filter((c) => c.deckId === deck.id);
    if (deckCards.length === 0) continue;

    const deckDue = deckCards.filter((c) => c.dueAt <= now).length;
    const deckLogs = allLogs.filter((log) => {
      const card = allFlashcards.find((c) => c.id === log.flashcardId);
      return card?.deckId === deck.id;
    });

    const againCount = deckLogs.filter((l) => l.rating === 1).length;
    const goodCount = deckLogs.filter((l) => l.rating === 3).length;
    const stableDeckCards = deckCards.filter(
      (c) => c.fsrs && c.fsrs.stability > 0
    );
    const avgStability =
      stableDeckCards.length > 0
        ? stableDeckCards.reduce((sum, c) => sum + c.fsrs.stability, 0) /
          stableDeckCards.length
        : 0;

    weakDecks.push({
      deckId: deck.id,
      deckTitle: deck.title,
      totalCards: deckCards.length,
      dueCards: deckDue,
      againCount,
      goodCount,
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