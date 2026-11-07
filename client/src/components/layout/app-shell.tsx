import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/layout/offline-banner";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-full max-w-md">
      <OfflineBanner />
      <main className="px-5 pb-28 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
