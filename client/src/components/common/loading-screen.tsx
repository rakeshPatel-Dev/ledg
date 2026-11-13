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

const SETTLE = {
  duration: 0.7,
  ease: [0.16, 1, 0.3, 1] as const,
};

const RISE = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
};

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
      className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-8 text-center"
    >
      <span className="sr-only">Loading Ledg…</span>

      <div className="relative flex flex-col items-center gap-7">
        {/* Logo — green gradient tile with depth */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, y: 14, scale: 0.94, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            ...SETTLE,
            opacity: { duration: 0.35, ease: "easeOut" },
            filter: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.7, ease: [0.34, 1.4, 0.64, 1] },
          }}
          className="relative"
        >
          {/* Contact shadow — dark, sits under the tile */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 -bottom-2 h-4 rounded-full bg-[radial-gradient(closest-side,oklch(0_0_0/0.28),transparent)] blur-md dark:bg-[radial-gradient(closest-side,oklch(0_0_0/0.55),transparent)]"
          />

          <div className="relative overflow-hidden rounded-4xl border border-white/15 bg-linear-to-br from-primary via-primary to-[oklch(0.44_0.14_158)] shadow-[inset_0_1px_0_oklch(1_0_0/0.25),inset_0_-1px_0_oklch(0_0_0/0.08)] dark:border-white/10 dark:from-[oklch(0.30_0.075_158)] dark:via-[oklch(0.26_0.065_158)] dark:to-[oklch(0.22_0.055_158)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.12),inset_0_-1px_0_oklch(0_0_0/0.3)]">
            {/* Top light-catch */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20"
            />
            {/* Corner bloom — subtle highlight from top-right */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,oklch(1_0_0/0.18)_0%,transparent_55%)] dark:bg-[radial-gradient(120%_120%_at_100%_0%,oklch(1_0_0/0.08)_0%,transparent_55%)]"
            />
            <AppLogo className="relative size-16 bg-transparent" imgClassName="size-9" />
          </div>
        </motion.div>

        {/* Tip block */}
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="flex max-w-[21rem] flex-col items-center gap-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.5)] dark:border-border/40 dark:bg-muted/30 dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
            <Lightbulb className="size-3" />
            Tip
          </span>

          <div className="relative flex h-14 w-full items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={RISE}
                className="text-pretty text-sm font-medium leading-relaxed tracking-tight text-foreground"
              >
                {TIPS[index]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Progress — quiet, tip-synced */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="relative flex items-center justify-center"
      >
        <div className="relative h-0.5 w-40 overflow-hidden rounded-full bg-muted/60 shadow-[inset_0_1px_1px_oklch(0_0_0/0.06)] dark:bg-muted/30 dark:shadow-[inset_0_1px_1px_oklch(0_0_0/0.4)]">
          <motion.span
            key={index}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: TIP_INTERVAL_MS / 1000, ease: "linear" }}
            className="absolute inset-0 rounded-full bg-primary/70"
          />
        </div>
      </motion.div>
    </div>
  );
}
