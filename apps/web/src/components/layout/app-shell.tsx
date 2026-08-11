import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-full max-w-md">
      <main className="px-5 pb-40 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
