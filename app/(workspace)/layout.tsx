import type { ReactNode } from "react";

import { DbInitializer } from "@/components/db-initializer";
import { AppShell } from "@/components/layout/app-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DbInitializer />
      <AppShell>{children}</AppShell>
    </>
  );
}
