"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { DbInitializer } from "@/components/db-initializer";
import { AppShell } from "@/components/layout/app-shell";
import { fadeUp, SHORT } from "@/lib/motion";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <DbInitializer />
      <AppShell>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={SHORT}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </>
  );
}