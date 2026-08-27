"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers, RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCourses } from "@/lib/db/repositories/course-repository";
import { listAllDecks } from "@/lib/db/repositories/deck-repository";
import { listFlashcardsByDeck } from "@/lib/db/repositories/flashcard-repository";
import { listDueFlashcardsByDeck } from "@/lib/db/repositories/review-repository";
import type { Deck } from "@/lib/db/schema";

type Status = "loading" | "ready" | "error";

type DeckWithContext = Deck & {
  courseTitle: string;
  cardCount: number;
  dueCount: number;
};

export function StudyPicker() {
  const [status, setStatus] = useState<Status>("loading");
  const [decks, setDecks] = useState<DeckWithContext[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    const [allDecks, courses] = await Promise.all([listAllDecks(), listCourses()]);
    const courseById = new Map(courses.map((course) => [course.id, course]));

    const withContext = await Promise.all(
      allDecks.map(async (deck) => {
        const [cards, due] = await Promise.all([
          listFlashcardsByDeck(deck.id),
          listDueFlashcardsByDeck(deck.id),
        ]);
        return {
          ...deck,
          courseTitle: courseById.get(deck.courseId)?.title ?? "Unknown course",
          cardCount: cards.length,
          dueCount: due.length,
        };
      })
    );
    // Decks with due cards first (stable sort keeps creation order within each
    // group), so the picker leads with what is ready to review.
    return withContext.sort(
      (a, b) => Number(b.dueCount > 0) - Number(a.dueCount > 0)
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDecks()
      .then((next) => {
        if (cancelled) return;
        setDecks(next);
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load your decks."
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDecks]);

  const reload = useCallback(async () => {
    try {
      setDecks(await fetchDecks());
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your decks."
      );
    }
  }, [fetchDecks]);

  if (status === "loading") {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="rounded-xl border border-border/60 bg-card/50 p-5"
            key={index}
          >
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-3 w-2/3" />
            <Skeleton className="mt-6 h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">
          Couldn&apos;t load your decks
        </p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          {error}
        </p>
        <Button
          className="mt-6"
          onClick={() => void reload()}
          variant="outline"
        >
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Layers aria-hidden="true" className="size-5" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">
          No decks to study
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          Create a deck and add cards, then start your first review session.
        </p>
        <Link
          className={cn(buttonVariants(), "mt-6")}
          href="/courses"
        >
          <BookOpen aria-hidden="true" />
          Go to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {decks.map((deck) => (
        <Card key={deck.id}>
          <CardHeader>
            <CardTitle>{deck.title}</CardTitle>
            <CardDescription>{deck.courseTitle}</CardDescription>
            <CardAction>
              <Link
                aria-label={`Study ${deck.title}`}
                className={cn(
                  buttonVariants({ size: "icon-sm", variant: "outline" })
                )}
                href={`/study/${deck.id}`}
              >
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardFooter>
            <div className="flex items-center gap-2">
              {deck.dueCount > 0 ? (
                <Badge variant="warning">
                  {deck.dueCount} due
                </Badge>
              ) : (
                <Badge variant="success">
                  All caught up
                </Badge>
              )}
              <span className="text-xs text-muted-foreground/60">
                {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
