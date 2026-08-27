import { NotebookPen } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-5">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:border-primary/30">
            <NotebookPen aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">
              NoNotes
            </p>
            <p className="text-xs text-muted-foreground/70">
              Recall, not reread.
            </p>
          </div>
        </div>

        <Separator className="my-5 opacity-50" />

        {/* Navigation */}
        <SidebarNav />

        {/* Footer badge */}
        <div className="mt-auto rounded-xl border border-sidebar-border/60 bg-background/20 p-3 transition-colors hover:bg-background/30">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/80">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" />
            Local-first workspace
          </div>
          <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted-foreground/60">
            Your study data stays on this device.
          </p>
        </div>
      </div>
    </aside>
  );
}
