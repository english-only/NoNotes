"use client";

import { BookOpen, Brain, Layers, LayoutDashboard, NotebookPen, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A composed snapshot of the NoNotes app using real design tokens — a study
 * card, rating controls, a small sidebar, and progress. No stock imagery.
 */
export function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-4xl"
      data-product-preview
    >
      {/* Ambient glow (landing only) */}
      <div className="absolute -inset-x-8 -top-10 -bottom-10 rounded-full bg-primary/10 blur-3xl" />

      {/* Window / app frame */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
        {/* Fake window chrome */}
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 text-xs font-mono text-muted-foreground/70">
            nonotes · Study
          </span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-40 flex-col gap-1 border-r border-border/50 p-3 sm:flex">
            <div className="mb-2 flex items-center gap-2 px-1">
              <div className="flex size-6 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
                <NotebookPen aria-hidden="true" className="size-3 text-primary" />
              </div>
              <span className="font-heading text-xs font-semibold">NoNotes</span>
            </div>
            {[
              { icon: LayoutDashboard, label: "Dashboard" },
              { icon: Layers, label: "Courses" },
              { icon: BookOpen, label: "Study", active: true },
              { icon: Brain, label: "Feynman" },
            ].map(({ icon: Icon, label, active }) => (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground"
                )}
                key={label}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
              </div>
            ))}
          </div>

          {/* Main study area */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Progress row */}
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Search aria-hidden="true" className="size-3" />
                Cmd+K
              </span>
              <span className="tabular-nums">3 of 12</span>
            </div>

            {/* Flashcard */}
            <div className="rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6">
              <span className="text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
                Biology · Photosynthesis
              </span>
              <p className="mt-3 font-heading text-sm font-medium sm:text-base">
                What role does chlorophyll play in photosynthesis?
              </p>
              <div className="mt-4 rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground sm:text-sm">
                Chlorophyll absorbs light energy — primarily in the red and blue
                wavelengths — to drive the light-dependent reactions.
              </div>
            </div>

            {/* Rating buttons */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { label: "Again", tone: "border-destructive/40 text-destructive" },
                { label: "Hard", tone: "border-amber-500/40 text-amber-300" },
                { label: "Good", tone: "border-emerald-500/40 text-emerald-300" },
                { label: "Easy", tone: "border-cyan-500/40 text-cyan-200" },
              ].map(({ label, tone }) => (
                <div
                  className={cn(
                    "rounded-lg border border-border/60 bg-card py-2 text-center text-xs font-medium",
                    tone
                  )}
                  key={label}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Source chip */}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Generated from &ldquo;Lecture 4 – Photosynthesis&rdquo;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}