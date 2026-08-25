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

  // Due today: flashcards whose dueAt <= now
  const dueToday = await db.flashcards
    .where("dueAt")
    .belowOrEqual(now)
    .count();

  // Active courses
  const activeCourses = await db.courses.count();

  // Total cards
  const totalCards = await db.flashcards.count();

  // Study time this week: sum of elapsedMs from recent reviewLogs
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
      tone: "text-emerald-300",
    },
    {
      label: "Active courses",
      value: data?.activeCourses ?? 0,
      detail:
        data && data.activeCourses > 0
          ? `${data.activeCourses} ${data.activeCourses === 1 ? "course" : "courses"} with material`
          : "Create a course to organize your material.",
      icon: BookOpen,
      tone: "text-cyan-300",
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
      tone: "text-violet-300",
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
            className="border border-border/80 bg-card/70 p-5 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.8)]"
            key={index}
          >
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-8 w-12 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
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
              className="border border-border/80 bg-card/70 p-5 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Icon aria-hidden="true" className={cn("size-4", item.tone)} />
              </div>
              <p className="mt-5 font-heading text-3xl font-semibold tracking-tight">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="border border-border/80 bg-card/60 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Your study loop
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
                Turn raw material into recall.
              </h2>
            </div>
            <Sparkles aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div className="mt-8 grid gap-0 sm:grid-cols-4">
            {[
              ["01", "Ingest", "Bring in a PDF, note, or link."],
              ["02", "Generate", "Create structured practice."],
              ["03", "Recall", "Work from memory first."],
              ["04", "Retain", "Review at the right time."],
            ].map(([number, title, detail], index) => (
              <div
                className="relative border-l border-border/80 py-1 pl-4 sm:border-l-0 sm:border-t sm:pb-0 sm:pl-0 sm:pt-5"
                key={number}
              >
                <div className="absolute top-0 bottom-0 left-[-1px] hidden w-px bg-gradient-to-b from-primary/70 to-transparent sm:block" />
                {index > 0 && (
                  <div className="absolute top-[-1px] left-0 hidden h-px w-4 bg-primary/50 sm:block" />
                )}
                <p className="text-xs font-medium text-primary">{number}</p>
                <p className="mt-2 text-sm font-medium">{title}</p>
                <p className="mt-1 max-w-[13rem] text-xs leading-relaxed text-muted-foreground">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between border border-primary/20 bg-primary/[0.06] p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
              Start here
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
              Set up your first course.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
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
