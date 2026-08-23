import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  BookOpen,
  Brain,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Study", href: "/study", icon: Brain },
  { label: "Feynman", href: "/feynman", icon: MessageSquare },
  { label: "Analytics", href: "/analytics", icon: BarChart },
];

export const secondaryNavigationItems: NavigationItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
