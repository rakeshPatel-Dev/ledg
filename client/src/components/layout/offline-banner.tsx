import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Global connection banner. Shown by the app shell so every signed-in screen
 * makes it clear that data may be stale and writes will not reach the server.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence initial={false}>
      {!isOnline ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="sticky top-0 z-50 overflow-hidden"
        >
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 border-b border-amber-500/25 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-900 backdrop-blur-md dark:text-amber-100"
          >
            <WifiOff className="size-4 shrink-0" />
            <span>
              You&apos;re offline. Showing the last loaded data; changes
              won&apos;t save until you reconnect.
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
