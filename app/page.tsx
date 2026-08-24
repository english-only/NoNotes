import Link from "next/link";
import { ArrowUpRight, BookOpen, Brain, Layers, NotebookPen, Search, Shield } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <NotebookPen aria-hidden="true" className="size-4 text-primary" />
            </div>
            <span className="font-heading text-base font-semibold tracking-tight">
              NoNotes
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href="/courses"
            >
              Get started
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="app-backdrop">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pb-40 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <Shield aria-hidden="true" className="size-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Local-first · Private · Offline-ready
              </span>
            </div>
            <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl sm:leading-[1.1] lg:text-6xl">
              Study with{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent-foreground bg-clip-text text-transparent">
                intention
              </span>
              , not repetition.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              NoNotes transforms your study material into active-recall practice.
              AI-generated flashcards, source-grounded feedback, and
              scientifically-optimized scheduling — all running locally on your
              machine.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-6 text-base",
                )}
                href="/courses"
              >
                <BookOpen aria-hidden="true" />
                Start your first course
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-6 text-base",
                )}
                href="/dashboard"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Core Loop */}
        <section className="border-t border-border/30 bg-card/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                How it works
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                From material to mastery.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                A complete learning loop backed by cognitive science — not
                another flashcard app.
              </p>
            </div>

            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Ingest",
                  detail:
                    "Drop in PDFs, paste notes, or link web pages. Everything is chunked and stored locally.",
                  icon: Layers,
                },
                {
                  step: "02",
                  title: "Generate",
                  detail:
                    "AI creates flashcards from your material. Review, edit, and accept only what's useful.",
                  icon: Brain,
                },
                {
                  step: "03",
                  title: "Recall",
                  detail:
                    "Work from memory first. Reveal the answer, then rate how well you knew it.",
                  icon: NotebookPen,
                },
                {
                  step: "04",
                  title: "Retain",
                  detail:
                    "FSRS schedules each review at the optimal moment — just before you'd forget.",
                  icon: BookOpen,
                },
              ].map(({ step, title, detail, icon: Icon }) => (
                <div
                  className="flex flex-col gap-4 bg-card p-6 sm:p-8"
                  key={step}
                >
                  <span className="text-xs font-medium tabular-nums text-primary">
                    {step}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className="size-8 text-muted-foreground/60"
                  />
                  <div>
                    <h3 className="font-heading text-lg font-semibold">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Features
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Everything you need to actually remember.
            </h2>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Source-grounded AI",
                detail:
                  "Every generated card and evaluation is anchored to your actual source material — no hallucinated facts.",
                icon: Brain,
              },
              {
                title: "FSRS scheduling",
                detail:
                  "The same algorithm powering modern SRS apps. Review each card at the statistically optimal moment.",
                icon: BookOpen,
              },
              {
                title: "Feynman evaluation",
                detail:
                  "Explain a concept in your own words. AI checks your understanding against the source and gives structured feedback.",
                icon: NotebookPen,
              },
              {
                title: "Full-text search",
                detail:
                  "Find anything instantly — courses, topics, decks, cards, sources, and chunks. Cmd+K from anywhere.",
                icon: Search,
              },
              {
                title: "Local-first privacy",
                detail:
                  "Everything lives in your browser. No cloud account, no server uploads. Your data stays on your machine.",
                icon: Shield,
              },
              {
                title: "Import & export",
                detail:
                  "Full JSON export of all your data. Import into a fresh browser. Your study material is never locked in.",
                icon: Layers,
              },
            ].map(({ title, detail, icon: Icon }) => (
              <div
                className="rounded-xl border border-border/60 bg-card/40 p-6"
                key={title}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5 text-primary"
                />
                <h3 className="mt-4 font-heading text-base font-semibold">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/[0.04] p-8 text-center sm:p-12">
              <h2 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Your material remembers you.
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                No accounts, no servers, no lock-in. Just your study material
                and the tools to master it.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 px-6 text-base",
                  )}
                  href="/courses"
                >
                  <BookOpen aria-hidden="true" />
                  Create your first course
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 px-6 text-base",
                  )}
                  href="/dashboard"
                >
                  Go to dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/20 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <NotebookPen aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">NoNotes</span>
            <span className="text-xs text-muted-foreground">
              — Study with intention
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link
              className="transition-colors hover:text-foreground"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/courses"
            >
              Courses
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/study"
            >
              Study
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/settings"
            >
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}