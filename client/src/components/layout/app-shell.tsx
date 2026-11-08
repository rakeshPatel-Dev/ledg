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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 focus:outline-none"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
