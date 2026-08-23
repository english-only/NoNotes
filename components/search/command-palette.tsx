"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { Search, FileText, BookOpen, Layers, Brain, Hash, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { search as searchIndex, rebuildIndex, onIndexChange } from "@/lib/search/index";
import type { SearchResult } from "@/lib/search/types";
import { Button } from "@/components/ui/button";

/** Map result type to icon. */
const TYPE_ICONS: Record<SearchResult["type"], typeof Search> = {
  course: BookOpen,
  topic: Layers,
  deck: Brain,
  flashcard: Hash,
  source: FileText,
  chunk: FileText,
};

/** Map result type to display label. */
const TYPE_LABELS: Record<SearchResult["type"], string> = {
  course: "Course",
  topic: "Topic",
  deck: "Deck",
  flashcard: "Flashcard",
  source: "Source",
  chunk: "Chunk",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Build index on mount and subscribe to changes
  useEffect(() => {
    void rebuildIndex();
    const unsub = onIndexChange(() => {
      void rebuildIndex();
    });
    return unsub;
  }, []);

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened + global Escape handler
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      function handleGlobalEscape(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        }
      }
      document.addEventListener("keydown", handleGlobalEscape);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("keydown", handleGlobalEscape);
      };
    }
    // Reset state when closed
    startTransition(() => {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    });
  }, [open]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      startTransition(() => {
        setResults([]);
        setSelectedIndex(0);
      });
      return;
    }

    startTransition(() => {
      setLoading(true);
    });
    // Debounce search
    const timer = setTimeout(() => {
      void searchIndex(query).then((r) => {
        startTransition(() => {
          setResults(r);
          setSelectedIndex(0);
          setLoading(false);
        });
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      router.push(result.href);
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigateTo(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [results, selectedIndex, navigateTo],
  );

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) {
    return (
      <Button
        aria-label="Open search"
        className="flex items-center gap-2 border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50"
        onClick={() => setOpen(true)}
        variant="ghost"
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border border-border/70 bg-card shadow-2xl"
        role="dialog"
        aria-label="Search"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            aria-label="Search"
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, decks, flashcards..."
            type="text"
            value={query}
          />
          {loading && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((result, i) => {
            const Icon = TYPE_ICONS[result.type];
            return (
              <button
                key={`${result.type}-${result.id}`}
                aria-selected={i === selectedIndex}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  i === selectedIndex ? "bg-accent/50" : "hover:bg-muted/30"
                }`}
                onClick={() => navigateTo(result)}
                onMouseEnter={() => setSelectedIndex(i)}
                role="option"
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">
                      {result.title}
                    </span>
                    <span className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </div>
                  {result.excerpt && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {result.excerpt}
                    </p>
                  )}
                  {result.parent && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      in {result.parent.title}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        {query.trim() && results.length > 0 && (
          <div className="border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} · ↑↓ navigate · ↵ select · esc close
          </div>
        )}
      </div>
    </>
  );
}
