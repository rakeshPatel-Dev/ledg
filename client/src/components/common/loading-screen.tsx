import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

import AppLogo from "@/components/common/app-logo";

const TIPS = [
  "Log a transaction in under five seconds.",
  "Swipe a transaction to edit or delete it.",
  "Set a monthly budget on any space.",
  "Dues track who owes whom, separate from spending.",
  "Tap a category in Insights to drill into it.",
  "Press + to add a transaction from anywhere.",
  "Filter Activity by space with one tap.",
  "Shared spaces stay in sync for everyone.",
  "Export everything as CSV from Activity.",
  "Loans never count as income or spending.",
];

const TIP_INTERVAL_MS = 3600;

export function LoadingScreen() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % TIPS.length);
    }, TIP_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <span className="sr-only">Loading Ledg…</span>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        <AppLogo className="size-14 rounded-3xl shadow-elev-card" imgClassName="size-9" />

        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <Lightbulb className="size-3" />
            Tip
          </span>

          <div className="flex h-12 max-w-[19rem] items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="text-shimmer text-sm font-medium leading-relaxed tracking-tight"
              >
                {TIPS[index]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
