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
  createTopic,
  updateTopic,
} from "@/lib/db/repositories/topic-repository";
import type { Topic } from "@/lib/db/schema";

type CreateTopicDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** When provided, the dialog edits this topic instead of creating one. */
  topic?: Topic;
  onSaved: () => void;
};

export function CreateTopicDialog({
  open,
  onOpenChange,
  courseId,
  topic,
  onSaved,
}: CreateTopicDialogProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the form on every open transition so stale values never leak
  // between create/edit targets or between successive opens.
  if (open && !wasOpen) {
    setTitle(topic?.title ?? "");
    setError(null);
    setSaving(false);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  const editing = topic !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (topic) {
        await updateTopic(topic.id, { title });
      } else {
        await createTopic({ courseId, title });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the topic."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit topic" : "Create topic"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the topic name."
              : "Break this course down into focused topics to study."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="topic-title">
              Title
            </label>
            <Input
              autoFocus
              disabled={saving}
              id="topic-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Cellular Respiration"
              required
              value={title}
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
              {saving ? "Saving…" : editing ? "Save changes" : "Create topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
