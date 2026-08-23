"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  createFlashcard,
  updateFlashcard,
} from "@/lib/db/repositories/flashcard-repository";
import type { Flashcard } from "@/lib/db/schema";

type CreateFlashcardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  /** When provided, the dialog edits this card instead of creating one. */
  card?: Flashcard;
  onSaved: () => void;
};

export function CreateFlashcardDialog({
  open,
  onOpenChange,
  deckId,
  card,
  onSaved,
}: CreateFlashcardDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the form on every open transition so stale values never leak
  // between create/edit targets or between successive opens.
  if (open && !wasOpen) {
    setPrompt(card?.prompt ?? "");
    setAnswer(card?.answer ?? "");
    setError(null);
    setSaving(false);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  const editing = card !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (card) {
        await updateFlashcard(card.id, { prompt, answer });
      } else {
        await createFlashcard({ deckId, prompt, answer });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the card."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit card" : "Create card"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the prompt and answer."
              : "Write a question on the front and its answer on the back."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="card-prompt">
              Prompt
            </label>
            <Textarea
              autoFocus
              disabled={saving}
              id="card-prompt"
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. What does ATP stand for?"
              required
              rows={3}
              value={prompt}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="card-answer">
              Answer
            </label>
            <Textarea
              disabled={saving}
              id="card-answer"
              maxLength={2000}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="e.g. Adenosine triphosphate — the cell's energy currency."
              required
              rows={4}
              value={answer}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={saving} type="submit">
              {saving ? "Saving…" : editing ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
