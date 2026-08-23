"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
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
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4", active ? "text-primary" : "text-current/70")}
      />
      <span>{label}</span>
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1">
      <div className="space-y-1">
        <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/70 uppercase">
          Workspace
        </p>
        {navigationItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </div>

      <div className="mt-auto space-y-1 pt-8">
        <p className="px-3 pb-2 text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground/70 uppercase">
          System
        </p>
        {secondaryNavigationItems.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </div>
    </nav>
  );
}
