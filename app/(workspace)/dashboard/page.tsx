import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardStats } from "@/app/(workspace)/dashboard/_components/dashboard-stats";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Today&apos;s workspace
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Build retention, one review at a time.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            NoNotes turns your study material into active-recall practice. Start
            with a course, then let the review loop do the remembering.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            href="/courses"
          >
            <Plus aria-hidden="true" />
            Add material
          </Link>
          <Link
            className={cn(buttonVariants({ size: "lg" }))}
            href="/study"
          >
            Start studying
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <DashboardStats />
    </div>
  );
}
