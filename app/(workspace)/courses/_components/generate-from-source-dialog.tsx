"use client";

import { useCallback, useEffect, startTransition, useState } from "react";
import { Check, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GeminiProvider } from "@/lib/ai/gemini";
import {
  generateFromSource,
  persistAcceptedCards,
} from "@/lib/ai/generation";
import { getApiKey, hasApiKey } from "@/lib/ai/provider";
import { listSourcesByCourse } from "@/lib/db/repositories/source-repository";
import { listChunksBySource } from "@/lib/db/repositories/chunk-repository";
import type { Source } from "@/lib/db/schema";

type GenerateFromSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  deckId: string;
  onSaved: () => void;
};

type Step = "select" | "generating" | "review" | "persisting" | "done";

type ReviewCard = {
  prompt: string;
  answer: string;
  sourceChunkIds: string[];
  accepted: boolean;
  editing: boolean;
};

export function GenerateFromSourceDialog({
  open,
  onOpenChange,
  courseId,
  deckId,
  onSaved,
}: GenerateFromSourceDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [cardCount, setCardCount] = useState(5);
  const [chunkInfo, setChunkInfo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset on open
  if (open && !wasOpen) {
    setStep("select");
    setSelectedSourceId("");
    setCardCount(5);
    setChunkInfo("");
    setError(null);
    setReviewCards([]);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  // Load sources when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      const s = await listSourcesByCourse(courseId);
      if (!cancelled) setSources(s);
    });
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  // Update chunk info when source is selected
  useEffect(() => {
    let cancelled = false;
    if (!selectedSourceId) {
      startTransition(() => {
        if (!cancelled) setChunkInfo("");
      });
      return () => {
        cancelled = true;
      };
    }
    startTransition(async () => {
      const chunks = await listChunksBySource(selectedSourceId);
      if (!cancelled) {
        const totalLength = chunks.reduce((sum, c) => sum + c.content.length, 0);
        setChunkInfo(
          `${chunks.length} chunks, ~${Math.round(totalLength / 1000)}k characters`
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSourceId]);

  const handleGenerate = useCallback(async () => {
    if (!hasApiKey()) {
      setError("Please set your Gemini API key in Settings first.");
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) return;

    const provider = new GeminiProvider(apiKey);
    setStep("generating");
    setError(null);

    try {
      const result = await generateFromSource({
        provider,
        sourceId: selectedSourceId,
        deckId,
        cardCount,
      });

      setReviewCards(
        result.flashcards.map((c) => ({
          prompt: c.prompt,
          answer: c.answer,
          sourceChunkIds: c.sourceChunkIds,
          accepted: true,
          editing: false,
        }))
      );
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Generation failed. Please try again."
      );
      setStep("select");
    }
  }, [selectedSourceId, deckId, cardCount]);

  const handlePersist = useCallback(async () => {
    setStep("persisting");
    setError(null);

    try {
      const accepted = reviewCards
        .filter((c) => c.accepted)
        .map((c) => ({
          prompt: c.prompt,
          answer: c.answer,
          sourceChunkIds: c.sourceChunkIds,
        }));

      await persistAcceptedCards(deckId, accepted);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save cards. Please try again."
      );
      setStep("review");
    }
  }, [reviewCards, deckId, onSaved, onOpenChange]);

  const toggleCard = useCallback((index: number) => {
    setReviewCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, accepted: !c.accepted } : c))
    );
  }, []);

  const toggleEdit = useCallback((index: number) => {
    setReviewCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, editing: !c.editing } : c))
    );
  }, []);

  const updateCard = useCallback(
    (index: number, field: "prompt" | "answer", value: string) => {
      setReviewCards((prev) =>
        prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const removeCard = useCallback((index: number) => {
    setReviewCards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const acceptedCount = reviewCards.filter((c) => c.accepted).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-5 text-primary" />
            Generate from source
          </DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Select a source material and how many flashcards to generate."}
            {step === "generating" && "Generating flashcards with AI..."}
            {step === "review" &&
              "Review, edit, or reject generated cards before saving."}
            {step === "persisting" && "Saving accepted cards..."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="flex flex-col gap-4">
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sources available. Add source material to this course first.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="source-select">
                    Source material
                  </label>
                  <select
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    id="source-select"
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                    value={selectedSourceId}
                  >
                    <option value="">Select a source...</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.type})
                      </option>
                    ))}
                  </select>
                  {chunkInfo && (
                    <p className="text-xs text-muted-foreground">{chunkInfo}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="card-count">
                    Number of flashcards
                  </label>
                  <Input
                    id="card-count"
                    max={30}
                    min={1}
                    onChange={(e) =>
                      setCardCount(
                        Math.max(1, Math.min(30, Number(e.target.value) || 1))
                      )
                    }
                    type="number"
                    value={cardCount}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                disabled={!selectedSourceId || sources.length === 0}
                onClick={() => void handleGenerate()}
              >
                <Sparkles aria-hidden="true" />
                Generate
              </Button>
            </DialogFooter>
          </div>
        )}

        {(step === "generating" || step === "persisting") && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2
              aria-hidden="true"
              className="size-8 animate-spin text-primary"
            />
            <p className="text-sm text-muted-foreground">
              {step === "generating"
                ? `Generating ${cardCount} flashcards from source material...`
                : "Saving accepted cards..."}
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
            {reviewCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cards were generated. Try again with different settings.
              </p>
            ) : (
              reviewCards.map((card, index) => (
                <div
                  className="rounded-lg border border-border/80 bg-card/60 p-3"
                  key={index}
                >
                  <div className="flex items-start gap-3">
                    <Button
                      aria-label={card.accepted ? "Reject card" : "Accept card"}
                      className="mt-0.5 shrink-0"
                      onClick={() => toggleCard(index)}
                      size="icon-sm"
                      variant={card.accepted ? "default" : "outline"}
                    >
                      {card.accepted ? (
                        <Check aria-hidden="true" className="size-3" />
                      ) : (
                        <span className="size-3" />
                      )}
                    </Button>
                    <div className="min-w-0 flex-1">
                      {card.editing ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            aria-label="Edit prompt"
                            className="text-sm"
                            value={card.prompt}
                            onChange={(e) =>
                              updateCard(index, "prompt", e.target.value)
                            }
                          />
                          <Textarea
                            aria-label="Edit answer"
                            className="min-h-[80px] text-sm"
                            value={card.answer}
                            onChange={(e) =>
                              updateCard(index, "answer", e.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">{card.prompt}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {card.answer}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        aria-label="Edit card"
                        onClick={() => toggleEdit(index)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-3" />
                      </Button>
                      <Button
                        aria-label="Remove card"
                        onClick={() => removeCard(index)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <p className="mr-auto text-sm text-muted-foreground">
                {acceptedCount} of {reviewCards.length} selected
              </p>
              <Button disabled={acceptedCount === 0} onClick={() => void handlePersist()}>
                <Check aria-hidden="true" />
                Accept {acceptedCount} cards
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
