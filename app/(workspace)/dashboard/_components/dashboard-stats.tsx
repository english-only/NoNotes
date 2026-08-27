"use client";

import { useCallback, useEffect, startTransition, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { staggerList, SHORT } from "@/lib/motion";
import { db } from "@/lib/db/client";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "loading" | "ready" | "error";

type DashboardData = {
  dueToday: number;
  activeCourses: number;
  totalCards: number;
  studyMinutesThisWeek: number;
};

async function fetchDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const dueToday = await db.flashcards
    .where("dueAt")
    .belowOrEqual(now)
    .count();

  const activeCourses = await db.courses.count();
  const totalCards = await db.flashcards.count();

  const recentLogs = await db.reviewLogs
    .where("reviewedAt")
    .above(oneWeekAgo)
    .toArray();
  const studyMinutesThisWeek = Math.round(
    recentLogs.reduce((sum, log) => sum + log.elapsedMs, 0) / 60_000
  );

  return { dueToday, activeCourses, totalCards, studyMinutesThisWeek };
}

export function DashboardStats() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchDashboardData();
      setData(result);
      setError(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard data."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    startTransition(async () => {
      await fetchData();
    });
  }, [fetchData]);

  const overview = [
    {
      label: "Due today",
      value: data?.dueToday ?? 0,
      detail:
        data && data.dueToday > 0
          ? `${data.dueToday} ${data.dueToday === 1 ? "card" : "cards"} ready for review`
          : "Your review queue is clear.",
      icon: CheckCircle2,
      tone: "text-success",
      bgTone: "bg-success/10",
      borderTone: "border-success/20",
    },
    {
      label: "Active courses",
      value: data?.activeCourses ?? 0,
      detail:
        data && data.activeCourses > 0
          ? `${data.activeCourses} ${data.activeCourses === 1 ? "course" : "courses"} with material`
          : "Create a course to organize your material.",
      icon: BookOpen,
      tone: "text-info",
      bgTone: "bg-info/10",
      borderTone: "border-info/20",
    },
    {
      label: "Study time",
      value:
        data && data.studyMinutesThisWeek > 0
          ? `${data.studyMinutesThisWeek}m`
          : "—",
      detail:
        data && data.studyMinutesThisWeek > 0
          ? "This week"
          : "Your first session will appear here.",
      icon: Clock3,
      tone: "text-primary",
      bgTone: "bg-primary/10",
      borderTone: "border-primary/20",
    },
  ];

  if (status === "loading") {
    return (
      <section
        aria-label="Study overview"
        className="grid gap-3 md:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="rounded-xl border border-border/60 bg-card/50 p-5"
            key={index}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-5 h-8 w-12" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </section>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <>
      <section
        aria-label="Study overview"
        className="grid gap-3 md:grid-cols-3"
      >
        {overview.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              variants={staggerList()}
              custom={i}
              initial="hidden"
              animate="visible"
              transition={SHORT}
            >
              <div
                className={cn(
                  "rounded-xl border bg-card/50 p-5 transition-all duration-150 hover:bg-card/70",
                  item.borderTone
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className={cn("flex size-7 items-center justify-center rounded-lg", item.bgTone)}>
                    <Icon aria-hidden="true" className={cn("size-3.5", item.tone)} />
                  </div>
                </div>
                <p className="mt-4 font-heading text-3xl font-semibold tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground/70">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Study loop card */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-6 transition-colors hover:bg-card/60 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground/60 uppercase">
                Your study loop
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                Turn raw material into recall.
              </h2>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles aria-hidden="true" className="size-4" />
            </div>
          </div>
          <div className="mt-8 grid gap-0 sm:grid-cols-4">
            {[
              ["01", "Ingest", "Bring in a PDF, note, or link."],
              ["02", "Generate", "Create structured practice."],
              ["03", "Recall", "Work from memory first."],
              ["04", "Retain", "Review at the right time."],
            ].map(([number, title, detail], index) => (
              <div
                className="relative border-l border-border/60 py-1 pl-4 sm:border-l-0 sm:border-t sm:pb-0 sm:pl-0 sm:pt-5"
                key={number}
              >
                <div className="absolute top-0 bottom-0 left-[-1px] hidden w-px bg-gradient-to-b from-primary/60 to-transparent sm:block" />
                {index > 0 && (
                  <div className="absolute top-[-1px] left-0 hidden h-px w-4 bg-primary/40 sm:block" />
                )}
                <p className="text-xs font-medium text-primary/80">{number}</p>
                <p className="mt-2 text-sm font-medium">{title}</p>
                <p className="mt-1 max-w-[13rem] text-xs leading-relaxed text-muted-foreground/70">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA card */}
        <div className="flex flex-col justify-between rounded-xl border border-primary/15 bg-primary/[0.04] p-6 transition-colors hover:bg-primary/[0.06] sm:p-8">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-primary/80 uppercase">
              Start here
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
              Set up your first course.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground/70">
              Keep subjects separate so your cards stay focused and your progress
              stays meaningful.
            </p>
          </div>
          <Link
            className={cn(buttonVariants({ variant: "secondary" }), "mt-8 w-full")}
            href="/courses"
          >
            <BookOpen aria-hidden="true" />
            Explore courses
          </Link>
        </div>
      </section>
    </>
  );
}
