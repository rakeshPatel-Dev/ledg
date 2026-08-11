import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Toaster } from "sonner";

import { initApi } from "@/lib/api";
import { TransactionFormProvider } from "@/lib/transaction-form";

function ApiBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      initApi(() => getToken());
    }
  }, [isLoaded, isSignedIn, getToken]);

  return children;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
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
  );
}
