"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isNavigationItemActive,
  navigationItems,
  secondaryNavigationItems,
} from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90",
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 transition-colors duration-150",
          active ? "text-primary" : "text-current/50 group-hover:text-current/70",
        )}
      />
      <span>{label}</span>
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1">
      <div className="space-y-0.5">
        <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/60 uppercase">
          Workspace
        </p>
        {navigationItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={isNavigationItemActive(pathname, item.href)}
          />
        ))}
      </div>

      <div className="mt-auto space-y-0.5 pt-8">
        <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/60 uppercase">
          System
        </p>
        {secondaryNavigationItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={isNavigationItemActive(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
