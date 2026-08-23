"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  Layers,
  Pencil,
  Play,
  Plus,
  RefreshCw,
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
import { CreateDeckDialog } from "@/app/(workspace)/courses/_components/create-deck-dialog";
import { CreateSourceDialog } from "@/app/(workspace)/courses/_components/create-source-dialog";
import { CreateTopicDialog } from "@/app/(workspace)/courses/_components/create-topic-dialog";
import { getCourse } from "@/lib/db/repositories/course-repository";
import {
  deleteDeck,
  listDecksByCourse,
} from "@/lib/db/repositories/deck-repository";
import {
  deleteSource,
  listSourcesByCourse,
} from "@/lib/db/repositories/source-repository";
import {
  deleteTopic,
  listTopicsByCourse,
} from "@/lib/db/repositories/topic-repository";
import type { Course, Deck, Source, Topic } from "@/lib/db/schema";

type Status = "loading" | "ready" | "error";

type DialogTarget = { mode: "create" } | { mode: "edit"; topic: Topic };

type DeckDialogTarget = { mode: "create" } | { mode: "edit"; deck: Deck };

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

export function CourseWorkspace({ courseId }: { courseId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deckDialogTarget, setDeckDialogTarget] =
    useState<DeckDialogTarget | null>(null);
  const [confirmingDeckId, setConfirmingDeckId] = useState<string | null>(
    null
  );
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [confirmingSourceId, setConfirmingSourceId] = useState<string | null>(
    null
  );

  const fetchData = useCallback(async () => {
    const [nextCourse, nextTopics, nextDecks, nextSources] = await Promise.all([
      getCourse(courseId),
      listTopicsByCourse(courseId),
      listDecksByCourse(courseId),
      listSourcesByCourse(courseId),
    ]);
    return { course: nextCourse, topics: nextTopics, decks: nextDecks, sources: nextSources };
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then((data) => {
        if (cancelled) return;
        setCourse(data.course ?? null);
        setTopics(data.topics);
        setDecks(data.decks);
        setSources(data.sources);
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load this course."
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
      setTopics(data.topics);
      setDecks(data.decks);
      setSources(data.sources);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this course."
      );
    }
  }, [fetchData]);

  async function handleDelete(topic: Topic) {
    setError(null);
    try {
      await deleteTopic(topic.id);
      setConfirmingId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the topic."
      );
    }
  }

  async function handleDeleteDeck(deck: Deck) {
    setError(null);
    try {
      await deleteDeck(deck.id);
      setConfirmingDeckId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the deck."
      );
    }
  }

  async function handleDeleteSource(source: Source) {
    setError(null);
    try {
      await deleteSource(source.id);
      setConfirmingSourceId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the source."
      );
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
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
              <div className="mt-6 h-3 w-1/4 animate-pulse rounded bg-muted" />
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
            Couldn&apos;t load this course
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

  if (!course) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <FolderOpen aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            Course not found
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <Link
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/courses"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Courses
          </Link>
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Course workspace
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              {course.description}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </p>
          <Button onClick={() => setDialogTarget({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Add topic
          </Button>
        </div>

        {error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <FolderOpen aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold">
              No topics yet
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Break this course into focused topics so your study material stays
              organized.
            </p>
            <Button
              className="mt-6"
              onClick={() => setDialogTarget({ mode: "create" })}
            >
              <Plus aria-hidden="true" />
              Create your first topic
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.id}>
                <CardHeader>
                  <CardTitle>{topic.title}</CardTitle>
                  <CardAction className="flex gap-1">
                    <Button
                      aria-label={`Edit ${topic.title}`}
                      onClick={() => setDialogTarget({ mode: "edit", topic })}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Delete ${topic.title}`}
                      onClick={() => setConfirmingId(topic.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  {confirmingId === topic.id ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Delete this topic?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setConfirmingId(null)}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => void handleDelete(topic)}
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(topic.createdAt)}
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </p>
          <Button onClick={() => setSourceDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Add source
          </Button>
        </div>

        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <FolderOpen aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold">
              No sources yet
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Add study material as text or markdown to generate flashcards.
            </p>
            <Button
              className="mt-6"
              onClick={() => setSourceDialogOpen(true)}
            >
              <Plus aria-hidden="true" />
              Add your first source
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <CardTitle>{source.title}</CardTitle>
                  <CardDescription>
                    {source.type === "markdown"
                      ? "Markdown"
                      : source.type === "pdf"
                        ? "PDF"
                        : source.type === "url"
                          ? "URL"
                          : "Text"}
                  </CardDescription>
                  <CardAction className="flex gap-1">
                    <Button
                      aria-label={`Delete ${source.title}`}
                      onClick={() => setConfirmingSourceId(source.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  {confirmingSourceId === source.id ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Delete this source?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setConfirmingSourceId(null)}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => void handleDeleteSource(source)}
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Added {formatDate(source.createdAt)}
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </p>
          <Button onClick={() => setDeckDialogTarget({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Add deck
          </Button>
        </div>

        {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Layers aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-semibold">
              No decks yet
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Group related cards into decks so review sessions stay focused.
            </p>
            <Button
              className="mt-6"
              onClick={() => setDeckDialogTarget({ mode: "create" })}
            >
              <Plus aria-hidden="true" />
              Create your first deck
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((deck) => {
              const topic = topics.find((t) => t.id === deck.topicId);
              return (
                <Card key={deck.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        className="transition-colors hover:text-primary"
                        href={`/courses/${courseId}/decks/${deck.id}`}
                      >
                        {deck.title}
                      </Link>
                    </CardTitle>
                    {topic && (
                      <CardDescription>In {topic.title}</CardDescription>
                    )}
                    <CardAction className="flex gap-1">
                      <Link
                        aria-label={`Study ${deck.title}`}
                        className={cn(
                          buttonVariants({ size: "icon-sm", variant: "ghost" })
                        )}
                        href={`/study/${deck.id}`}
                      >
                        <Play aria-hidden="true" />
                      </Link>
                      <Button
                        aria-label={`Edit ${deck.title}`}
                        onClick={() =>
                          setDeckDialogTarget({ mode: "edit", deck })
                        }
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        aria-label={`Delete ${deck.title}`}
                        onClick={() => setConfirmingDeckId(deck.id)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardFooter>
                    {confirmingDeckId === deck.id ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Delete this deck?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setConfirmingDeckId(null)}
                            size="sm"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => void handleDeleteDeck(deck)}
                            size="sm"
                            variant="destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(deck.createdAt)}
                      </p>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateTopicDialog
        courseId={courseId}
        onOpenChange={(open) => {
          if (!open) {
            setDialogTarget(null);
          }
        }}
        onSaved={() => void reload()}
        open={dialogTarget !== null}
        topic={dialogTarget?.mode === "edit" ? dialogTarget.topic : undefined}
      />

      <CreateDeckDialog
        courseId={courseId}
        deck={
          deckDialogTarget?.mode === "edit" ? deckDialogTarget.deck : undefined
        }
        onOpenChange={(open) => {
          if (!open) {
            setDeckDialogTarget(null);
          }
        }}
        onSaved={() => void reload()}
        open={deckDialogTarget !== null}
        topics={topics}
      />

      <CreateSourceDialog
        courseId={courseId}
        onOpenChange={setSourceDialogOpen}
        onSaved={() => void reload()}
        open={sourceDialogOpen}
      />
    </div>
  );
}
