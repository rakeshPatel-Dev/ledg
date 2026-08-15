import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";

import { initApi } from "@/lib/api";
import { TransactionFormProvider } from "@/lib/transaction-form";
import { MotionProvider, useMotion } from "@/lib/animation-provider";

function ApiBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      initApi(() => getToken());
    }
  }, [isLoaded, isSignedIn, getToken]);

  return children;
}

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
          <ApiBridge>
            <TransactionFormProvider>{children}</TransactionFormProvider>
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  borderRadius: "1rem",
                  fontWeight: 500,
                },
              }}
            />
          </ApiBridge>
        </MotionBridge>
      </MotionProvider>
    </ThemeProvider>
  );
}
