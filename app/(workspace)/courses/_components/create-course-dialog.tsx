"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
  createCourse,
  updateCourse,
} from "@/lib/db/repositories/course-repository";
import type { Course } from "@/lib/db/schema";

type CreateCourseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this course instead of creating one. */
  course?: Course;
  onSaved: (createdId?: string) => void;
};

export function CreateCourseDialog({
  open,
  onOpenChange,
  course,
  onSaved,
}: CreateCourseDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  // Reset the form on every open transition so stale values never leak
  // between create/edit targets or between successive opens.
  if (open && !wasOpen) {
    setTitle(course?.title ?? "");
    setDescription(course?.description ?? "");
    setError(null);
    setSaving(false);
    setCreatedCourseId(null);
  }
  if (wasOpen !== open) {
    setWasOpen(open);
  }

  const editing = course !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (course) {
        await updateCourse(course.id, { title, description });
        onSaved();
        onOpenChange(false);
      } else {
        const created = await createCourse({ title, description });
        setCreatedCourseId(created.id);
        onSaved(created.id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the course."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "Create course"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the course details."
              : "Give this subject a name so your study material stays organized."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="course-title">
              Title
            </label>
            <Input
              autoFocus
              disabled={saving}
              id="course-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Organic Chemistry"
              required
              value={title}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="course-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              disabled={saving}
              id="course-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will you be studying in this course?"
              rows={3}
              value={description}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {createdCourseId ? (
            <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-emerald-300">
                Course created!
              </p>
              <p className="text-xs text-muted-foreground">
                Now add topics, sources, and decks to start building your study
                material.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Close
                </Button>
                <Link
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "inline-flex items-center gap-1.5",
                  )}
                  href={`/courses/${createdCourseId}`}
                >
                  Open course
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
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
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create course"}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
