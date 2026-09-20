"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary for the workspace.
 *
 * Next 16 App Router convention: client component receiving `error` and
 * `retry` (Next 16 renamed the old `reset` prop to `retry`, which both
 * re-fetches and re-renders the segment).
 */
export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Detailed context stays in the console; the UI below stays generic so no
    // sensitive internals leak to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while loading this page. Your study data
        is stored locally and is safe. Try again, or reload the app if the
        problem persists.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground/70">
          Error ID: {error.digest}
        </p>
      ) : null}
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
