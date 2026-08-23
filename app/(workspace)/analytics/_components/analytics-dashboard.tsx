"use client";

import { useCallback, useEffect, startTransition, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Clock3,
  Layers,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db/client";

type Status = "loading" | "ready" | "error";

type DeckStats = {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  dueCards: number;
  againCount: number;
  goodCount: number;
  averageStability: number;
};

type AnalyticsData = {
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

async function fetchAnalytics(): Promise<AnalyticsData> {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const [totalCards, totalReviews, totalSources, dueCards, allFlashcards, recentLogs] =
    await Promise.all([
      db.flashcards.count(),
      db.reviewLogs.count(),
      db.sources.count(),
      db.flashcards.where("dueAt").belowOrEqual(now).count(),
      db.flashcards.toArray(),
      db.reviewLogs.where("reviewedAt").above(oneWeekAgo).toArray(),
    ]);

  // Rating distribution
  const ratingDistribution = { again: 0, hard: 0, good: 0, easy: 0 };
  const allLogs = await db.reviewLogs.toArray();
  for (const log of allLogs) {
    if (log.rating === 1) ratingDistribution.again++;
    else if (log.rating === 2) ratingDistribution.hard++;
    else if (log.rating === 3) ratingDistribution.good++;
    else if (log.rating === 4) ratingDistribution.easy++;
  }

  // Average stability
  const cardsWithFsrs = allFlashcards.filter((c) => c.fsrs && c.fsrs.stability > 0);
  const averageStability =
    cardsWithFsrs.length > 0
      ? cardsWithFsrs.reduce((sum, c) => sum + c.fsrs.stability, 0) /
        cardsWithFsrs.length
      : 0;

  // Mastery: cards in Review state (state === 2) / total
  const masteredCards = allFlashcards.filter(
    (c) => c.fsrs && c.fsrs.state === 2
  ).length;
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // Per-deck stats for weak-deck identification
  const decks = await db.decks.toArray();
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
    const avgStability =
      deckCards.filter((c) => c.fsrs && c.fsrs.stability > 0).length > 0
        ? deckCards
            .filter((c) => c.fsrs && c.fsrs.stability > 0)
            .reduce((sum, c) => sum + c.fsrs.stability, 0) /
          deckCards.filter((c) => c.fsrs && c.fsrs.stability > 0).length
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

  // Sort weak decks: high again count + high due count = needs attention
  weakDecks.sort((a, b) => b.againCount - a.againCount || b.dueCards - a.dueCards);

  return {
    totalCards,
    totalReviews,
    totalSources,
    dueCards,
    averageStability: Math.round(averageStability * 100) / 100,
    ratingDistribution,
    recentActivity: recentLogs.length,
    masteryPercent,
    weakDecks: weakDecks.slice(0, 5),
    recentReviews: recentLogs.length,
  };
}

export function AnalyticsDashboard() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchAnalytics();
      setData(result);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load analytics."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    startTransition(async () => {
      await fetchData();
    });
  }, [fetchData]);

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="rounded-xl border border-border/80 bg-card/60 p-5"
              key={index}
            >
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-5 h-8 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">
            Couldn&apos;t load analytics
          </p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {error}
          </p>
          <Button
            className="mt-6"
            onClick={() => void fetchData()}
            variant="outline"
          >
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const overviewCards = [
    {
      label: "Total cards",
      value: data?.totalCards ?? 0,
      icon: Layers,
      tone: "text-cyan-300",
    },
    {
      label: "Total reviews",
      value: data?.totalReviews ?? 0,
      icon: Target,
      tone: "text-violet-300",
    },
    {
      label: "Due now",
      value: data?.dueCards ?? 0,
      icon: Clock3,
      tone: data && data.dueCards > 0 ? "text-amber-300" : "text-emerald-300",
    },
    {
      label: "Mastery",
      value: `${data?.masteryPercent ?? 0}%`,
      icon: TrendingUp,
      tone: "text-emerald-300",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Useful signals
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Progress, without the noise.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Real metrics from your review history. See what&apos;s working and
            where to focus next.
          </p>
        </div>
      </section>

      <section
        aria-label="Overview metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {overviewCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              className="border border-border/80 bg-card/70 p-5 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.8)]"
              key={item.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Icon aria-hidden="true" className={cn("size-4", item.tone)} />
              </div>
              <p className="mt-5 font-heading text-3xl font-semibold tracking-tight">
                {item.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Rating distribution */}
        <div className="border border-border/80 bg-card/60 p-6">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Rating distribution
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {[
              { label: "Again", value: data?.ratingDistribution.again ?? 0, color: "bg-destructive" },
              { label: "Hard", value: data?.ratingDistribution.hard ?? 0, color: "bg-amber-500" },
              { label: "Good", value: data?.ratingDistribution.good ?? 0, color: "bg-emerald-500" },
              { label: "Easy", value: data?.ratingDistribution.easy ?? 0, color: "bg-cyan-500" },
            ].map((item) => {
              const total = data
                ? data.ratingDistribution.again +
                  data.ratingDistribution.hard +
                  data.ratingDistribution.good +
                  data.ratingDistribution.easy
                : 0;
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div className="flex items-center gap-3" key={item.label}>
                  <p className="w-12 text-sm text-muted-foreground">{item.label}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", item.color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="w-12 text-right text-sm tabular-nums text-muted-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Study summary */}
        <div className="border border-border/80 bg-card/60 p-6">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Study summary
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Reviews this week</p>
              <p className="font-heading text-lg font-semibold">
                {data?.recentActivity ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Sources ingested</p>
              <p className="font-heading text-lg font-semibold">
                {data?.totalSources ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Average stability</p>
              <p className="font-heading text-lg font-semibold">
                {data?.averageStability ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Weak decks / Needs attention */}
      {data && data.weakDecks.length > 0 && (
        <section>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Needs attention
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.weakDecks.map((deck) => (
              <div
                className="border border-border/80 bg-card/60 p-4"
                key={deck.deckId}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    aria-hidden="true"
                    className="size-4 text-amber-400"
                  />
                  <p className="text-sm font-medium truncate">{deck.deckTitle}</p>
                </div>
                <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Due cards</span>
                    <span className="tabular-nums">{deck.dueCards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Again ratings</span>
                    <span className="tabular-nums">{deck.againCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total cards</span>
                    <span className="tabular-nums">{deck.totalCards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg stability</span>
                    <span className="tabular-nums">{deck.averageStability}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && data.totalReviews === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-semibold">
            No reviews yet
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Start a study session to see your progress here.
          </p>
        </div>
      )}
    </div>
  );
}
