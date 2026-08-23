import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionPlaceholder({
  eyebrow,
  title,
  description,
  icon: Icon,
  nextStage,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  nextStage: string;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl border border-border/80 bg-card/60 p-8 text-center shadow-[0_24px_70px_-48px_rgba(0,0,0,0.9)] sm:p-12">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <p className="mt-6 text-xs font-medium tracking-[0.18em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-8 border-t border-border/70 pt-5 text-left">
          <p className="text-xs font-medium text-foreground">Next vertical slice</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextStage}</p>
        </div>
        <Link
          className={cn(buttonVariants({ variant: "ghost" }), "mt-8")}
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
