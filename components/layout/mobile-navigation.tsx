"use client";

import Link from "next/link";
import { Menu, NotebookPen } from "lucide-react";

import {
  navigationItems,
  secondaryNavigationItems,
} from "@/components/layout/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  return (
    <Sheet>
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
        <SheetHeader className="border-b border-sidebar-border px-5 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <NotebookPen aria-hidden="true" className="size-4" />
            </div>
            <div>
              <SheetTitle>NoNotes</SheetTitle>
              <SheetDescription>Recall, not reread.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-4">
          <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/70 uppercase">
            Workspace
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <SheetClose
                key={item.href}
                render={
                  <Link
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    )}
                    href={item.href}
                  />
                }
              >
                <Icon aria-hidden="true" className="size-4 text-primary" />
                <span>{item.label}</span>
              </SheetClose>
            );
          })}

          <div className="my-4 h-px bg-sidebar-border" />
          <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/70 uppercase">
            System
          </p>
          {secondaryNavigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <SheetClose
                key={item.href}
                render={
                  <Link
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    href={item.href}
                  />
                }
              >
                <Icon aria-hidden="true" className="size-4 text-primary" />
                <span>{item.label}</span>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
