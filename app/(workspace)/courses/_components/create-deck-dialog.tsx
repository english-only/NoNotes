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
import { Input } from "@/components/ui/input";
import {
  createDeck,
  updateDeck,
} from "@/lib/db/repositories/deck-repository";
import type { Deck, Topic } from "@/lib/db/schema";

type CreateDeckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** Topics of the current course, used for the optional topic selector. */
  topics: Topic[];
  /** When provided, the dialog edits this deck instead of creating one. */
  deck?: Deck;
  onSaved: () => void;
};

export function CreateDeckDialog({
  open,
  onOpenChange,
  courseId,
  topics,
  deck,
  onSaved,
}: CreateDeckDialogProps) {
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the form on every open transition so stale values never leak
  // between create/edit targets or between successive opens.
  if (open && !wasOpen) {
    setTitle(deck?.title ?? "");
    setTopicId(deck?.topicId ?? "");
    setError(null);
    setSaving(false);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  const editing = deck !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // An empty selection means "no topic" (course-level deck). When editing,
      // the topicId key is always present so an explicit empty value removes
      // an existing topic association.
      const nextTopicId = topicId || undefined;
      if (deck) {
        await updateDeck(deck.id, { title, topicId: nextTopicId });
      } else {
        await createDeck({ courseId, title, topicId: nextTopicId });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the deck.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit deck" : "Create deck"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the deck name and topic."
              : "Group related cards into a deck so review sessions stay focused."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="deck-title">
              Title
            </label>
            <Input
              autoFocus
              disabled={saving}
              id="deck-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Cell organelles"
              required
              value={title}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="deck-topic">
              Topic{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              disabled={saving}
              id="deck-topic"
              onChange={(event) => setTopicId(event.target.value)}
              value={topicId}
            >
              <option value="">No topic (course-level)</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
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
              {saving ? "Saving…" : editing ? "Save changes" : "Create deck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
