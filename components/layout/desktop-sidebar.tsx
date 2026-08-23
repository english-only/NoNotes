import { NotebookPen } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <NotebookPen aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">
              NoNotes
            </p>
            <p className="text-xs text-muted-foreground">Recall, not reread.</p>
          </div>
        </div>

        <Separator className="my-6" />
        <SidebarNav />

        <div className="mt-6 rounded-xl border border-sidebar-border bg-background/30 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/70" />
            Local-first workspace
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Your study data stays on this device by default.
          </p>
        </div>
      </div>
    </aside>
  );
}
