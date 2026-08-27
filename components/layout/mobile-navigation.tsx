"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, NotebookPen } from "lucide-react";

import {
  isNavigationItemActive,
  navigationItems,
  secondaryNavigationItems,
} from "@/components/layout/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button
            aria-label="Open navigation"
            className="lg:hidden"
            size="icon"
            variant="ghost"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        className="w-[min(19rem,calc(100vw-2rem))] border-sidebar-border bg-sidebar p-0"
        side="left"
      >
        {/* Logo header */}
        <SheetHeader className="border-b border-sidebar-border/50 px-5 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <NotebookPen aria-hidden="true" className="size-4" />
            </div>
            <div>
              <SheetTitle className="font-heading text-sm font-semibold">
                NoNotes
              </SheetTitle>
              <SheetDescription className="text-xs">
                Recall, not reread.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Navigation links */}
        <nav aria-label="Mobile navigation" className="flex flex-col gap-0.5 p-4">
          <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/60 uppercase">
            Workspace
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isNavigationItemActive(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon aria-hidden="true" className={cn("size-4 transition-colors", active ? "text-primary" : "text-current/50")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-3 h-px bg-sidebar-border/50" />
          <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/60 uppercase">
            System
          </p>
          {secondaryNavigationItems.map((item) => {
            const Icon = item.icon;
            const active = isNavigationItemActive(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon aria-hidden="true" className={cn("size-4 transition-colors", active ? "text-primary" : "text-current/50")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
