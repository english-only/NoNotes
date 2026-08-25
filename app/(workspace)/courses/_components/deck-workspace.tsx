"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateFlashcardDialog } from "@/app/(workspace)/courses/_components/create-flashcard-dialog";
import { GenerateFromSourceDialog } from "@/app/(workspace)/courses/_components/generate-from-source-dialog";
import { getCourse } from "@/lib/db/repositories/course-repository";
import { getDeck } from "@/lib/db/repositories/deck-repository";
import {
  deleteFlashcard,
  listFlashcardsByDeck,
} from "@/lib/db/repositories/flashcard-repository";
import { getTopic } from "@/lib/db/repositories/topic-repository";
import type { Course, Deck, Flashcard, Topic } from "@/lib/db/schema";

type Status = "loading" | "ready" | "error";

type DialogTarget = { mode: "create" } | { mode: "edit"; card: Flashcard };

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

export function DeckWorkspace({
  courseId,
  deckId,
}: {
  courseId: string;
  deckId: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [course, setCourse] = useState<Course | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [topic, setTopic] = useState<Topic | undefined>(undefined);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [nextCourse, nextDeck, nextCards] = await Promise.all([
      getCourse(courseId),
      getDeck(deckId),
      listFlashcardsByDeck(deckId),
    ]);
    const nextTopic = nextDeck?.topicId
      ? await getTopic(nextDeck.topicId)
      : undefined;
    return { course: nextCourse, deck: nextDeck, cards: nextCards, topic: nextTopic };
  }, [courseId, deckId]);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then((data) => {
        if (cancelled) return;
        setCourse(data.course ?? null);
        setDeck(data.deck ?? null);
        setCards(data.cards);
        setTopic(data.topic);
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load this deck."
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // Re-fetch after a mutation (delete or retry). Safe to call from event
  // handlers; the mount path above owns the initial load.
  const reload = useCallback(async () => {
    try {
      const data = await fetchData();
      setCourse(data.course ?? null);
      setDeck(data.deck ?? null);
      setCards(data.cards);
      setTopic(data.topic);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this deck."
      );
    }
  }, [fetchData]);

  async function handleDelete(card: Flashcard) {
    setError(null);
    setDeletingId(card.id);
    try {
      await deleteFlashcard(card.id);
      setConfirmingId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the card."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const containerClassName =
    "mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12";

  if (status === "loading") {
    return (
      <div className={containerClassName}>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="rounded-xl border border-border/80 bg-card/60 p-5"
              key={index}
            >
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-6 h-3 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">
            Couldn&apos;t load this deck
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
      </div>
    );
  }

  if (!course || !deck) {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Layers aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            Deck not found
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            It may have been deleted.
          </p>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
            href="/courses"
          >
            <ArrowLeft aria-hidden="true" />
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <Link
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href={`/courses/${courseId}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {course.title}
          </Link>
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Deck workspace
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            {deck.title}
          </h1>
          {topic && (
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              In {topic.title}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setGenerateDialogOpen(true)} variant="outline">
              <Sparkles aria-hidden="true" />
              Generate
            </Button>
            <Button onClick={() => setDialogTarget({ mode: "create" })}>
              <Plus aria-hidden="true" />
              Add card
            </Button>
          </div>
        </div>

        {error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Layers aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold">
              No cards yet
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Add a prompt and its answer to start building this deck.
            </p>
            <Button
              className="mt-6"
              onClick={() => setDialogTarget({ mode: "create" })}
            >
              <Plus aria-hidden="true" />
              Create your first card
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardHeader>
                  <CardTitle>{card.prompt}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {card.answer}
                  </CardDescription>
                  <CardAction className="flex gap-1">
                    <Button
                      aria-label={`Edit ${card.prompt}`}
                      onClick={() => setDialogTarget({ mode: "edit", card })}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Delete ${card.prompt}`}
                      onClick={() => setConfirmingId(card.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  {confirmingId === card.id ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Delete this card?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          disabled={deletingId === card.id}
                          onClick={() => setConfirmingId(null)}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={deletingId === card.id}
                          onClick={() => void handleDelete(card)}
                          size="sm"
                          variant="destructive"
                        >
                          {deletingId === card.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(card.createdAt)}
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateFlashcardDialog
        card={dialogTarget?.mode === "edit" ? dialogTarget.card : undefined}
        deckId={deckId}
        onOpenChange={(open) => {
          if (!open) {
            setDialogTarget(null);
          }
        }}
        onSaved={() => void reload()}
        open={dialogTarget !== null}
      />

      <GenerateFromSourceDialog
        courseId={courseId}
        deckId={deckId}
        onOpenChange={setGenerateDialogOpen}
        onSaved={() => void reload()}
        open={generateDialogOpen}
      />
    </div>
  );
}
