"use client";

import { useCallback, useEffect, startTransition, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isProviderConfigured, getActiveProviderLabel } from "@/lib/ai/config";
import { capChunksToBudget } from "@/lib/ai/context-budget";
import { listCourses } from "@/lib/db/repositories/course-repository";
import { listSourcesByCourse } from "@/lib/db/repositories/source-repository";
import { listChunksBySource } from "@/lib/db/repositories/chunk-repository";
import {
  createFeynmanAttempt,
  listFeynmanAttemptsByCourse,
} from "@/lib/db/repositories/feynman-repository";
import type { Course, FeynmanAttempt, Source, FeynmanFeedback } from "@/lib/db/schema";

type Status = "idle" | "evaluating" | "done" | "error";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-3">
      <p className="w-24 text-sm text-muted-foreground">{label}</p>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct >= 70
              ? "bg-success"
              : pct >= 40
                ? "bg-warning"
                : "bg-destructive"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="w-10 text-right text-sm tabular-nums text-muted-foreground/70">
        {pct}%
      </p>
    </div>
  );
}

export function FeynmanEvaluation() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [sourceTruncated, setSourceTruncated] = useState(false);
  const [history, setHistory] = useState<FeynmanAttempt[]>([]);

  // Load courses on mount
  useEffect(() => {
    startTransition(async () => {
      const c = await listCourses();
      setCourses(c);
      if (c.length > 0) setSelectedCourseId(c[0].id);
    });
  }, []);

  // Load history when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      startTransition(() => {
        setHistory([]);
      });
      return;
    }
    startTransition(async () => {
      const h = await listFeynmanAttemptsByCourse(selectedCourseId);
      setHistory(h.reverse()); // newest first
    });
  }, [selectedCourseId]);

  // Load sources when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      startTransition(() => {
        setSources([]);
        setSelectedSourceId("");
      });
      return;
    }
    startTransition(async () => {
      const s = await listSourcesByCourse(selectedCourseId);
      setSources(s);
      setSelectedSourceId("");
    });
  }, [selectedCourseId]);

  const canSubmit =
    selectedCourseId &&
    concept.trim().length > 0 &&
    explanation.trim().length > 0 &&
    status !== "evaluating";

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (!isProviderConfigured()) {
      setApiKeyMissing(true);
      return;
    }

    setStatus("evaluating");
    setError(null);
    setApiKeyMissing(false);
    setSourceTruncated(false);
    setFeedback(null);

    try {
      // Gather source chunks for grounding, tracking IDs for provenance
      let chunks: { ordinal: number; content: string }[] = [];
      let chunkIds: string[] = [];
      if (selectedSourceId) {
        const sourceChunks = await listChunksBySource(selectedSourceId);
        // Cap the grounding context so a huge source cannot overflow the
        // model's context window or burn the user's token quota.
        const capped = capChunksToBudget(
          sourceChunks.map((c) => ({
            ordinal: c.ordinal,
            content: c.content,
          }))
        );
        chunks = capped.chunks;
        chunkIds = sourceChunks
          .filter((c) => capped.chunks.some((kept) => kept.ordinal === c.ordinal))
          .map((c) => c.id);
        if (capped.truncated) {
          setSourceTruncated(true);
        }
      } else {
        // Use all sources for the course
        const allSources = await listSourcesByCourse(selectedCourseId);
        for (const src of allSources.slice(0, 5)) {
          const srcChunks = await listChunksBySource(src.id);
          chunks.push(
            ...srcChunks.map((c) => ({ ordinal: c.ordinal, content: c.content }))
          );
          chunkIds.push(...srcChunks.map((c) => c.id));
        }
        // Limit total chunks to avoid oversized prompts
        chunks = chunks.slice(0, 20);
        chunkIds = chunkIds.slice(0, 20);
      }

      if (chunks.length === 0) {
        throw new Error(
          "No source material available. Add a source with content first."
        );
      }

      const course = courses.find((c) => c.id === selectedCourseId);

      // Dynamic import keeps the @google/genai + zod chunk (~615KB) out of the
      // eager bundle of /feynman; it loads on first evaluation only.
      const { evaluateExplanation } = await import("@/lib/ai/registry");

      const result = await evaluateExplanation({
        chunks,
        concept: concept.trim(),
        explanation: explanation.trim(),
        courseTitle: course?.title ?? "Course",
      });

      // Persist the attempt with correct source chunk provenance
      await createFeynmanAttempt({
        courseId: selectedCourseId,
        deckId: undefined,
        concept: concept.trim(),
        explanation: explanation.trim(),
        feedback: result,
        sourceChunkIds: chunkIds,
      });

      setFeedback(result);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Evaluation failed. Please try again."
      );
      setStatus("error");
    }
  }, [
    canSubmit,
    selectedCourseId,
    selectedSourceId,
    concept,
    explanation,
    courses,
  ]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setFeedback(null);
    setError(null);
  }, []);

  const containerClassName =
    "mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12";

  return (
    <div className={containerClassName}>
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <Link
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/dashboard"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Dashboard
          </Link>
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Feynman technique
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Explain it simply.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Choose a concept, explain it in your own words, and get structured
            feedback grounded in your source material.
          </p>
        </div>
      </section>

      {/* Input form */}
      {status !== "done" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="course-select"
              >
                Course
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                id="course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {courses.length === 0 && (
                  <option value="">No courses available</option>
                )}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="source-select"
              >
                Source (optional)
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                id="source-select"
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
              >
                <option value="">All available sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="concept-input"
            >
              Concept to explain
            </label>
            <Input
              id="concept-input"
              placeholder="e.g., Photosynthesis, Supply and demand, TCP/IP"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="explanation-input"
            >
              Your explanation
            </label>
            <Textarea
              id="explanation-input"
              className="min-h-[160px] resize-y"
              placeholder="Explain this concept in your own words, as if teaching someone who has never studied it..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {explanation.length > 0
                ? `${explanation.split(/\s+/).filter(Boolean).length} words`
                : "Write as much or as little as you want."}
            </p>
          </div>

          {apiKeyMissing && (
            <div
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300"
              role="alert"
            >
              Please connect an AI provider ({getActiveProviderLabel()}) in{" "}
              <Link className="underline" href="/settings">
                Settings
              </Link>{" "}
              first.
            </div>
          )}

          {error && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {sourceTruncated && (
            <div
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300"
              role="status"
            >
              Source truncated for generation — only the beginning of the
              selected source fits the prompt budget.
            </div>
          )}

          <Button
            className="w-full sm:w-auto sm:min-w-48"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            size="lg"
          >
            {status === "evaluating" ? (
              <>
                <Sparkles aria-hidden="true" className="animate-spin" />
                Evaluating…
              </>
            ) : (
              <>
                <Send aria-hidden="true" />
                Evaluate
              </>
            )}
          </Button>
        </div>
      )}

      {/* Feedback display */}
      {status === "done" && feedback && (
        <div className="flex flex-col gap-6">
          {sourceTruncated && (
            <div
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300"
              role="status"
            >
              Source truncated for generation — the evaluation was grounded in
              only the beginning of the selected source.
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-5 text-emerald-400"
                />
                Evaluation complete
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Scores */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Scores
                </p>
                <ScoreBar label="Correctness" score={feedback.correctness} />
                <ScoreBar
                  label="Completeness"
                  score={feedback.completeness}
                />
                <ScoreBar label="Clarity" score={feedback.clarity} />
              </div>

              <Separator />

              {/* Summary */}
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Summary
                </p>
                <p className="mt-2 text-base leading-relaxed text-foreground/90">
                  {feedback.summary}
                </p>
              </div>

              {/* Misconceptions */}
              {feedback.misconceptions.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    Misconceptions
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {feedback.misconceptions.map((m, i) => (
                      <li
                        className="flex items-start gap-2 text-sm text-foreground/80"
                        key={i}
                      >
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing concepts */}
              {feedback.missingConcepts.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    Missing concepts
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {feedback.missingConcepts.map((m, i) => (
                      <li
                        className="flex items-start gap-2 text-sm text-foreground/80"
                        key={i}
                      >
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-cyan-400" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Corrections */}
              {feedback.corrections.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    Corrections
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {feedback.corrections.map((c, i) => (
                      <li
                        className="flex items-start gap-2 text-sm text-foreground/80"
                        key={i}
                      >
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Improvement */}
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <Lightbulb
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-amber-300"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Improvement suggestion
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {feedback.improvement}
                  </p>
                </div>
              </div>

              {/* Follow-up */}
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <MessageSquare
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Follow-up question
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {feedback.followUp}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw aria-hidden="true" />
              Try another explanation
            </Button>
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href="/dashboard"
            >
              <ArrowLeft aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 && status === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-semibold">
            No courses yet
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Create a course and add source material before using the Feynman
            technique.
          </p>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
            href="/courses"
          >
            <ArrowLeft aria-hidden="true" />
            Go to courses
          </Link>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Recent attempts
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {history.slice(0, 10).map((attempt) => (
              <div
                className="border border-border/80 bg-card/60 p-4"
                key={attempt.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {attempt.concept}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {attempt.explanation}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs tabular-nums text-muted-foreground">
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
                      {Math.round(attempt.feedback.correctness * 100)}%
                    </span>
                    <span>
                      {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                {attempt.feedback.missingConcepts.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Missing: {attempt.feedback.missingConcepts.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
