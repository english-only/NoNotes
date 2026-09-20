"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileInput,
  Layers,
  NotebookPen,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fadeUp, MEDIUM, SHORT, motionForPreference } from "@/lib/motion";
import { ProductPreview } from "@/components/landing/product-preview";

const NAV_LINKS = [
  { label: "Learn the loop", href: "#loop" },
  { label: "AI cards", href: "#ai" },
  { label: "Feynman", href: "#feynman" },
  { label: "Privacy", href: "#privacy" },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(className)}
      transition={motionForPreference({ delay, ...SHORT })}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  overline,
  title,
  description,
}: {
  overline: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal>
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          {overline}
        </p>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.1}>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-shadow",
          scrolled
            ? "border-border/60 bg-background/85 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            : "border-transparent bg-background/60 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="flex items-center gap-3" href="#top">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <NotebookPen aria-hidden="true" className="size-4 text-primary" />
            </div>
            <span className="font-heading text-base font-semibold tracking-tight">
              NoNotes
            </span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex"
              )}
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href="/courses"
            >
              Open app
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="app-backdrop" id="top">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            variants={fadeUp}
            transition={motionForPreference({ ...MEDIUM, delay: 0.1 })}
            initial="hidden"
            animate="visible"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.04] px-4 py-1.5">
              <Shield aria-hidden="true" className="size-3.5 text-primary/80" />
              <span className="text-xs font-medium text-primary/80">
                Local-first · No account · Works offline
              </span>
            </div>
            <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Study with{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent-foreground bg-clip-text text-transparent">
                intention
              </span>
              <br className="hidden sm:block" /> not repetition.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Turn your notes, PDFs, and web pages into source-grounded
              flashcards, review them on an optimal schedule, and check your own
              understanding — right in your browser.
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
          </motion.div>

          {/* Product visual */}
          <motion.div
            className="mt-16 sm:mt-20"
            variants={fadeUp}
            transition={motionForPreference({ ...MEDIUM, delay: 0.25 })}
            initial="hidden"
            animate="visible"
          >
            <ProductPreview />
          </motion.div>
        </section>

        {/* ── Core Loop (narrative) ────────────────────────────────── */}
        <section className="border-t border-border/30 bg-card/20" id="loop">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <SectionHeading
              overline="How it works"
              title="From material to mastery."
              description="A single, honest loop backed by cognitive science — ingest, generate, recall, and retain."
            />

            <div className="relative mt-16">
              {/* Connector line (desktop) */}
              <div
                aria-hidden="true"
                className="absolute top-7 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
              />
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    step: "01",
                    title: "Ingest",
                    detail:
                      "Drop in PDFs, paste notes, or link web pages. Content is chunked and stored locally.",
                    icon: Layers,
                  },
                  {
                    step: "02",
                    title: "Generate",
                    detail:
                      "AI builds flashcards from your chunks. Review, edit, and accept only what you need.",
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
                      "Smart scheduling surfaces each card right before you would forget it.",
                    icon: BookOpen,
                  },
                ].map(({ step, title, detail, icon: Icon }, i) => (
                  <motion.li
                    className="relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-6"
                    key={step}
                    transition={motionForPreference({ delay: i * 0.08, ...SHORT })}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                  >
                    <div className="relative z-10 flex size-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium tabular-nums text-primary">
                        {step}
                      </span>
                      <h3 className="mt-1 font-heading text-lg font-semibold">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {detail}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Source-grounded AI (editorial, asymmetric) ───────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28" id="ai">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-2xl">
              <Reveal>
                <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                  Source-grounded AI
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Cards that come from your material — not a model&apos;s imagination.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  NoNotes sends your chosen source chunks to the AI provider you
                  configure and grounds every question and answer in them. You
                  keep full control: review, edit, reject, or accept each card
                  before anything is saved.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <ul className="mt-8 flex flex-col gap-3">
                  {[
                    "Every card is anchored to a specific source chunk",
                    "Preview cards before they are persisted",
                    "Provenance is preserved through edit, reject, and accept",
                  ].map((item) => (
                    <li className="flex items-start gap-2 text-sm text-foreground/90" key={item}>
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-success"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            {/* Source → chunks → card mockup */}
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  From source to accepted card
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Source · Lecture 4 – Photosynthesis
                    </p>
                    <p className="mt-1 text-xs text-foreground/80 line-clamp-2">
                      Chlorophyll absorbs light energy primarily in the red and
                      blue wavelengths...
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Chunk 1", "Chunk 2", "Chunk 3"].map((c) => (
                      <div
                        className="flex items-center justify-center rounded-md border border-border/40 bg-card px-2 py-1.5 text-[10px] text-muted-foreground"
                        key={c}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground/50">
                    <Sparkles aria-hidden="true" className="size-4" />
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-foreground">
                      Generated card
                    </p>
                    <p className="mt-1 text-xs leading-5 text-foreground/85">
                      What role does chlorophyll play in photosynthesis?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                        Reject
                      </span>
                      <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] text-success">
                        Accept
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Feature grid: search + portability ───────────────────── */}
        <section className="border-t border-border/30 bg-card/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <SectionHeading
              overline="Stay organized"
              title="Find it. Take it with you."
            />
            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Full-text search",
                  detail:
                    "Find any course, deck, card, or source instantly. Press Cmd+K anywhere in the app.",
                  icon: Search,
                },
                {
                  title: "Import & export",
                  detail:
                    "Everything exports to a single JSON file. Move to a fresh browser whenever you want.",
                  icon: Upload,
                },
                {
                  title: "Smart scheduling",
                  detail:
                    "The same algorithm family behind modern SRS apps reviews each card at the right moment.",
                  icon: RefreshCw,
                },
                {
                  title: "PDF & web ingestion",
                  detail:
                    "Paste text, upload PDFs, or extract clean content from URLs — all processed locally.",
                  icon: FileInput,
                },
                {
                  title: "Local-first architecture",
                  detail:
                    "Study data lives in your browser. No mandatory account, no hidden uploads.",
                  icon: Shield,
                },
                {
                  title: "Your provider, your key",
                  detail:
                    "Bring Gemini free-tier keys or any OpenAI-compatible endpoint — including fully local Ollama.",
                  icon: Brain,
                },
              ].map(({ title, detail, icon: Icon }, i) => (
                <motion.div
                  className="rounded-xl border border-border/60 bg-card/40 p-6"
                  key={title}
                  transition={motionForPreference({ delay: i * 0.06, ...SHORT })}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary/80">
                    <Icon aria-hidden="true" className="size-4" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-semibold">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feynman showcase ─────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28" id="feynman">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="order-2 lg:order-1">
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Feynman technique
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">You explained</p>
                    <p className="mt-1 text-xs text-foreground/85">
                      &ldquo;Plants use sunlight to make food.&rdquo;
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-foreground">
                      Feedback
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
                        Correctness 80%
                      </span>
                      <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                        Missing: chlorophyll
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-foreground/80">
                      Good grasp of the outcome. Mention how chlorophyll captures
                      the specific wavelengths that drive the light reactions.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="order-1 max-w-2xl lg:order-2">
              <Reveal>
                <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                  Feynman evaluation
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  The best test of understanding is explaining it simply.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Pick a concept, explain it in your own words, and get structured
                  feedback grounded in your source material — clear scores,
                  misconceptions, and concrete corrections.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Privacy ──────────────────────────────────────────────── */}
        <section className="border-t border-border/30" id="privacy">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Shield aria-hidden="true" className="size-5" />
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Your study data stays yours.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                  NoNotes is local-first: courses, decks, cards, and review
                  history persist in your browser and work offline. There&apos;s no
                  account and no server-side copy.
                </p>
              </Reveal>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Local storage",
                  detail:
                    "Study data lives in your browser. Export a JSON file at any time and take it anywhere.",
                },
                {
                  title: "Your AI provider, your call",
                  detail:
                    "AI features send the source material you select to the provider you configure. Choose a free key, or point NoNotes at local Ollama — the request never touches NoNotes servers.",
                },
                {
                  title: "Keys stay yours",
                  detail:
                    "API keys are stored in your browser, masked in Settings, and never included in exports.",
                },
                {
                  title: "Offline-ready",
                  detail:
                    "The entire study loop — reveal, rate, schedule — works without a connection.",
                },
              ].map(({ title, detail }, i) => (
                <Reveal
                  className="rounded-xl border border-border/60 bg-card/40 p-6 text-left"
                  delay={i * 0.06}
                  key={title}
                >
                  <h3 className="font-heading text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {detail}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="border-t border-border/30 bg-card/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <motion.div
              className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/[0.04] p-8 text-center sm:p-12"
              variants={fadeUp}
              transition={motionForPreference(SHORT)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              <h2 className="font-heading text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Your material remembers you.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-7 text-muted-foreground">
                No accounts, no lock-in. Add your first course and turn it into
                something you actually retain.
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
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
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