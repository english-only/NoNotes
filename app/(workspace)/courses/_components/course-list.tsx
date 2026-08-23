"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateCourseDialog } from "@/app/(workspace)/courses/_components/create-course-dialog";
import {
  deleteCourse,
  listCourses,
} from "@/lib/db/repositories/course-repository";
import type { Course } from "@/lib/db/schema";

type Status = "loading" | "ready" | "error";

type DialogTarget = { mode: "create" } | { mode: "edit"; course: Course };

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

export function CourseList() {
  const [status, setStatus] = useState<Status>("loading");
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchCourses = useCallback(() => listCourses(), []);

  useEffect(() => {
    let cancelled = false;
    fetchCourses()
      .then((next) => {
        if (cancelled) return;
        setCourses(next);
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load your courses."
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCourses]);

  // Re-fetch after a mutation (delete or retry). Safe to call from event
  // handlers; the mount path above owns the initial load.
  const reload = useCallback(async () => {
    try {
      const next = await fetchCourses();
      setCourses(next);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your courses."
      );
    }
  }, [fetchCourses]);

  async function handleDelete(course: Course) {
    setError(null);
    try {
      await deleteCourse(course.id);
      setConfirmingId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the course."
      );
    }
  }

  if (status === "loading") {
    return (
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
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">
          Couldn&apos;t load your courses
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </p>
        <Button onClick={() => setDialogTarget({ mode: "create" })}>
          <Plus aria-hidden="true" />
          Create course
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

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-semibold">
            No courses yet
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Create a course to give each subject a home for your study
            material.
          </p>
          <Button
            className="mt-6"
            onClick={() => setDialogTarget({ mode: "create" })}
          >
            <Plus aria-hidden="true" />
            Create your first course
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <CardTitle>
                  <Link
                    className="transition-colors hover:text-primary"
                    href={`/courses/${course.id}`}
                  >
                    {course.title}
                  </Link>
                </CardTitle>
                {course.description && (
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                )}
                <CardAction className="flex gap-1">
                  <Button
                    aria-label={`Edit ${course.title}`}
                    onClick={() =>
                      setDialogTarget({ mode: "edit", course })
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`Delete ${course.title}`}
                    onClick={() => setConfirmingId(course.id)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardFooter>
                {confirmingId === course.id ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Delete this course?
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
                        onClick={() => void handleDelete(course)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(course.updatedAt)}
                  </p>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateCourseDialog
        course={dialogTarget?.mode === "edit" ? dialogTarget.course : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setDialogTarget(null);
          }
        }}
        onSaved={() => void reload()}
        open={dialogTarget !== null}
      />
    </div>
  );
}
