import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { AnnouncementBanner } from "@/components/announcement/announcement-banner";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-full max-w-md">
      <main className="px-5 pb-28 pt-6">
        <AnnouncementBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
