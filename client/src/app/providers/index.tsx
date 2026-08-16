import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";

import { TransactionFormProvider } from "@/lib/transaction-form";
import { MotionProvider, useMotion } from "@/lib/animation-provider";

import { ThemeProvider } from "@/lib/theme-provider";

function MotionBridge({ children }: { children: ReactNode }) {
  const { motion } = useMotion();
  const reducedMotion = motion === "full" ? "never" : motion === "system" ? "user" : "always";

  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <MotionProvider defaultMotion="full">
        <MotionBridge>
          <TransactionFormProvider>{children}</TransactionFormProvider>
          <Toaster
            position="bottom-center"
            offset={{ bottom: 96 }}
            toastOptions={{
              style: {
                borderRadius: "1rem",
                fontWeight: 500,
              },
            }}
          />
        </MotionBridge>
      </MotionProvider>
    </ThemeProvider>
  );
}