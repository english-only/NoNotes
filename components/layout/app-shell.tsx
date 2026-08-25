"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CommandPalette } from "@/components/search/command-palette";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Separator } from "@/components/ui/separator";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/courses": "Courses",
  "/study": "Study",
  "/feynman": "Feynman",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function resolvePageTitle(pathname: string): string {
  // Exact match first
  if (routeLabels[pathname]) return routeLabels[pathname];
  // Prefix match for nested routes (e.g., /courses/abc → "Courses")
  for (const [prefix, label] of Object.entries(routeLabels)) {
    if (pathname.startsWith(`${prefix}/`)) return label;
  }
  return "NoNotes";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = resolvePageTitle(pathname);
  return (
    <div className="app-backdrop flex min-h-screen bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:ring-2 focus:ring-ring"
        href="#main-content"
      >
        Skip to main content
      </a>
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <MobileNavigation />
            <Separator className="hidden h-5 sm:block" orientation="vertical" />
            <p className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Study workspace / </span>
              <span className="text-foreground">{pageTitle}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <CommandPalette />
          </div>
        </header>
        <main className="min-w-0 flex-1" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
