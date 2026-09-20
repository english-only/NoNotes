"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Layers,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fade, SHORT, motionForPreference } from "@/lib/motion";
import { getCourse } from "@/lib/db/repositories/course-repository";
import { getDeck } from "@/lib/db/repositories/deck-repository";
import { listFlashcardsByDeck } from "@/lib/db/repositories/flashcard-repository";
import {
  listDueFlashcardsByDeck,
  recordReview,
} from "@/lib/db/repositories/review-repository";
import {
  rate,
  reveal,
  startSession,
  type Rating,
  type StudySessionState,
} from "@/lib/study/session";
import type { Course, Deck, Flashcard } from "@/lib/db/schema";

type Status = "loading" | "ready" | "error";

const RATINGS: { value: Rating; label: string; hint: string; variant: "destructive" | "outline" | "default" | "secondary"; tone: string }[] = [
  { value: 1, label: "Again", hint: "Forgot it", variant: "destructive", tone: "text-destructive" },
  { value: 2, label: "Hard", hint: "Took effort", variant: "outline", tone: "text-warning" },
  { value: 3, label: "Good", hint: "Remembered", variant: "default", tone: "text-success" },
  { value: 4, label: "Easy", hint: "Too easy", variant: "secondary", tone: "text-info" },
];

export function StudySession({ deckId }: { deckId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [session, setSession] = useState<StudySessionState | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const revealButtonRef = useRef<HTMLButtonElement>(null);
  const firstRatingRef = useRef<HTMLButtonElement>(null);
  const didInteract = useRef(false);
  const revealedAtRef = useRef<number | null>(null);
  // Synchronous guard against double-rating: the `saving` state only settles
  // on the next render, so two keydown/click events within the same frame
  // could otherwise both pass the state check and rate the same card twice.
  const savingRef = useRef(false);

  const fetchData = useCallback(async () => {
    const [nextDeck, all, due] = await Promise.all([
      getDeck(deckId),
      listFlashcardsByDeck(deckId),
      listDueFlashcardsByDeck(deckId),
    ]);
    const nextCourse = nextDeck ? await getCourse(nextDeck.courseId) : undefined;
    return { deck: nextDeck, all, due, course: nextCourse };
  }, [deckId]);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then((data) => {
        if (cancelled) return;
        setDeck(data.deck ?? null);
        setCourse(data.course);
        setAllCards(data.all);
        setCards(data.due);
        setTotal(data.due.length);
        setSession(startSession(data.due.map((card) => card.id)));
        setError(null);
        setRateError(null);
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

  const reload = useCallback(async () => {
    try {
      const data = await fetchData();
      setDeck(data.deck ?? null);
      setCourse(data.course);
      setAllCards(data.all);
      setCards(data.due);
      setTotal(data.due.length);
      setSession(startSession(data.due.map((card) => card.id)));
      setError(null);
      setRateError(null);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this deck.");
    }
  }, [fetchData]);

  // "Study again": refetch the CURRENT due-card set from IndexedDB rather than
  // reusing the session's stale card list. Cards rated Good/Easy during the
  // session will have future dueAt values and correctly be excluded.
  const restart = useCallback(async () => {
    setRestarting(true);
    try {
      const [all, due] = await Promise.all([
        listFlashcardsByDeck(deckId),
        listDueFlashcardsByDeck(deckId),
      ]);
      setAllCards(all);
      setCards(due);
      setTotal(due.length);
      setSession(startSession(due.map((card) => card.id)));
    } finally {
      setRestarting(false);
    }
  }, [deckId]);

  const handleReveal = useCallback(() => {
    didInteract.current = true;
    revealedAtRef.current = Date.now();
    setSession((current) => (current ? reveal(current) : current));
  }, []);

  // Ratings persist before the session advances (persist first, advance
  // second): a failed write leaves the card at the front of the queue so the
  // user can retry instead of silently losing the rating.
  const handleRate = useCallback(
    (rating: Rating) => {
      const currentId = session?.currentId;
      if (!currentId || saving || savingRef.current) return;
      savingRef.current = true;
      didInteract.current = true;

      const reviewedAt = Date.now();
      const elapsedMs =
        revealedAtRef.current === null
          ? 0
          : Math.max(0, reviewedAt - revealedAtRef.current);
      revealedAtRef.current = null;

      setSaving(true);
      setRateError(null);
      recordReview({ flashcardId: currentId, rating, reviewedAt, elapsedMs })
        .then(() => {
          // Verify the card at the front of the queue still matches the one
          // we persisted. If the session advanced (e.g. through a different
          // code path or a stale closure), skip to avoid double-rating.
          setSession((current) => {
            if (!current || current.currentId !== currentId) return current;
            return rate(current, rating);
          });
        })
        .catch((err) => {
          setRateError(
            err instanceof Error
              ? err.message
              : "Could not save your rating. Please try again."
          );
        })
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
    },
    [session?.currentId, saving]
  );

  // Focus moves deliberately as the session advances: the reveal button on a
  // fresh card, the first rating button once the answer is shown. The first
  // render is skipped so focus is not stolen on load.
  useEffect(() => {
    if (!didInteract.current) return;
    if (session?.phase === "revealed") {
      firstRatingRef.current?.focus();
    } else if (session?.phase === "idle") {
      revealButtonRef.current?.focus();
    }
  }, [session?.phase, session?.currentId]);

  // Keyboard: Space/Enter reveals, 1-4 rates. Buttons always remain available
  // so the shortcuts are an accelerator, never the only interaction. The 1-4
  // ratings must work even while a rating button is focused (focus lands on
  // the buttons after reveal); only text fields are exempt. Space/Enter fall
  // through to a focused button's native activation to avoid double-firing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (session?.phase === "idle") {
        if (event.key === " " || event.key === "Enter") {
          if (tag === "BUTTON") return;
          event.preventDefault();
          handleReveal();
        }
      } else if (session?.phase === "revealed") {
        const index = ["1", "2", "3", "4"].indexOf(event.key);
        if (index !== -1) {
          event.preventDefault();
          handleRate((index + 1) as Rating);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session, handleReveal, handleRate]);

  const currentCard = cards.find((card) => card.id === session?.currentId);
  // Monotonic progress: number of unique cards rated at least once, never
  // decreases even when "Again" requeues a card.
  const progress =
    total === 0
      ? 0
      : Math.round(((session?.reviewedIds.size ?? 0) / total) * 100);

  const containerClassName =
    "mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12";

  if (status === "loading") {
    return (
      <div className={containerClassName}>
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
        <div className="mx-auto h-64 w-full animate-pulse rounded-2xl bg-card/30" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">
            Couldn&apos;t load this session
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

  if (!deck) {
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
            href="/study"
          >
            <ArrowLeft aria-hidden="true" />
            Back to study
          </Link>
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Layers aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            No cards yet
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            This deck needs at least one card before you can start a review
            session.
          </p>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
            href={`/courses/${deck.courseId}/decks/${deck.id}`}
          >
            <ArrowLeft aria-hidden="true" />
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    const nextDue = Math.min(...allCards.map((card) => card.dueAt));
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-success/20 bg-success/10 text-success">
            <CalendarClock aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            Nothing due right now
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            You&apos;ve reviewed all {allCards.length}{" "}
            {allCards.length === 1 ? "card" : "cards"} in this deck. The next
            one is due{" "}
            {new Date(nextDue).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
            href={`/courses/${deck.courseId}/decks/${deck.id}`}
          >
            <ArrowLeft aria-hidden="true" />
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  if (!session || session.phase === "complete") {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-success/20 bg-success/10 text-success">
            <CheckCircle2 aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            Session complete
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            You reviewed {total} due {total === 1 ? "card" : "cards"}. Come
            back later to refresh them.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void restart()} disabled={restarting}>
              <RotateCcw aria-hidden="true" className={cn(restarting && "animate-spin")} />
              {restarting ? "Checking…" : "Study again"}
            </Button>
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href={`/courses/${deck.courseId}/decks/${deck.id}`}
            >
              <ArrowLeft aria-hidden="true" />
              Back to deck
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <header className="flex flex-col gap-4">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href={`/courses/${deck.courseId}/decks/${deck.id}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {course?.title ?? "Deck"}
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Study session
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {deck.title}
            </h1>
          </div>
          <p
            aria-live="polite"
            className="text-sm tabular-nums text-muted-foreground"
          >
            {session.queue.length} {session.queue.length === 1 ? "card" : "cards"}{" "}
            left
          </p>
        </div>
        <div
          aria-hidden="true"
          className="h-1 w-full overflow-hidden rounded-full bg-muted/50"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-border/50 bg-card/40 p-6 transition-colors sm:p-10">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground/50 uppercase">
            {session.phase === "revealed" ? "Answer" : "Question"}
          </p>
          <p className="mt-4 font-heading text-xl leading-relaxed font-medium whitespace-pre-wrap sm:text-2xl">
            {currentCard?.prompt}
          </p>

          <AnimatePresence>
          {session.phase === "revealed" && (
            <motion.div
              key="answer"
              variants={fade}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={motionForPreference(SHORT)}
            >
              <div
                aria-hidden="true"
                className="my-6 h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent"
              />
              <p className="text-xs font-medium tracking-[0.16em] text-primary/70 uppercase">
                Answer
              </p>
              <p className="mt-4 text-base leading-relaxed whitespace-pre-wrap text-foreground/85">
                {currentCard?.answer}
              </p>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="mt-5">
          {session.phase === "idle" ? (
            <div className="flex flex-col items-center gap-3">
              <Button
                className="w-full sm:w-auto sm:min-w-56"
                onClick={handleReveal}
                ref={revealButtonRef}
                size="lg"
              >
                Show answer
              </Button>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.7rem]">Space</kbd> to reveal
              </p>
            </div>
          ) : (
            <div>
              {rateError && (
                <p
                  aria-live="polite"
                  className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive"
                >
                  {rateError}
                </p>
              )}
              <div
                aria-busy={saving}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
              >
                {RATINGS.map((item, index) => (
                  <Button
                    aria-keyshortcuts={String(item.value)}
                    className="flex h-auto flex-col gap-0.5 py-3 transition-all duration-150"
                    disabled={saving}
                    key={item.value}
                    onClick={() => handleRate(item.value)}
                    ref={index === 0 ? firstRatingRef : undefined}
                    size="lg"
                    variant={item.variant}
                  >
                    <span>{item.label}</span>
                    <span className={cn("text-xs font-normal", item.tone, "opacity-60")}>
                      {item.hint}
                    </span>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Press{" "}
                <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.7rem]">1</kbd>–
                <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.7rem]">4</kbd>{" "}
                to rate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
